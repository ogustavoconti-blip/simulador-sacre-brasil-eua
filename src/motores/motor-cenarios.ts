// Simulação completa de uma estratégia, estratégias comparadas, otimizador e decomposição.
import { anoDe, dia, fimAno, inicioAno, iso, meioDoAno, type Dia } from './calendario';
import { criaInstrumento, fracaoEm, geraFluxos, type EventoFluxo, type Instrumento, type ResgateProgramado } from './fluxos';
import type { Mercado } from './mercado';
import { aliquotaEvento, eventosBrasil, regraProduto, type EventoBR } from './motor-brasil';
import { calculaCredito, type ResultadoCredito } from './motor-credito';
import { impostoEstadual, type SeloEstado } from './motor-estados';
import { federalAno, niit, reconhecimentoEUA, type FederalAno } from './motor-eua-federal';
import { combinacoes, Resolvedor } from './parametros';
import type { Alerta, Memoria, Parametros, Pendente, Posicao, Regime, Simulacao } from './tipos';

export type Cronograma = Record<string, ResgateProgramado[]>;

export interface Contexto {
  sim: Simulacao;
  params: Parametros;
  mercado: Mercado;
  regime: Regime;
  escolhas: Record<string, string>;
}

export interface AnoResultado {
  ano: number;
  juros_usd: number;
  cambio_usd: number;
  ir_brasil_usd: number; // IR + IOF retidos no Brasil
  iof_brasil_usd: number; // IOF: entra na carga, mas não gera crédito
  ir_brasil_brl: number;
  federal: FederalAno; // com os investimentos do Brasil
  federal_sem_brasil: FederalAno;
  modo_credito: 'credito' | 'deducao';
  credito_usado: number;
  credito_usado_sem_brasil: number;
  federal_antes_credito_incremental: number;
  federal_liquido_incremental: number;
  niit_incremental: number;
  magi: number;
  estadual: number;
}

export interface ResultadoPosicao {
  id: string;
  produto: Posicao['produto'];
  juros_usd: number;
  ir_brasil_usd: number;
  credito_atribuido_usd: number;
  impostos_eua_usd: number; // federal antes do crédito + NIIT + estadual, rateados
  carga: number | null;
}

export interface ResultadoEstrategia {
  id: string;
  rotulo: string;
  regime: Regime;
  escolhas: Record<string, string>;
  cronograma: Cronograma;
  anos: AnoResultado[];
  eventos_brasil: EventoBR[];
  credito: ResultadoCredito;
  credito_sem_brasil: ResultadoCredito;
  estado: { modo: 'A' | 'B'; selo: SeloEstado };
  totais: {
    juros_usd: number;
    cambio_usd: number;
    ir_brasil_usd: number; // inclui IOF
    federal_antes_credito_usd: number;
    credito_incremental_usd: number;
    federal_liquido_usd: number;
    niit_usd: number;
    estadual_usd: number;
    retificacao_ano_anterior_usd: number;
  };
  resumo_credito: { imposto_estrangeiro: number; proprio: number; ano_anterior: number; seguintes: number; saldo: number; expirado: number; deduzido: number };
  anos_deducao: number[]; // anos em que deduzir o imposto estrangeiro rendeu mais que creditar
  patrimonio_inicial_usd: number;
  patrimonio_final_usd: number;
  patrimonio_final_brl: number;
  patrimonio_por_ano: { ano: number; usd: number; brl: number }[];
  carga_efetiva: number | null;
  por_posicao: ResultadoPosicao[];
  liquidez_ok: boolean;
  alertas: Alerta[];
  memoria: Record<string, Memoria>;
  pendencias: Pendente<unknown>[]; // regras pendentes usadas nesta simulação
}

const soma = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

export function janela(sim: Simulacao, m: Mercado) {
  const anoIni = anoDe(m.hoje);
  const anoFim = anoIni + sim.cenario.horizonte_anos - 1;
  return { anoIni, anoFim, S: inicioAno(anoIni), L: fimAno(anoFim) };
}

/** Cronograma do plano informado pelo usuário. "Deixar o simulador sugerir" = manter até o vencimento. */
export function cronogramaDoPlano(sim: Simulacao): Cronograma {
  const out: Cronograma = {};
  for (const p of sim.posicoes) {
    if (p.plano.tipo === 'total') out[p.id] = [{ d: dia(p.plano.data), fracao: 1 }];
    else if (p.plano.tipo === 'parcial') out[p.id] = p.plano.resgates.map((r) => ({ d: dia(r.data), fracao: r.fracao }));
    else out[p.id] = [];
  }
  return out;
}

/* ---------- simulação de uma estratégia ---------- */
export function simula(ctx: Contexto, crono: Cronograma, id = 'atual', rotulo = 'Seu plano'): ResultadoEstrategia {
  const { sim, params, mercado: m, regime } = ctx;
  const r = new Resolvedor(ctx.escolhas);
  const flags = new Set<string>();
  const alertas: Alerta[] = [];
  const { anoIni, anoFim, S, L } = janela(sim, m);
  const anos = Array.from({ length: anoFim - anoIni + 1 }, (_, i) => anoIni + i);
  const perfil = sim.perfil;
  const av = perfil.avancado ?? {};
  const curtoPrazoMeses = r.valor(params.eua.curto_prazo_meses, 'eua.curto_prazo_meses');

  type Item = { pos: Posicao; inst: Instrumento; fluxos: EventoFluxo[]; br: EventoBR[]; us: ReturnType<typeof reconhecimentoEUA> };
  const itens: Item[] = [];
  let antigas = 0;
  let vencidas = 0;
  let semEmissao = 0;
  for (const pos of sim.posicoes) {
    let taxaCupom: number | null = null;
    if (pos.produto === 'tesouro_pre_cupom' || pos.produto === 'tesouro_ipca_cupom') {
      taxaCupom = r.valor(params.brasil.cupons.taxa_cupom_tesouro[pos.produto], `brasil.cupons.taxa_cupom_tesouro.${pos.produto}`);
    }
    const inst = criaInstrumento(pos, m, { curtoPrazoMeses, taxaCupom });
    if (inst.T < S) {
      vencidas++;
      continue;
    }
    if (inst.c < S) antigas++;
    if (inst.emissaoAproximada) semEmissao++;
    const resgates = (crono[pos.id] ?? []).filter((x) => x.d >= m.hoje);
    const fluxos = geraFluxos(inst, resgates, L);
    const br = eventosBrasil(inst, fluxos, regime, params.brasil, r, m, flags).filter((e) => e.data >= S);
    const us = reconhecimentoEUA(inst, fluxos, m);
    itens.push({ pos, inst, fluxos, br, us });
  }

  /* ---------- federal, crédito, NIIT e estadual, ano a ano ---------- */
  const filing = perfil.filing;
  const faixasBase = r.valor(params.eua.faixas[filing], `eua.faixas.${filing}`);
  const dedBase = av.itemizadas_usd ?? r.valor(params.eua.deducao_padrao[filing], `eua.deducao_padrao.${filing}`);
  const qualificados = av.ganhos_qualificados_usd ?? 0;
  const faixasQ = qualificados > 0 ? r.valor(params.eua.ganho_capital_qualificado?.[filing], `eua.ganho_capital_qualificado.${filing}`) : null;
  if (qualificados > 0) flags.add('ajuste_904b');
  const limiar = r.valor(params.eua.niit.limiar_magi[filing], `eua.niit.limiar_magi.${filing}`);
  const aliqNiit = r.valor(params.eua.niit.aliquota, 'eua.niit.aliquota');
  const niitCambio = r.valor(params.eua.niit.inclui_cambio_988, 'eua.niit.inclui_cambio_988');
  const outrasRendas = av.outras_rendas_passivas_usd ?? 0;
  const outrosImpostos = av.outros_impostos_estrangeiros_usd ?? 0;
  const outrasInv = av.outras_rendas_investimento_usd ?? 0;

  const porAno = anos.map((ano) => {
    let juros = 0;
    let cambio = 0;
    for (const it of itens) {
      const x = it.us.get(ano);
      if (x) {
        juros += x.juros_usd;
        cambio += x.cambio_usd;
      }
    }
    const evs = itens.flatMap((it) => it.br.filter((e) => e.ano === ano));
    const irUsd = soma(evs.map((e) => e.ir_brl / e.cambio)); // imposto de renda: creditável
    const iofUsd = soma(evs.map((e) => e.iof_brl / e.cambio)); // IOF não é imposto de renda: não gera crédito
    const irBrl = soma(evs.map((e) => e.ir_brl + e.iof_brl));
    const fator = sim.cenario.inflacao_eua_faixas ? Math.pow(1 + sim.cenario.inflacao_eua_faixas / 100, ano - params.eua.ano) : 1;
    if (fator === 1 && ano > params.eua.ano) flags.add('faixas_nominais');
    const faixas = fator === 1 ? faixasBase : faixasBase.map((f) => ({ acima_de: f.acima_de * fator, aliquota: f.aliquota }));
    const padrao = dedBase * fator;
    const deducao = Math.max(padrao, av.itemizadas_usd ?? 0);
    const base = { base_tributavel: perfil.renda_tributavel_usd, deducao, outras_rendas_estrangeiras: outrasRendas, qualificados };
    const sem = federalAno({ ...base, juros_brasil_usd: 0, cambio_usd: 0 }, faixas, faixasQ);
    // em ano de dedução, o imposto estrangeiro entra nas itemizadas (Schedule A, linha 6, fora do teto do SALT)
    const com = (modo: 'credito' | 'deducao'): FederalAno => {
      if (modo === 'credito') return federalAno({ ...base, juros_brasil_usd: juros, cambio_usd: cambio }, faixas, faixasQ);
      const nova = Math.max(padrao, (av.itemizadas_usd ?? 0) + irUsd + outrosImpostos);
      return federalAno(
        { ...base, base_tributavel: perfil.renda_tributavel_usd - (nova - deducao), deducao: nova, juros_brasil_usd: juros, cambio_usd: cambio },
        faixas,
        faixasQ,
      );
    };
    const magi = perfil.renda_tributavel_usd + deducao + juros + cambio;
    const magiSem = perfil.renda_tributavel_usd + deducao;
    const nii = Math.max(0, juros + (niitCambio ? cambio : 0)) + outrasInv + qualificados;
    const niiSem = outrasInv + qualificados;
    const niitInc = niit(nii, magi, limiar, aliqNiit) - niit(niiSem, magiSem, limiar, aliqNiit);
    const est = impostoEstadual(perfil.estado, params.estados, perfil.aliquota_estadual_estimada, juros + cambio, r);
    return { ano, juros, cambio, irUsd, iofUsd, irBrl, com, sem, magi, niitInc, est };
  });

  const cb = r.valor(params.eua.credito.carryback_anos, 'eua.credito.carryback_anos');
  const cf = r.valor(params.eua.credito.carryforward_anos, 'eua.credito.carryforward_anos');
  r.valor(params.eua.deducao_imposto_estrangeiro, 'eua.deducao_imposto_estrangeiro');
  const saldos = (av.saldo_credito_existente ?? []).map((s) => ({ ano_origem: s.ano_origem, valor: s.valor_usd }));
  const calcCredito = (anosC: { ano: number; teto: number; imposto: number; modo: 'credito' | 'deducao' }[]) =>
    calculaCredito({ anos: anosC, saldos_iniciais: saldos, teto_livre_ano_anterior: av.teto_livre_ano_anterior_usd ?? 0, carryback: cb, carryforward: cf });

  // crédito ou dedução: começa com crédito em todos os anos e troca, ano a ano, quando a dedução reduz o imposto total
  const avalia = (modos: ('credito' | 'deducao')[]) => {
    const fed = porAno.map((a, i) => a.com(modos[i]));
    const cred = calcCredito(porAno.map((a, i) => ({ ano: a.ano, teto: fed[i].teto, imposto: a.irUsd + outrosImpostos, modo: modos[i] })));
    const liquido = soma(fed.map((f, i) => f.imposto_regular - cred.anos[i].credito_total)) - cred.ano_anterior.recebido;
    return { modos, fed, cred, liquido };
  };
  let escolha = avalia(porAno.map(() => 'credito' as const));
  porAno.forEach((a, i) => {
    if (a.irUsd + outrosImpostos <= 0) return;
    const teste = avalia(escolha.modos.map((x, j) => (j === i ? 'deducao' : x)));
    if (teste.liquido < escolha.liquido - 0.5) escolha = teste;
  });
  const credito = escolha.cred;
  const creditoSem = calcCredito(porAno.map((a) => ({ ano: a.ano, teto: a.sem.teto, imposto: outrosImpostos, modo: 'credito' as const })));
  const anosDeducao = porAno.filter((_, i) => escolha.modos[i] === 'deducao').map((a) => a.ano);

  const anosRes: AnoResultado[] = porAno.map((a, i) => {
    const fed = escolha.fed[i];
    const cu = credito.anos[i].credito_total;
    const cs = creditoSem.anos[i].credito_total;
    const antes = fed.imposto_regular - a.sem.imposto_regular;
    return {
      ano: a.ano,
      juros_usd: a.juros,
      cambio_usd: a.cambio,
      ir_brasil_usd: a.irUsd + a.iofUsd,
      iof_brasil_usd: a.iofUsd,
      ir_brasil_brl: a.irBrl,
      federal: fed,
      federal_sem_brasil: a.sem,
      modo_credito: escolha.modos[i],
      credito_usado: cu,
      credito_usado_sem_brasil: cs,
      federal_antes_credito_incremental: antes,
      federal_liquido_incremental: antes - (cu - cs),
      niit_incremental: a.niitInc,
      magi: a.magi,
      estadual: a.est.valor,
    };
  });
  const retificacao = credito.ano_anterior.recebido - creditoSem.ano_anterior.recebido;

  /* ---------- totais e patrimônio ---------- */
  const eventos = itens.flatMap((it) => it.br).sort((x, y) => x.data - y.data);
  const t = {
    juros_usd: soma(anosRes.map((a) => a.juros_usd)),
    cambio_usd: soma(anosRes.map((a) => a.cambio_usd)),
    ir_brasil_usd: soma(anosRes.map((a) => a.ir_brasil_usd)),
    federal_antes_credito_usd: soma(anosRes.map((a) => a.federal_antes_credito_incremental)),
    credito_incremental_usd: soma(anosRes.map((a) => a.credito_usado - a.credito_usado_sem_brasil)) + retificacao,
    federal_liquido_usd: 0,
    niit_usd: soma(anosRes.map((a) => a.niit_incremental)),
    estadual_usd: soma(anosRes.map((a) => a.estadual)),
    retificacao_ano_anterior_usd: retificacao,
  };
  t.federal_liquido_usd = t.federal_antes_credito_usd - t.credito_incremental_usd;
  const impostosEuaAte = (ano: number) =>
    soma(anosRes.filter((a) => a.ano <= ano).map((a) => a.federal_liquido_incremental + a.niit_incremental + a.estadual)) - retificacao;

  const caixaAte = (d: Dia) => soma(eventos.filter((e) => e.data <= d).map((e) => e.liquido_brl / e.cambio));
  const valorLiquidoEm = (d: Dia) => {
    let usd = 0;
    for (const it of itens) {
      if (it.inst.c > d) continue;
      const fr = fracaoEm(it.fluxos, d);
      if (fr <= 0) continue;
      const v = fr * it.inst.valorEx(d + 1);
      const aliq = aliquotaEvento(it.pos.produto, regime, d + 1 - it.inst.c, params.brasil, r);
      usd += (v - Math.max(0, v - fr * it.inst.P) * aliq) / m.cambio(d);
    }
    return usd;
  };
  const patrimonioInicial = soma(
    itens.map((it) => {
      const d0 = Math.max(S, it.inst.c);
      const v = it.inst.valorEx(d0);
      const aliq = aliquotaEvento(it.pos.produto, regime, d0 - it.inst.c, params.brasil, r);
      return (v - Math.max(0, v - it.inst.P) * aliq) / m.cambio(d0);
    }),
  );
  const patrimonioPorAno = anos.map((ano) => {
    const d = fimAno(ano);
    const usd = caixaAte(d) - impostosEuaAte(ano) + valorLiquidoEm(d);
    return { ano, usd, brl: usd * m.cambio(d) };
  });
  const patrimonioFinal = caixaAte(L) - impostosEuaAte(anoFim);
  const cargaTotal = t.ir_brasil_usd + t.federal_liquido_usd + t.niit_usd + t.estadual_usd;
  const carga = t.juros_usd > 0 ? cargaTotal / t.juros_usd : null;

  /* ---------- crédito: resumo ---------- */
  const origensJanela = credito.origens.filter((o) => !o.inicial);
  const resumo = {
    deduzido: soma(porAno.filter((a) => anosDeducao.includes(a.ano)).map((a) => a.irUsd + outrosImpostos)),
    imposto_estrangeiro: soma(origensJanela.map((o) => o.gerado)),
    proprio: soma(origensJanela.map((o) => o.usado_proprio)),
    ano_anterior: soma(origensJanela.map((o) => soma(o.enviado_anterior.map((x) => x.valor)))),
    seguintes: soma(origensJanela.map((o) => soma(o.usado_seguintes.filter((x) => x.com_credito).map((x) => x.valor)))),
    saldo: soma(origensJanela.map((o) => o.saldo_final)),
    expirado: soma(origensJanela.map((o) => o.expirado)),
  };

  /* ---------- rateio por aplicação ---------- */
  const porPosicao: ResultadoPosicao[] = itens.map((it) => {
    let juros = 0;
    let impostosEua = 0;
    let creditoAtrib = 0;
    porAno.forEach((a, i) => {
      const x = it.us.get(a.ano);
      const rendaPos = x ? x.juros_usd + x.cambio_usd : 0;
      juros += x ? x.juros_usd : 0;
      const rendaTot = a.juros + a.cambio;
      if (rendaTot > 0) {
        const ar = anosRes[i];
        impostosEua += ((ar.federal_antes_credito_incremental + ar.niit_incremental + ar.estadual) * rendaPos) / rendaTot;
      }
      const irPos = soma(it.br.filter((e) => e.ano === a.ano).map((e) => e.ir_brl / e.cambio));
      const origem = credito.origens.find((o) => o.ano_origem === a.ano && !o.inicial);
      if (origem && a.irUsd > 0) {
        const usado = origem.usado_proprio + soma(origem.enviado_anterior.map((y) => y.valor)) + soma(origem.usado_seguintes.filter((y) => y.com_credito).map((y) => y.valor));
        creditoAtrib += (usado * irPos) / (a.irUsd + outrosImpostos);
      }
    });
    const irBr = soma(it.br.map((e) => (e.ir_brl + e.iof_brl) / e.cambio));
    return {
      id: it.pos.id,
      produto: it.pos.produto,
      juros_usd: juros,
      ir_brasil_usd: irBr,
      credito_atribuido_usd: creditoAtrib,
      impostos_eua_usd: impostosEua,
      carga: juros > 0 ? (irBr + impostosEua - creditoAtrib) / juros : null,
    };
  });

  /* ---------- liquidez ---------- */
  let liquidezOk = true;
  const necessidades = [...sim.cenario.liquidez].sort((a, b) => a.data.localeCompare(b.data));
  let acumulado = 0;
  for (const n of necessidades) {
    acumulado += n.valor_brl;
    const recebido = soma(eventos.filter((e) => e.data <= dia(n.data) && e.data >= m.hoje).map((e) => e.liquido_brl));
    if (recebido + 1e-6 < acumulado) liquidezOk = false;
  }

  /* ---------- alertas ---------- */
  const nAplic = (n: number) => `${n} ${n > 1 ? 'aplicações' : 'aplicação'}`;
  if (antigas)
    alertas.push({
      codigo: 'antes_2026',
      nivel: 'medio',
      texto: `${nAplic(antigas)} comprada(s) antes de ${anoIni}. A simulação considera de ${anoIni} em diante. Confirme com seu contador se os juros dos anos anteriores foram declarados nos EUA e se os impostos foram pagos.`,
    });
  if (vencidas) alertas.push({ codigo: 'vencida', nivel: 'info', texto: `${nAplic(vencidas)} já venceu antes de ${anoIni} e ficou fora da simulação.` });
  if (resumo.saldo > 0.5)
    alertas.push({
      codigo: 'saldo_tende_perder',
      nivel: 'alto',
      texto: `Saldo de crédito de US$ ${Math.round(resumo.saldo).toLocaleString('pt-BR')} no fim de ${anoFim}. Sem renda estrangeira depois, ele tende a se perder.`,
    });
  if (resumo.expirado > 0.5) alertas.push({ codigo: 'credito_expirado', nivel: 'alto', texto: `US$ ${Math.round(resumo.expirado).toLocaleString('pt-BR')} de crédito expiram dentro do horizonte.` });
  for (const o of credito.origens)
    if (o.saldo_final > 0.5 && o.ano_expiracao <= anoFim + 2)
      alertas.push({ codigo: `credito_expira_${o.ano_origem}`, nivel: 'medio', texto: `Saldo de ${o.ano_origem} expira ao fim de ${o.ano_expiracao}.` });
  const retificar = new Set<number>();
  for (const o of credito.origens) for (const x of o.enviado_anterior) retificar.add(x.ano);
  for (const y of [...retificar].sort())
    alertas.push({ codigo: `retificar_${y}`, nivel: 'medio', texto: `Parte do crédito volta para ${y}: retificar a declaração de ${y} (Form 1040-X).` });
  const anoNiit = anosRes.find((a) => a.magi > limiar * 0.9);
  if (anoNiit)
    alertas.push({
      codigo: 'niit',
      nivel: anoNiit.magi > limiar ? 'info' : 'medio',
      texto: anoNiit.magi > limiar ? `Renda acima do limite do NIIT em ${anoNiit.ano}: incide 3,8% sobre a renda de investimentos, sem abatimento do crédito.` : `Renda perto do limite do NIIT em ${anoNiit.ano}.`,
    });
  const curtos = eventos.filter((e) => e.regime === 'light' && e.aliquota > 0.15 && e.base_brl > 0);
  if (curtos.length) alertas.push({ codigo: 'light_prazo_curto', nivel: 'medio', texto: `Na Light, ${curtos.length} evento(s) com alíquota acima de 15% (prazo curto). Exige alíquota média americana maior para caber no teto.` });
  const estAno0 = porAno[0]?.est;
  if (estAno0?.selo === 'nao_incluido') alertas.push({ codigo: 'estado_nao_incluido', nivel: 'medio', texto: 'Imposto estadual não incluído.' });
  if (estAno0?.selo === 'estimado') alertas.push({ codigo: 'estado_estimado', nivel: 'info', texto: 'Imposto estadual estimado pelo usuário, sem crédito pelo IR brasileiro.' });
  for (const p of r.tocadas.values()) alertas.push({ codigo: `pendente:${p.id}`, nivel: 'pendente', texto: p.rotulo });
  if (flags.has('iof_nao_calculado')) alertas.push({ codigo: 'iof_nao_calculado', nivel: 'pendente', texto: 'Resgate com menos de 30 dias: IOF não calculado (tabela pendente).' });
  if (semEmissao) alertas.push({ codigo: 'emissao_aproximada', nivel: 'info', texto: `Data de emissão igual à de compra em ${nAplic(semEmissao)} (aproximação).` });
  if (flags.has('ajuste_904b')) alertas.push({ codigo: 'ajuste_904b', nivel: 'info', texto: 'Ganhos qualificados informados: o ajuste do §904(b) no teto não é aplicado (aproximação).' });
  if (flags.has('faixas_nominais')) alertas.push({ codigo: 'faixas_nominais', nivel: 'info', texto: `Anos depois de ${params.eua.ano}: faixas nominais de ${params.eua.ano}. As faixas reais são publicadas a cada ano.` });
  if (!liquidezOk) alertas.push({ codigo: 'liquidez_nao_atendida', nivel: 'alto', texto: 'Esta estratégia não cobre a necessidade de liquidez informada.' });
  const TEXTO_APROX: Record<string, string> = {
    historico_cdi: 'CDI de dias passados sem dado no Banco Central estimado pela projeção.',
    historico_selic: 'Selic de dias passados sem dado no Banco Central estimada pela projeção.',
    historico_ipca: 'IPCA de meses ainda não divulgados pelo IBGE estimado pela projeção.',
    historico_cambio: 'Câmbio de dias passados sem cotação no Banco Central igualado à última cotação disponível.',
    fora_do_intervalo: 'Datas fora do período coberto pelos dados de mercado foram aproximadas.',
  };
  for (const a of m.aproximacoes) alertas.push({ codigo: `mercado_${a}`, nivel: 'info', texto: TEXTO_APROX[a] ?? `Dado de mercado aproximado: ${a.replace(/_/g, ' ')}.` });
  if (anosDeducao.length)
    alertas.push({
      codigo: 'deducao',
      nivel: 'info',
      texto: `Na simulação, deduzir o imposto estrangeiro (Schedule A) em vez de creditar resultou em menos imposto em ${anosDeducao.join(', ')}. Nesses anos o espaço do teto ainda consome o saldo de crédito, sem gerar crédito.`,
    });
  if (eventos.some((e) => e.iof_brl > 0)) alertas.push({ codigo: 'iof', nivel: 'info', texto: 'Há IOF em resgates com menos de 30 dias. O IOF entra na carga, mas não gera crédito nos EUA.' });
  alertas.push({ codigo: 'amt', nivel: 'info', texto: 'Não considera AMT.' });

  /* ---------- memória de cálculo ---------- */
  const memoria: Record<string, Memoria> = {
    patrimonio_final: {
      rotulo: `Patrimônio final em ${anoFim}`,
      valor: patrimonioFinal,
      unidade: 'USD',
      formula: 'Pagamentos recebidos no Brasil, líquidos de IR e IOF, convertidos pelo câmbio de cada data − impostos americanos causados pelos investimentos no Brasil',
      insumos: [
        { rotulo: 'Pagamentos líquidos convertidos', valor: caixaAte(L), unidade: 'USD', origem: 'calculado' },
        { rotulo: 'IR federal depois do crédito', valor: t.federal_liquido_usd, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'NIIT', valor: t.niit_usd, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Imposto estadual', valor: t.estadual_usd, unidade: 'USD', origem: estAno0?.modo === 'A' ? 'regra' : 'usuario' },
        { rotulo: `Câmbio no fim de ${anoFim}`, valor: m.cambio(L), unidade: '', origem: 'mercado' },
      ],
      base_legal: ['IRC §1272(a)(1) e Reg. §1.1272-1', 'Reg. §1.988-2(b)', 'IRC §904'],
      selos: ['aproximacao', 'premissa'],
    },
    carga: {
      rotulo: 'Carga efetiva total',
      valor: carga ?? 0,
      unidade: '%',
      formula: '(IR Brasil + IR federal depois do crédito + NIIT + estadual) ÷ juros e OID reconhecidos nos EUA',
      insumos: [
        { rotulo: 'IR retido no Brasil (com IOF)', valor: t.ir_brasil_usd, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'IR federal depois do crédito', valor: t.federal_liquido_usd, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'NIIT', valor: t.niit_usd, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Imposto estadual', valor: t.estadual_usd, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Juros e OID reconhecidos nos EUA', valor: t.juros_usd, unidade: 'USD', origem: 'calculado' },
      ],
      base_legal: ['Lei 11.033/2004, art. 1º', 'IRC §1, §904, §1411'],
      selos: ['aproximacao', 'premissa'],
    },
    credito: {
      rotulo: 'Destino do imposto estrangeiro',
      valor: resumo.imposto_estrangeiro,
      unidade: 'USD',
      formula: 'Imposto creditado = usado no próprio ano + enviado ao ano anterior + usado nos anos seguintes + saldo + expirado (em ano de dedução, o imposto é deduzido e não entra aqui)',
      insumos: [
        { rotulo: 'Usado no próprio ano', valor: resumo.proprio, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Enviado ao ano anterior', valor: resumo.ano_anterior, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Usado nos anos seguintes', valor: resumo.seguintes, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Saldo', valor: resumo.saldo, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Expirado', valor: resumo.expirado, unidade: 'USD', origem: 'calculado' },
      ],
      base_legal: ['IRC §904(c)', '26 CFR §1.904-2', '26 CFR §1.905-1(c)(1) e (d)(1)'],
      selos: ['confirmado'],
    },
  };
  anosRes.forEach((a) => {
    memoria[`teto_${a.ano}`] = {
      rotulo: `Teto do crédito de ${a.ano}`,
      valor: a.federal.teto,
      unidade: 'USD',
      formula: 'IR federal regular antes dos créditos × (renda tributável de fonte estrangeira ÷ renda tributável total)',
      insumos: [
        { rotulo: 'IR federal regular', valor: a.federal.imposto_regular, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Renda estrangeira bruta', valor: a.federal.renda_estrangeira_bruta, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Dedução alocada pela renda bruta', valor: -a.federal.deducao_alocada, unidade: 'USD', origem: 'regra' },
        { rotulo: 'Renda tributável de fonte estrangeira', valor: a.federal.renda_estrangeira_tributavel, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Renda tributável total', valor: a.federal.renda_tributavel_total, unidade: 'USD', origem: 'calculado' },
        { rotulo: 'Sua renda tributável sem o Brasil', valor: perfil.renda_tributavel_usd, unidade: 'USD', origem: 'usuario' },
      ],
      base_legal: ['IRC §904(a)', 'Form 1116, Parte III'],
      selos: ['aproximacao'],
    };
  });

  return {
    id,
    rotulo,
    regime,
    escolhas: ctx.escolhas,
    cronograma: crono,
    anos: anosRes,
    eventos_brasil: eventos,
    credito,
    credito_sem_brasil: creditoSem,
    estado: { modo: estAno0?.modo ?? 'B', selo: estAno0?.selo ?? 'nao_incluido' },
    totais: t,
    resumo_credito: resumo,
    anos_deducao: anosDeducao,
    patrimonio_inicial_usd: patrimonioInicial,
    patrimonio_final_usd: patrimonioFinal,
    patrimonio_final_brl: patrimonioFinal * m.cambio(L),
    patrimonio_por_ano: patrimonioPorAno,
    carga_efetiva: carga,
    por_posicao: porPosicao,
    liquidez_ok: liquidezOk,
    alertas,
    memoria,
    pendencias: [...r.tocadas.values()],
  };
}

/* ---------- objetivo ---------- */
/** Quanto maior, melhor. */
export function objetivo(res: ResultadoEstrategia, tipo: Simulacao['cenario']['objetivo']): number {
  if (tipo === 'carga') return -(res.carga_efetiva ?? 0) * 1e6 + res.patrimonio_final_usd * 1e-6;
  if (tipo === 'credito_perdido') return -(res.resumo_credito.saldo + res.resumo_credito.expirado) * 1e3 + res.patrimonio_final_usd * 1e-6;
  return res.patrimonio_final_usd;
}

/* ---------- estratégias ---------- */
function resgatavel(pos: Posicao): boolean {
  return pos.liquidez.tipo !== 'vencimento';
}

/** Data de resgate num ano: meio do ano, respeitando hoje, carência e, na Light, o fim da faixa de 720 dias. */
function dataNoAno(ctx: Contexto, pos: Posicao, ano: number): Dia | null {
  const { mercado: m, params, regime } = ctx;
  const c = dia(pos.data_compra);
  const T = dia(pos.data_vencimento);
  let d = Math.max(meioDoAno(ano), m.hoje);
  if (pos.liquidez.tipo === 'carencia') d = Math.max(d, dia(pos.liquidez.ate));
  if (regime === 'light' && d - c <= 720 && c + 721 <= fimAno(ano)) {
    const r = new Resolvedor(ctx.escolhas);
    if (regraProduto(pos.produto, regime, params.brasil, r).aliquota === 'regressiva') d = Math.max(d, c + 721);
  }
  if (anoDe(d) !== ano || d >= T) return null;
  return d;
}

export interface Estrategia {
  id: string;
  rotulo: string;
  cronograma: Cronograma;
}

export function estrategiasBase(ctx: Contexto): Estrategia[] {
  const { sim } = ctx;
  const { anoIni, anoFim } = janela(sim, ctx.mercado);
  const atual = cronogramaDoPlano(sim);
  const out: Estrategia[] = [{ id: 'atual', rotulo: 'Seu plano', cronograma: atual }];
  out.push({ id: 'manter', rotulo: 'Manter até o vencimento', cronograma: Object.fromEntries(sim.posicoes.map((p) => [p.id, []])) });
  for (let ano = anoIni; ano <= anoFim; ano++) {
    const crono: Cronograma = {};
    let algum = false;
    for (const p of sim.posicoes) {
      const d = resgatavel(p) ? dataNoAno(ctx, p, ano) : null;
      crono[p.id] = d === null ? [] : [{ d, fracao: 1 }];
      if (d !== null) algum = true;
    }
    if (algum) out.push({ id: `total_${ano}`, rotulo: `Resgate total em ${ano}`, cronograma: crono });
  }
  if (ctx.regime === 'light') {
    const crono: Cronograma = {};
    let mudou = false;
    for (const p of sim.posicoes) {
      const c = dia(p.data_compra);
      const T = dia(p.data_vencimento);
      crono[p.id] = (atual[p.id] ?? []).map((x) => {
        if (x.d - c <= 720 && c + 721 < T) {
          mudou = true;
          return { d: c + 721, fracao: x.fracao };
        }
        return x;
      });
    }
    if (mudou) out.push({ id: 'light_faixa', rotulo: 'Light: esperar passar de 720 dias', cronograma: crono });
  }
  return out;
}

/** Busca em grade por aplicação e ano, com melhoria local (coordenada por coordenada). */
export function otimiza(ctx: Contexto, inicial: Cronograma, maxPassadas = 3): { cronograma: Cronograma; resultado: ResultadoEstrategia } {
  const { sim } = ctx;
  const { anoIni, anoFim } = janela(sim, ctx.mercado);
  const tipo = sim.cenario.objetivo;
  let melhor = { ...inicial };
  let melhorRes = simula(ctx, melhor, 'otimizada', 'Melhor estratégia encontrada');
  let melhorVal = melhorRes.liquidez_ok ? objetivo(melhorRes, tipo) : -Infinity;

  const candidatos = (p: Posicao): ResgateProgramado[][] => {
    const out: ResgateProgramado[][] = [[]];
    const datas: Dia[] = [];
    for (let ano = anoIni; ano <= anoFim; ano++) {
      const d = dataNoAno(ctx, p, ano);
      if (d !== null) datas.push(d);
    }
    for (const d of datas) {
      out.push([{ d, fracao: 1 }]);
      // resgate parcial num ano, o restante mantido (útil para cobrir liquidez sem antecipar tudo)
      for (const f of [0.25, 0.5, 0.75]) out.push([{ d, fracao: f }]);
    }
    for (let i = 0; i + 1 < datas.length; i++) out.push([{ d: datas[i], fracao: 0.5 }, { d: datas[i + 1], fracao: 0.5 }]);
    for (let i = 0; i + 2 < datas.length; i++)
      out.push([
        { d: datas[i], fracao: 1 / 3 },
        { d: datas[i + 1], fracao: 1 / 3 },
        { d: datas[i + 2], fracao: 1 / 3 },
      ]);
    return out;
  };

  const elegiveis = sim.posicoes.filter(resgatavel);
  for (let passada = 0; passada < maxPassadas; passada++) {
    let melhorou = false;
    for (const p of elegiveis) {
      for (const cand of candidatos(p)) {
        const teste = { ...melhor, [p.id]: cand };
        const res = simula(ctx, teste, 'otimizada', 'Melhor estratégia encontrada');
        if (!res.liquidez_ok) continue;
        const v = objetivo(res, tipo);
        if (v > melhorVal + 1e-6) {
          melhor = teste;
          melhorRes = res;
          melhorVal = v;
          melhorou = true;
        }
      }
    }
    if (!melhorou) break;
  }
  return { cronograma: melhor, resultado: melhorRes };
}

export function descreveCronograma(sim: Simulacao, crono: Cronograma): string {
  const partes: string[] = [];
  for (const p of sim.posicoes) {
    const rs = crono[p.id] ?? [];
    if (!rs.length) continue;
    const anos = rs.map((x) => anoDe(x.d));
    partes.push(`${p.id}: ${rs.length > 1 ? 'parcelas em ' + anos.join(', ') : 'resgate em ' + iso(rs[0].d)}`);
  }
  return partes.length ? partes.join(' · ') : 'Manter até o vencimento ou o fim do horizonte';
}

/* ---------- decomposição da diferença ---------- */
export interface Decomposicao {
  rendimento_bruto: number;
  cambio: number;
  ir_brasil: number;
  ir_eua: number;
  credito: number;
  total: number;
}

/** Diferença de patrimônio final entre duas estratégias, em US$ (b − a). */
export function decompoe(a: ResultadoEstrategia, b: ResultadoEstrategia): Decomposicao {
  const ta = a.totais;
  const tb = b.totais;
  return {
    rendimento_bruto: tb.juros_usd - ta.juros_usd,
    cambio: tb.cambio_usd - ta.cambio_usd,
    ir_brasil: -(tb.ir_brasil_usd - ta.ir_brasil_usd),
    ir_eua: -(tb.federal_antes_credito_usd + tb.niit_usd + tb.estadual_usd - (ta.federal_antes_credito_usd + ta.niit_usd + ta.estadual_usd)),
    credito: tb.credito_incremental_usd - ta.credito_incremental_usd,
    total: b.patrimonio_final_usd - a.patrimonio_final_usd,
  };
}

/* ---------- taxa de equilíbrio (13.2) ---------- */
/**
 * Taxa que um produto isento precisaria pagar para render o mesmo que o produto tributado,
 * depois de todos os impostos: r_isento = r_tributado × (1 − carga_tributado) ÷ (1 − carga_isento).
 * Para indexadores com parcela fixa (IPCA+, CDI+, Selic+), a conta é feita sobre o rendimento
 * total projetado e volta para o formato do indexador.
 * @param indiceMedio rendimento anual médio projetado do índice (fração), quando houver
 */
export function taxaEquilibrio(pos: Pick<Posicao, 'indexador' | 'taxa'>, cargaTributado: number, cargaIsento: number, indiceMedio = 0): number {
  const k = (1 - cargaTributado) / (1 - cargaIsento);
  if (pos.indexador === 'cdi' || pos.indexador === 'pre') return pos.taxa * k;
  const total = (1 + indiceMedio) * (1 + pos.taxa / 100) - 1;
  return ((1 + total * k) / (1 + indiceMedio) - 1) * 100;
}

/* ---------- simulação completa ---------- */
export interface ResultadoInterpretacao {
  escolhas: Record<string, string>;
  rotulos: string[];
  estrategias: ResultadoEstrategia[]; // a primeira é "Seu plano"
  melhor: string; // id da estratégia de melhor objetivo entre as que cobrem a liquidez
}

export interface ResultadoRegime {
  regime: Regime;
  pendencias: Pendente<unknown>[];
  interpretacoes: ResultadoInterpretacao[];
}

export function simulaTudo(sim: Simulacao, params: Parametros, mercado: Mercado): ResultadoRegime[] {
  const regimes: Regime[] = sim.conta === 'comparar' ? ['light', 'full'] : [sim.conta];
  return regimes.map((regime) => {
    const ctx0: Contexto = { sim, params, mercado, regime, escolhas: {} };
    const base = estrategiasBase(ctx0);
    const resBase = base.map((e) => simula(ctx0, e.cronograma, e.id, e.rotulo));
    // ponto de partida do otimizador: a melhor estratégia base que cobre a liquidez (ou o plano do usuário)
    const viaveis = resBase.filter((x) => x.liquidez_ok);
    const partida = viaveis.length
      ? viaveis.reduce((a, b) => (objetivo(b, sim.cenario.objetivo) > objetivo(a, sim.cenario.objetivo) ? b : a))
      : resBase[0];
    const otim = otimiza(ctx0, partida.cronograma);
    const lista: Estrategia[] = [...base, { id: 'otimizada', rotulo: 'Melhor estratégia encontrada', cronograma: otim.cronograma }];

    // regras pendentes com mais de uma interpretação tocadas por qualquer estratégia
    const pend = new Map<string, Pendente<unknown>>();
    const primeira = [...resBase, otim.resultado];
    for (const res of primeira) for (const p of res.pendencias) if (p.interpretacoes.length > 1) pend.set(p.id, p);
    const pendencias = [...pend.values()];

    const interpretacoes = combinacoes(pendencias).map((escolhas, i) => {
      const resultados = i === 0 && !pendencias.length ? primeira : lista.map((e) => simula({ ...ctx0, escolhas }, e.cronograma, e.id, e.rotulo));
      const validas = resultados.filter((x) => x.liquidez_ok);
      const melhor = (validas.length ? validas : resultados).reduce((a, b) => (objetivo(b, sim.cenario.objetivo) > objetivo(a, sim.cenario.objetivo) ? b : a));
      return {
        escolhas,
        rotulos: pendencias.map((p) => p.interpretacoes.find((x) => x.id === escolhas[p.id])?.rotulo ?? ''),
        estrategias: resultados,
        melhor: melhor.id,
      };
    });
    return { regime, pendencias, interpretacoes };
  });
}

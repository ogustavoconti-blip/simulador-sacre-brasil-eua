// Ponto de entrada dos motores: valida a simulação, monta o mercado e roda as estratégias.
// É o que o Web Worker chama. Nada aqui grava, envia ou guarda dados.
import { addMeses, dia, fimAno, isoValido } from './calendario';
import { criaMercado, trajetoriaAnual, trajetoriaFocus, type AnoMercado, type DadosMercado } from './mercado';
import { janela, simulaTudo, type ResultadoRegime } from './motor-cenarios';
import { ParametroAusente } from './parametros';
import { PRODUTOS, type Parametros, type Simulacao } from './tipos';

export interface Problema {
  campo: string;
  texto: string;
}

/** Validação de entrada ("dado faltando" e valores impossíveis). */
export function validaSimulacao(sim: Simulacao, hoje: string): Problema[] {
  const p: Problema[] = [];
  const perfil = sim.perfil;
  if (!perfil.estado || perfil.estado.length !== 2) p.push({ campo: 'perfil.estado', texto: 'Escolha o estado.' });
  if (!(perfil.renda_tributavel_usd >= 0)) p.push({ campo: 'perfil.renda_tributavel_usd', texto: 'Informe a renda tributável estimada.' });
  if (perfil.aliquota_estadual_estimada !== null && !(perfil.aliquota_estadual_estimada >= 0 && perfil.aliquota_estadual_estimada <= 20))
    p.push({ campo: 'perfil.aliquota_estadual_estimada', texto: 'Alíquota estadual entre 0% e 20%.' });
  if (!sim.posicoes.length) p.push({ campo: 'posicoes', texto: 'Inclua ao menos uma aplicação.' });
  sim.posicoes.forEach((x, i) => {
    const c = `posicoes[${i}]`;
    if (!PRODUTOS.includes(x.produto)) p.push({ campo: `${c}.produto`, texto: 'Produto inválido.' });
    if (!(x.valor_aplicado_brl > 0)) p.push({ campo: `${c}.valor_aplicado_brl`, texto: 'Informe o valor aplicado.' });
    const datasOk = isoValido(x.data_compra) && isoValido(x.data_vencimento);
    if (!datasOk) p.push({ campo: `${c}.datas`, texto: 'Informe as datas de compra e de vencimento.' });
    else {
      if (dia(x.data_vencimento) <= dia(x.data_compra)) p.push({ campo: `${c}.data_vencimento`, texto: 'O vencimento deve ser depois da compra.' });
      if (dia(x.data_compra) > dia(hoje)) p.push({ campo: `${c}.data_compra`, texto: 'A data de compra não pode estar no futuro.' });
    }
    if (x.data_emissao && !isoValido(x.data_emissao)) p.push({ campo: `${c}.data_emissao`, texto: 'Data de emissão inválida.' });
    if (!(x.taxa >= 0) || (x.indexador !== 'selic_mais' && x.taxa === 0)) p.push({ campo: `${c}.taxa`, texto: 'Informe a taxa.' });
    if (x.indexador === 'cdi' && x.taxa > 300) p.push({ campo: `${c}.taxa`, texto: 'Percentual do CDI acima de 300% parece um erro.' });
    if (x.pagamento.tipo === 'cupom' && ![1, 3, 6, 12].includes(x.pagamento.meses)) p.push({ campo: `${c}.pagamento`, texto: 'Periodicidade de cupom inválida.' });
    if (x.liquidez.tipo === 'carencia' && !isoValido(x.liquidez.ate)) p.push({ campo: `${c}.liquidez`, texto: 'Informe a data do fim da carência.' });
    if (x.plano.tipo === 'total' && !isoValido(x.plano.data)) p.push({ campo: `${c}.plano`, texto: 'Informe a data do resgate.' });
    if (x.plano.tipo === 'parcial') {
      const total = x.plano.resgates.reduce((s, r) => s + r.fracao, 0);
      if (total > 1 + 1e-9 || x.plano.resgates.some((r) => !isoValido(r.data) || !(r.fracao > 0)))
        p.push({ campo: `${c}.plano`, texto: 'Resgates parciais: datas válidas e frações que somem até 100%.' });
    }
  });
  const h = sim.cenario.horizonte_anos;
  if (!(Number.isInteger(h) && h >= 1 && h <= 15)) p.push({ campo: 'cenario.horizonte_anos', texto: 'Horizonte de 1 a 15 anos.' });
  if (sim.cenario.tipo === 'personalizado' && !sim.cenario.trajetoria.length) p.push({ campo: 'cenario.trajetoria', texto: 'Preencha a trajetória do cenário personalizado.' });
  for (const n of sim.cenario.liquidez) if (!isoValido(n.data) || !(n.valor_brl > 0)) p.push({ campo: 'cenario.liquidez', texto: 'Necessidade de liquidez: data e valor.' });
  return p;
}

export interface InfoMercado {
  data: string;
  fonte: string;
  focus_coleta: string | null;
  anos: AnoMercado[];
  cambio_fim_ano: Record<number, number>; // R$ por US$ no último dia de cada ano simulado
  cambio_hoje: number;
}

export type Execucao =
  | { ok: true; resultado: ResultadoRegime[]; dados_mercado: InfoMercado }
  | { ok: false; problemas: Problema[] };

export function executaSimulacao(sim: Simulacao, params: Parametros, dados: DadosMercado): Execucao {
  const problemas = validaSimulacao(sim, dados.hoje);
  if (problemas.length) return { ok: false, problemas };
  const hoje = dia(dados.hoje);
  const anoIni = new Date(hoje * 86_400_000).getUTCFullYear();
  const anoFim = anoIni + sim.cenario.horizonte_anos - 1;
  const primeiraCompra = Math.min(...sim.posicoes.map((x) => dia(x.data_compra)));
  const anoPrimeiro = new Date(primeiraCompra * 86_400_000).getUTCFullYear();
  const anos =
    sim.cenario.tipo === 'focus'
      ? trajetoriaFocus(dados, anoPrimeiro, anoFim)
      : trajetoriaAnual(sim.cenario.trajetoria, dados.selic_hoje, dados.spread_cdi_selic, anoPrimeiro, anoFim, 'usuario');
  const mercado = criaMercado(dados, anos, addMeses(primeiraCompra, -1), fimAno(anoFim) + 31);
  // garante que a janela calculada aqui é a mesma dos motores
  if (janela(sim, mercado).anoFim !== anoFim) throw new Error('Janela inconsistente.');
  const cambioFim: Record<number, number> = {};
  for (let a = anoIni; a <= anoFim; a++) cambioFim[a] = mercado.cambio(fimAno(a));
  try {
    return {
      ok: true,
      resultado: simulaTudo(sim, params, mercado),
      dados_mercado: {
        data: dados.hoje,
        fonte: 'Banco Central do Brasil (SGS e Focus)',
        focus_coleta: dados.focus?.data_coleta ?? null,
        anos: anos.filter((a) => a.ano >= anoIni),
        cambio_fim_ano: cambioFim,
        cambio_hoje: dados.cambio_hoje,
      },
    };
  } catch (e) {
    if (e instanceof ParametroAusente) return { ok: false, problemas: [{ campo: e.nome, texto: e.message }] };
    throw e;
  }
}

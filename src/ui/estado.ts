// Estado da tela (só em memória: nada vai para cookies, armazenamento do navegador ou servidor)
// e conversão para a entrada dos motores.
import type { DadosMercado } from '../motores/mercado';
import type { Filing, Indexador, Posicao, ProdutoId, Simulacao } from '../motores/tipos';
import { lerData, lerNumero } from './formato';
import { FAIXAS_RENDA } from './textos';

export type IdxUI = 'pre' | 'cdi' | 'cdimais' | 'ipca' | 'selic';
export const IDX: Record<IdxUI, { nome: string; pre: string; suf: string; ph: string; motor: Indexador }> = {
  pre: { nome: 'Prefixado', pre: '', suf: '% a.a.', ph: '13,00', motor: 'pre' },
  cdi: { nome: '% do CDI', pre: '', suf: '% do CDI', ph: '102', motor: 'cdi' },
  cdimais: { nome: 'CDI + taxa', pre: 'CDI +', suf: '% a.a.', ph: '1,20', motor: 'cdi_mais' },
  ipca: { nome: 'IPCA + taxa', pre: 'IPCA +', suf: '% a.a.', ph: '6,50', motor: 'ipca_mais' },
  selic: { nome: 'Selic + taxa', pre: 'Selic +', suf: '% a.a.', ph: '0,05', motor: 'selic_mais' },
};

export type TipoBR = 'tesouro' | 'cdb' | 'isento' | 'deb';
export const PRODUTOS: Record<string, { id: ProdutoId; idx: IdxUI[]; pag?: string; tipo: TipoBR }> = {
  'Tesouro Selic': { id: 'tesouro_selic', idx: ['selic'], pag: 'Só no vencimento', tipo: 'tesouro' },
  'Tesouro Prefixado': { id: 'tesouro_pre', idx: ['pre'], pag: 'Só no vencimento', tipo: 'tesouro' },
  'Tesouro Prefixado com juros semestrais': { id: 'tesouro_pre_cupom', idx: ['pre'], pag: 'Cupons semestrais', tipo: 'tesouro' },
  'Tesouro IPCA+': { id: 'tesouro_ipca', idx: ['ipca'], pag: 'Só no vencimento', tipo: 'tesouro' },
  'Tesouro IPCA+ com juros semestrais': { id: 'tesouro_ipca_cupom', idx: ['ipca'], pag: 'Cupons semestrais', tipo: 'tesouro' },
  'CDB pré': { id: 'cdb_pre', idx: ['pre'], tipo: 'cdb' },
  'CDB % do CDI': { id: 'cdb_cdi', idx: ['cdi'], tipo: 'cdb' },
  'CDB IPCA+': { id: 'cdb_ipca', idx: ['ipca'], tipo: 'cdb' },
  LCI: { id: 'lci', idx: ['cdi', 'pre', 'ipca'], tipo: 'isento' },
  LCA: { id: 'lca', idx: ['cdi', 'pre', 'ipca'], tipo: 'isento' },
  CRI: { id: 'cri', idx: ['ipca', 'cdimais', 'cdi', 'pre'], tipo: 'isento' },
  CRA: { id: 'cra', idx: ['ipca', 'cdimais', 'cdi', 'pre'], tipo: 'isento' },
  'Debênture comum': { id: 'debenture', idx: ['ipca', 'cdimais', 'cdi', 'pre'], tipo: 'deb' },
  'Debênture incentivada': { id: 'debenture_incentivada', idx: ['ipca', 'cdimais', 'pre'], tipo: 'isento' },
};
export const PAGAMENTOS: Record<string, number> = { 'Só no vencimento': 0, 'Cupons mensais': 1, 'Cupons trimestrais': 3, 'Cupons semestrais': 6, 'Cupons anuais': 12 };
export const LIQUIDEZ = ['Diária', 'Com carência', 'Só no vencimento'] as const;

export interface LinhaInv {
  uid: number;
  p: string;
  v: string;
  c: string;
  ven: string;
  em: string; // emissão (avançado)
  idx: IdxUI;
  taxa: string;
  pag: string;
  liq: string;
  carencia: string;
  plano: string; // 'vencimento' | 'sugerir' | 'total:AAAA' | 'parcial'
  parciais: { ano: string; pct: string }[];
  avancado: boolean;
}

export interface EstadoUI {
  etapa: number;
  liberado: boolean;
  naoResidente: boolean;
  perfil: {
    estado: string;
    filing: Filing;
    rendaModo: 'exata' | 'faixa';
    renda: string;
    faixa: number;
    aliqEst: string;
    itemizadas: string;
    ganhosQualif: string;
    outrasRendas: string;
    outrosImpostos: string;
    saldos: { ano: string; valor: string }[];
    tetoLivreAnterior: string;
  };
  conta: 'light' | 'full' | 'comparar';
  carteira: LinhaInv[];
  exemplo: boolean;
  cenario: {
    tipo: 'focus' | 'personalizado';
    trajetoria: { ano: number; selic: string; ipca: string; cambio: string }[];
    horizonte: number;
    liquidez: { valor: string; data: string }[];
    objetivo: 'patrimonio' | 'carga' | 'credito_perdido';
    inflacao: string;
  };
  moeda: 'USD' | 'BRL';
}

let proximoUid = 1;
export const novaLinha = (o: Partial<LinhaInv> = {}): LinhaInv => ({
  uid: proximoUid++,
  p: 'CDB % do CDI',
  v: '',
  c: '',
  ven: '',
  em: '',
  idx: 'cdi',
  taxa: '',
  pag: 'Só no vencimento',
  liq: 'Diária',
  carencia: '',
  plano: 'vencimento',
  parciais: [],
  avancado: false,
  ...o,
});

export const carteiraExemplo = (): LinhaInv[] => [
  novaLinha({ p: 'CDB % do CDI', v: '500.000', c: '17/03/2025', ven: '17/03/2031', idx: 'cdi', taxa: '102', plano: 'total:2031' }),
  novaLinha({ p: 'LCA', v: '300.000', c: '12/01/2026', ven: '12/01/2028', idx: 'cdi', taxa: '95', liq: 'Só no vencimento' }),
  novaLinha({ p: 'Tesouro IPCA+ com juros semestrais', v: '200.000', c: '05/08/2024', ven: '15/05/2035', idx: 'ipca', taxa: '7,20', pag: 'Cupons semestrais', plano: 'total:2031' }),
  novaLinha({ p: 'Debênture incentivada', v: '150.000', c: '20/06/2025', ven: '15/06/2032', idx: 'ipca', taxa: '6,80', pag: 'Cupons semestrais', liq: 'Só no vencimento', plano: 'sugerir' }),
];

export function trajetoriaInicial(dados: DadosMercado, horizonte: number) {
  const ano0 = Number(dados.hoje.slice(0, 4));
  const f = dados.focus?.anos ?? [];
  const out: EstadoUI['cenario']['trajetoria'] = [];
  for (let a = ano0; a < ano0 + horizonte; a++) {
    const p = f.find((x) => x.ano === a) ?? f[f.length - 1];
    const br = (v: number | undefined) => (v === undefined ? '' : String(Math.round(v * 100) / 100).replace('.', ','));
    out.push({ ano: a, selic: br(p?.selic.mediana), ipca: br(p?.ipca.mediana), cambio: br(p?.cambio.mediana) });
  }
  return out;
}

export function estadoInicial(dados: DadosMercado): EstadoUI {
  return {
    etapa: 1,
    liberado: false,
    naoResidente: false,
    perfil: {
      estado: 'FL',
      filing: 'single',
      rendaModo: 'exata',
      renda: '120.000',
      faixa: 2,
      aliqEst: '',
      itemizadas: '',
      ganhosQualif: '',
      outrasRendas: '',
      outrosImpostos: '',
      saldos: [],
      tetoLivreAnterior: '',
    },
    conta: 'light',
    carteira: carteiraExemplo(),
    exemplo: true,
    cenario: { tipo: 'focus', trajetoria: trajetoriaInicial(dados, 6), horizonte: 6, liquidez: [], objetivo: 'patrimonio', inflacao: '' },
    moeda: 'USD',
  };
}

/* ---------- conversão para os motores ---------- */
export interface ProblemaUI {
  campo: string;
  texto: string;
}

const opcional = (s: string) => {
  const n = lerNumero(s);
  return isFinite(n) ? n : undefined;
};

/** Data de um resgate "no ano": 1º de julho, sem passar de hoje nem do vencimento. */
function dataNoAno(ano: number, hoje: string, venc: string): string {
  let d = `${ano}-07-01`;
  if (d < hoje) d = hoje;
  if (d >= venc) {
    const v = new Date(`${venc}T00:00:00Z`);
    v.setUTCDate(v.getUTCDate() - 1);
    d = v.toISOString().slice(0, 10);
  }
  return d;
}

export function montaSimulacao(e: EstadoUI, hoje: string): { sim: Simulacao | null; problemas: ProblemaUI[] } {
  const problemas: ProblemaUI[] = [];
  const pf = e.perfil;
  const renda = pf.rendaModo === 'exata' ? lerNumero(pf.renda) : FAIXAS_RENDA[pf.faixa]?.[1];
  if (!(renda >= 0)) problemas.push({ campo: 'renda', texto: 'Informe a renda tributável estimada.' });
  const aliq = pf.aliqEst.trim() ? lerNumero(pf.aliqEst) : null;
  if (aliq !== null && !(aliq >= 0 && aliq <= 20)) problemas.push({ campo: 'aliqEst', texto: 'Alíquota estadual entre 0% e 20%.' });

  const posicoes: Posicao[] = [];
  e.carteira.forEach((l, i) => {
    const n = i + 1;
    const P = PRODUTOS[l.p];
    const v = lerNumero(l.v);
    const c = lerData(l.c);
    const ven = lerData(l.ven);
    const em = l.em.trim() ? lerData(l.em) : undefined;
    const taxa = lerNumero(l.taxa);
    if (!(v > 0)) problemas.push({ campo: `inv${l.uid}.v`, texto: `Aplicação ${n}: informe o valor aplicado.` });
    if (!c) problemas.push({ campo: `inv${l.uid}.c`, texto: `Aplicação ${n}: data de compra no formato dd/mm/aaaa.` });
    if (!ven) problemas.push({ campo: `inv${l.uid}.ven`, texto: `Aplicação ${n}: data de vencimento no formato dd/mm/aaaa.` });
    if (em === null) problemas.push({ campo: `inv${l.uid}.em`, texto: `Aplicação ${n}: data de emissão inválida.` });
    if (!(taxa >= 0) || (l.idx !== 'selic' && !(taxa > 0))) problemas.push({ campo: `inv${l.uid}.taxa`, texto: `Aplicação ${n}: informe a taxa.` });
    if (c && ven && ven <= c) problemas.push({ campo: `inv${l.uid}.ven`, texto: `Aplicação ${n}: o vencimento deve ser depois da compra.` });
    if (c && c > hoje) problemas.push({ campo: `inv${l.uid}.c`, texto: `Aplicação ${n}: a compra não pode estar no futuro.` });
    const carencia = l.liq === 'Com carência' ? lerData(l.carencia) : null;
    if (l.liq === 'Com carência' && !carencia) problemas.push({ campo: `inv${l.uid}.carencia`, texto: `Aplicação ${n}: informe o fim da carência.` });
    if (!P || !c || !ven || !(v > 0) || !(taxa >= 0) || em === null) return;

    let plano: Posicao['plano'];
    if (l.plano === 'sugerir') plano = { tipo: 'sugerir' };
    else if (l.plano.startsWith('total:')) plano = { tipo: 'total', data: dataNoAno(Number(l.plano.slice(6)), hoje, ven) };
    else if (l.plano === 'parcial') {
      const resgates = l.parciais
        .map((x) => ({ ano: Number(x.ano), fr: lerNumero(x.pct) / 100 }))
        .filter((x) => x.ano > 2000 && x.fr > 0)
        .map((x) => ({ data: dataNoAno(x.ano, hoje, ven), fracao: x.fr }));
      const soma = resgates.reduce((s, x) => s + x.fracao, 0);
      if (!resgates.length || soma > 1.0001) problemas.push({ campo: `inv${l.uid}.plano`, texto: `Aplicação ${n}: resgates parciais com ano e percentual, somando até 100%.` });
      plano = { tipo: 'parcial', resgates };
    } else plano = { tipo: 'vencimento' };

    const meses = PAGAMENTOS[l.pag] ?? 0;
    posicoes.push({
      id: `a${l.uid}`,
      produto: P.id,
      valor_aplicado_brl: v,
      data_compra: c,
      data_vencimento: ven,
      ...(em ? { data_emissao: em } : {}),
      indexador: IDX[l.idx].motor,
      taxa,
      pagamento: meses ? { tipo: 'cupom', meses } : { tipo: 'vencimento' },
      liquidez: l.liq === 'Diária' ? { tipo: 'diaria' } : l.liq === 'Com carência' && carencia ? { tipo: 'carencia', ate: carencia } : { tipo: 'vencimento' },
      plano,
    });
  });
  if (!e.carteira.length) problemas.push({ campo: 'carteira', texto: 'Inclua ao menos uma aplicação.' });

  const liquidez = e.cenario.liquidez
    .map((x) => ({ valor_brl: lerNumero(x.valor), data: lerData(x.data) }))
    .filter((x): x is { valor_brl: number; data: string } => x.valor_brl > 0 && !!x.data);
  const traj = e.cenario.trajetoria.map((t) => ({ ano: t.ano, selic_fim: lerNumero(t.selic), ipca: lerNumero(t.ipca), cambio_fim: lerNumero(t.cambio) }));
  if (e.cenario.tipo === 'personalizado' && traj.some((t) => !isFinite(t.selic_fim) || !isFinite(t.ipca) || !(t.cambio_fim > 0)))
    problemas.push({ campo: 'trajetoria', texto: 'Cenário personalizado: preencha Selic, IPCA e câmbio de todos os anos.' });

  if (problemas.length) return { sim: null, problemas };
  return {
    problemas,
    sim: {
      perfil: {
        estado: pf.estado,
        filing: pf.filing,
        renda_tributavel_usd: renda,
        aliquota_estadual_estimada: aliq,
        avancado: {
          itemizadas_usd: opcional(pf.itemizadas),
          ganhos_qualificados_usd: opcional(pf.ganhosQualif),
          outras_rendas_passivas_usd: opcional(pf.outrasRendas),
          outros_impostos_estrangeiros_usd: opcional(pf.outrosImpostos),
          teto_livre_ano_anterior_usd: opcional(pf.tetoLivreAnterior),
          saldo_credito_existente: pf.saldos
            .map((s) => ({ ano_origem: Number(s.ano), valor_usd: lerNumero(s.valor) }))
            .filter((s) => s.ano_origem > 2000 && s.valor_usd > 0),
        },
      },
      conta: 'comparar', // roda as duas contas: a tela mostra a escolhida e usa a outra no comparativo
      posicoes,
      cenario: {
        tipo: e.cenario.tipo,
        trajetoria: traj,
        horizonte_anos: e.cenario.horizonte,
        moeda: e.moeda,
        liquidez,
        objetivo: e.cenario.objetivo,
        reinvestimento: { tipo: 'nenhum' },
        inflacao_eua_faixas: opcional(e.cenario.inflacao) ?? null,
      },
    },
  };
}

/** Rótulo curto de uma aplicação para as telas de resultado. */
export const rotuloAplicacao = (e: EstadoUI, idMotor: string) => {
  const i = e.carteira.findIndex((l) => `a${l.uid}` === idMotor);
  if (i < 0) return idMotor;
  const l = e.carteira[i];
  const tx = IDX[l.idx];
  return `${l.p}${l.taxa ? `, ${tx.pre ? tx.pre + ' ' : ''}${l.taxa}${tx.suf === '% do CDI' ? '% do CDI' : '%'}` : ''}`;
};

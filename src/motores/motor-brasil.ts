// IR retido no Brasil em cada evento (cupom, resgate, vencimento), por produto e regime.
import { anoDe, iso, type Dia } from './calendario';
import type { EventoFluxo, Instrumento } from './fluxos';
import type { Mercado } from './mercado';
import { ParametroAusente, Resolvedor } from './parametros';
import type { AliquotaBR, FaixaParcela, FaixaRegressiva, ParametrosBrasil, ProdutoId, Regime } from './tipos';

export interface EventoBR {
  posicao: string;
  produto: ProdutoId;
  regime: Regime;
  data: Dia;
  ano: number;
  tipo: 'cupom' | 'resgate' | 'vencimento';
  liquidacao: boolean;
  valor_bruto_brl: number;
  base_brl: number; // rendimento tributável, antes do IOF
  dias: number; // prazo usado na alíquota
  aliquota: number;
  iof_brl: number;
  ir_brl: number;
  liquido_brl: number;
  cambio: number; // R$ por US$ na data do pagamento
  ir_usd: number;
  regra: string;
}

/** Alíquota da tabela regressiva pelo prazo em dias corridos (Lei 11.033/2004, art. 1º). */
export function aliquotaRegressiva(dias: number, tabela: FaixaRegressiva[]): number {
  for (const f of tabela) if (f.ate_dias === null || dias <= f.ate_dias) return f.aliquota;
  return tabela[tabela.length - 1].aliquota;
}

/** IR sobre ganho na venda de imóvel, por parcela do ganho (Lei 8.981/1995, art. 21). Fase 2. */
export function irGanhoImovel(ganho: number, tabela: FaixaParcela[]): number {
  let ir = 0;
  let piso = 0;
  for (const f of tabela) {
    const teto = f.ate ?? Infinity;
    if (ganho > piso) ir += (Math.min(ganho, teto) - piso) * f.aliquota;
    piso = teto;
  }
  return ir;
}

export function regraProduto(produto: ProdutoId, regime: Regime, P: ParametrosBrasil, r: Resolvedor) {
  const regra = P.regimes[regime][produto];
  const aliquota: AliquotaBR = r.valor(regra.aliquota, `brasil.regimes.${regime}.${produto}.aliquota`);
  // o IOF só é lido quando há resgate com menos de 30 dias, para não marcar pendência à toa
  const iof = () => r.valor(regra.iof, `brasil.regimes.${regime}.${produto}.iof`);
  return { aliquota, iof, base_legal: regra.base_legal };
}

/** Alíquota de um evento hipotético (usada também para o IR latente no patrimônio por ano). */
export function aliquotaEvento(
  produto: ProdutoId,
  regime: Regime,
  dias: number,
  P: ParametrosBrasil,
  r: Resolvedor,
): number {
  const { aliquota } = regraProduto(produto, regime, P, r);
  return aliquota === 'regressiva' ? aliquotaRegressiva(dias, r.valor(P.tabela_regressiva, 'brasil.tabela_regressiva')) : aliquota;
}

export function eventosBrasil(
  inst: Instrumento,
  fluxos: EventoFluxo[],
  regime: Regime,
  P: ParametrosBrasil,
  r: Resolvedor,
  m: Mercado,
  alertas: Set<string>,
): EventoBR[] {
  const { aliquota, iof, base_legal } = regraProduto(inst.pos.produto, regime, P, r);
  const out: EventoBR[] = [];
  for (const f of fluxos) {
    if (f.tipo === 'acumulo') continue;
    let base: number;
    let dias: number;
    if (f.tipo === 'cupom') {
      base = f.valor_brl;
      dias = f.d - inst.c;
      if (aliquota === 'regressiva') {
        const prazo = r.valor(P.cupons.prazo_light, 'brasil.cupons.prazo_light');
        if (prazo === 'desde_ultimo_cupom') dias = f.dias_desde_cupom;
      }
    } else {
      base = Math.max(0, f.valor_brl - f.custo_brl);
      dias = f.d - inst.c;
    }
    const aliq = aliquota === 'regressiva' ? aliquotaRegressiva(dias, r.valor(P.tabela_regressiva, 'brasil.tabela_regressiva')) : aliquota;

    let iofBrl = 0;
    if (f.d - inst.c < 30 && base > 0 && iof()) {
      try {
        const tab = r.valor(P.iof_regressivo, 'brasil.iof_regressivo');
        iofBrl = base * tab[Math.max(0, f.d - inst.c - 1)];
      } catch (e) {
        if (!(e instanceof ParametroAusente)) throw e;
        alertas.add('iof_nao_calculado');
      }
    }
    const irBrl = Math.max(0, base - iofBrl) * aliq;
    const cambio = m.cambio(f.d);
    const regra =
      aliquota === 'regressiva'
        ? `Tabela regressiva: ${dias} dias → ${(aliq * 100).toLocaleString('pt-BR')}% (${base_legal})`
        : `${(aliq * 100).toLocaleString('pt-BR')}% (${base_legal})`;
    out.push({
      posicao: inst.pos.id,
      produto: inst.pos.produto,
      regime,
      data: f.d,
      ano: anoDe(f.d),
      tipo: f.tipo,
      liquidacao: f.tipo === 'resgate' && f.liquidacao,
      valor_bruto_brl: f.valor_brl,
      base_brl: base,
      dias,
      aliquota: aliq,
      iof_brl: iofBrl,
      ir_brl: irBrl,
      liquido_brl: f.valor_brl - irBrl - iofBrl,
      cambio,
      ir_usd: irBrl / cambio,
      regra: `${regra} · ${iso(f.d)}`,
    });
  }
  return out;
}

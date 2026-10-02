// Imposto federal dos EUA: reconhecimento da renda brasileira, faixas, teto do crédito e NIIT.
import type { EventoFluxo, Instrumento } from './fluxos';
import type { Mercado } from './mercado';
import type { Faixa } from './tipos';

/* ---------- faixas ---------- */
export function impostoPorFaixas(renda: number, faixas: Faixa[]): number {
  if (renda <= 0) return 0;
  let imposto = 0;
  for (let i = 0; i < faixas.length; i++) {
    const ini = faixas[i].acima_de;
    const fim = i + 1 < faixas.length ? faixas[i + 1].acima_de : Infinity;
    if (renda > ini) imposto += (Math.min(renda, fim) - ini) * faixas[i].aliquota;
  }
  return imposto;
}

export function aliquotaMarginal(renda: number, faixas: Faixa[]): number {
  let a = faixas[0].aliquota;
  for (const f of faixas) if (renda > f.acima_de) a = f.aliquota;
  return a;
}

/** Faixas de anos seguintes: nominais (fator 1) ou corrigidas por uma inflação informada. */
export function faixasCorrigidas(faixas: Faixa[], fator: number): Faixa[] {
  return faixas.map((f) => ({ acima_de: f.acima_de * fator, aliquota: f.aliquota }));
}

/** Renda tributável em que a alíquota média atinge o alvo (busca binária; a média só cresce). */
export function rendaParaAliquotaMedia(alvo: number, faixas: Faixa[]): number {
  const topo = faixas[faixas.length - 1].aliquota;
  if (alvo >= topo) return Infinity;
  if (alvo <= faixas[0].aliquota) return 0;
  let lo = 0;
  let hi = 1e9;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (impostoPorFaixas(mid, faixas) / mid < alvo) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Imposto com ganhos de capital e dividendos qualificados empilhados sobre a renda ordinária. */
export function impostoRegular(rendaTotal: number, qualificados: number, faixas: Faixa[], faixasQualif: Faixa[] | null): number {
  if (qualificados <= 0 || !faixasQualif) return impostoPorFaixas(rendaTotal, faixas);
  const q = Math.min(qualificados, Math.max(0, rendaTotal));
  const ordinaria = rendaTotal - q;
  let impostoQ = 0;
  for (let i = 0; i < faixasQualif.length; i++) {
    const ini = Math.max(faixasQualif[i].acima_de, ordinaria);
    const fim = Math.min(i + 1 < faixasQualif.length ? faixasQualif[i + 1].acima_de : Infinity, rendaTotal);
    if (fim > ini) impostoQ += (fim - ini) * faixasQualif[i].aliquota;
  }
  return Math.min(impostoPorFaixas(ordinaria, faixas) + impostoQ, impostoPorFaixas(rendaTotal, faixas));
}

/* ---------- reconhecimento da renda brasileira nos EUA ---------- */
export interface RendaEUAAno {
  juros_usd: number; // juros, OID e cupons: fonte estrangeira, categoria passiva
  cambio_usd: number; // §988: renda ordinária de fonte americana
}

/**
 * Percorre os fluxos de uma aplicação desde a compra.
 * - Prazo de emissão acima de 1 ano: OID ano a ano pelo câmbio médio do período; cupom no recebimento.
 * - Prazo de emissão até 1 ano: juros só no resgate ou vencimento (pessoa física, regime de caixa).
 * - Câmbio §988: no principal e nos juros apropriados, em cada pagamento.
 */
export function reconhecimentoEUA(inst: Instrumento, fluxos: EventoFluxo[], m: Mercado): Map<number, RendaEUAAno> {
  const out = new Map<number, RendaEUAAno>();
  const add = (ano: number, campo: keyof RendaEUAAno, v: number) => {
    const x = out.get(ano) ?? { juros_usd: 0, cambio_usd: 0 };
    x[campo] += v;
    out.set(ano, x);
  };
  const spotCompra = m.cambio(inst.c);
  let custoUsd = inst.P / spotCompra;
  let r = 1;
  for (const f of fluxos) {
    if (f.tipo === 'acumulo') {
      if (inst.curtoPrazo) continue;
      const oidUsd = (f.variacao_brl - f.corrido_delta_brl) / m.cambioMedio(f.a, f.b);
      add(f.ano, 'juros_usd', oidUsd);
      custoUsd += oidUsd;
      continue;
    }
    const spot = m.cambio(f.d);
    if (f.tipo === 'cupom') {
      let juros = f.valor_brl;
      if (f.corrido_compra_brl > 0) {
        // juros corridos pagos na compra: devolução de capital, não renda
        juros -= f.corrido_compra_brl;
        const liberado = f.corrido_compra_brl / spotCompra;
        add(f.ano, 'cambio_usd', f.corrido_compra_brl / spot - liberado);
        custoUsd -= liberado;
      }
      add(f.ano, 'juros_usd', juros / spot);
      continue;
    }
    // resgate ou vencimento
    if (inst.curtoPrazo) {
      add(f.ano, 'juros_usd', (f.valor_brl - f.custo_brl) / spot);
      const liberado = f.custo_brl / spotCompra;
      add(f.ano, 'cambio_usd', f.custo_brl / spot - liberado);
      custoUsd -= liberado;
    } else {
      add(f.ano, 'juros_usd', f.corrido_brl / spot);
      const liberado = (custoUsd * f.fracao) / r;
      add(f.ano, 'cambio_usd', (f.valor_brl - f.corrido_brl) / spot - liberado);
      custoUsd -= liberado;
    }
    r -= f.fracao;
  }
  return out;
}

/* ---------- imposto do ano, teto do crédito e NIIT ---------- */
export interface EntradaFederalAno {
  base_tributavel: number; // renda tributável sem o Brasil (já inclui outras rendas estrangeiras)
  deducao: number; // dedução padrão ou itemizadas
  outras_rendas_estrangeiras: number; // passivas, de outros países
  juros_brasil_usd: number;
  cambio_usd: number;
  qualificados: number;
}

export interface FederalAno {
  renda_tributavel_total: number;
  renda_bruta_total: number;
  renda_estrangeira_bruta: number;
  deducao_alocada: number;
  renda_estrangeira_tributavel: number;
  imposto_regular: number;
  teto: number;
}

/** Teto = IR regular antes dos créditos × renda tributável estrangeira ÷ renda tributável total (§904(a)). */
export function federalAno(e: EntradaFederalAno, faixas: Faixa[], faixasQualif: Faixa[] | null): FederalAno {
  const tributavel = Math.max(0, e.base_tributavel + e.juros_brasil_usd + e.cambio_usd);
  const imposto = impostoRegular(tributavel, e.qualificados, faixas, faixasQualif);
  const brutaEstrangeira = e.juros_brasil_usd + e.outras_rendas_estrangeiras;
  const brutaTotal = Math.max(e.base_tributavel + e.deducao + e.juros_brasil_usd + Math.max(0, e.cambio_usd), brutaEstrangeira);
  const alocada = brutaTotal > 0 ? (e.deducao * Math.max(0, brutaEstrangeira)) / brutaTotal : 0;
  const tributavelEstrangeira = Math.min(Math.max(0, brutaEstrangeira - alocada), tributavel);
  const teto = tributavel > 0 ? Math.min(imposto, (imposto * tributavelEstrangeira) / tributavel) : 0;
  return {
    renda_tributavel_total: tributavel,
    renda_bruta_total: brutaTotal,
    renda_estrangeira_bruta: brutaEstrangeira,
    deducao_alocada: alocada,
    renda_estrangeira_tributavel: tributavelEstrangeira,
    imposto_regular: imposto,
    teto,
  };
}

/** NIIT: alíquota × menor valor entre a renda de investimentos e o excesso da MAGI sobre o limiar. */
export function niit(rendaInvestimentos: number, magi: number, limiar: number, aliquota: number): number {
  return aliquota * Math.max(0, Math.min(rendaInvestimentos, magi - limiar));
}

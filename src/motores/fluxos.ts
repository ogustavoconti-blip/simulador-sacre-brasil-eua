// Modelo de cada aplicação em reais: valor na curva, cupons, resgates e vencimento.
//
// Três modelos:
// - simples: sem cupom; valor = aplicado × fator acumulado (indexador × taxa).
// - flutuante com cupom (% do CDI, CDI + taxa, Selic + taxa): cada cupom paga o rendimento do período
//   e o valor volta ao principal (título ao par).
// - precificado com cupom (prefixado, IPCA + taxa): valor = valor presente dos fluxos à taxa de compra.
//   Cupom = taxa de cupom do título (Tesouro, por parâmetro) ou, sem ela, a própria taxa (ao par).
// Venda antes do vencimento: pela curva contratada, sem marcação a mercado (premissa).
import { addMeses, anoDe, dia, inicioAno, type Dia } from './calendario';
import type { Mercado } from './mercado';
import type { Posicao } from './tipos';

export type Modelo = 'simples' | 'flutuante' | 'precificado';

export interface Instrumento {
  pos: Posicao;
  c: Dia; // compra
  T: Dia; // vencimento
  emissao: Dia;
  emissaoAproximada: boolean;
  P: number; // valor aplicado (custo no Brasil)
  modelo: Modelo;
  curtoPrazo: boolean; // prazo de emissão até o limite do §1283(a)(1)(A)
  datasCupom: Dia[]; // crescente; inclui T quando há cupom
  valorCheio(d: Dia): number; // antes dos pagamentos do dia d (fração 1)
  valorEx(d: Dia): number; // depois do cupom do dia d
  cupom(d: Dia): number;
  cupomCorridoCheio(d: Dia): number;
  cupomCorridoEx(d: Dia): number;
  cupomAnterior(d: Dia): Dia; // último cupom antes de d (ou a compra)
}

export function criaInstrumento(
  pos: Posicao,
  m: Mercado,
  opcoes: { curtoPrazoMeses: number; taxaCupom?: number | null },
): Instrumento {
  const c = dia(pos.data_compra);
  const T = dia(pos.data_vencimento);
  if (T <= c) throw new Error(`Aplicação ${pos.id}: vencimento deve ser posterior à compra.`);
  const emissao = pos.data_emissao ? dia(pos.data_emissao) : c;
  const P = pos.valor_aplicado_brl;
  const ix = pos.indexador;
  const taxa = pos.taxa;

  const indice = (a: Dia, b: Dia): number => {
    switch (ix) {
      case 'pre':
        return 1;
      case 'ipca_mais':
        return m.fatorIPCA(a, b);
      case 'cdi':
        return Math.pow(m.fatorCDI(a, b), taxa / 100);
      case 'cdi_mais':
        return m.fatorCDI(a, b);
      case 'selic_mais':
        return m.fatorSelic(a, b);
    }
  };
  const juroFixo = (a: Dia, b: Dia) => (ix === 'cdi' ? 1 : Math.pow(1 + taxa / 100, (b - a) / 365));
  const G = (a: Dia, b: Dia) => indice(a, b) * juroFixo(a, b);

  const meses = pos.pagamento.tipo === 'cupom' ? pos.pagamento.meses : 0;
  const datasCupom: Dia[] = [];
  if (meses > 0) {
    for (let k = 0; ; k++) {
      const t = addMeses(T, -meses * k);
      if (t <= c) break;
      datasCupom.unshift(t);
    }
  }
  const ehCupom = new Set(datasCupom);
  const anterior = (d: Dia, incluiD: boolean) => {
    let t = c;
    for (const x of datasCupom) if (x < d || (incluiD && x === d)) t = x;
    return t;
  };
  const proximo = (d: Dia) => datasCupom.find((x) => x >= d) ?? T;

  const curtoPrazo = addMeses(emissao, opcoes.curtoPrazoMeses) >= T;
  const lim = (d: Dia) => Math.min(Math.max(d, c), T);

  const base = {
    pos,
    c,
    T,
    emissao,
    emissaoAproximada: !pos.data_emissao,
    P,
    curtoPrazo,
    datasCupom,
    cupomAnterior: (d: Dia) => anterior(d, false),
  };

  if (meses === 0) {
    const v = (d: Dia) => P * G(c, lim(d));
    return { ...base, modelo: 'simples', valorCheio: v, valorEx: v, cupom: () => 0, cupomCorridoCheio: () => 0, cupomCorridoEx: () => 0 };
  }

  if (ix === 'cdi' || ix === 'cdi_mais' || ix === 'selic_mais') {
    const cheio = (d: Dia) => P * G(anterior(lim(d), false), lim(d));
    const ex = (d: Dia) => P * G(anterior(lim(d), true), lim(d));
    return {
      ...base,
      modelo: 'flutuante',
      valorCheio: cheio,
      valorEx: ex,
      cupom: (d) => (ehCupom.has(d) ? P * (G(anterior(d, false), d) - 1) : 0),
      cupomCorridoCheio: (d) => cheio(d) - P,
      cupomCorridoEx: (d) => ex(d) - P,
    };
  }

  // precificado: prefixado ou IPCA + taxa
  const y = taxa / 100;
  const cp = Math.pow(1 + (opcoes.taxaCupom ?? taxa) / 100, meses / 12) - 1;
  const v = (d: Dia, t: Dia) => Math.pow(1 + y, -(t - d) / 365);
  const pu = (d: Dia, incluiCupomDoDia: boolean) => {
    let s = v(d, T);
    for (const t of datasCupom) if (t > d || (incluiCupomDoDia && t === d)) s += cp * v(d, t);
    return s;
  };
  const Iidx = (a: Dia, b: Dia) => (ix === 'ipca_mais' ? m.fatorIPCA(a, b) : 1);
  const F = P / pu(c, false);
  const corrido = (d: Dia) => {
    const prox = proximo(d);
    const ini = addMeses(prox, -meses);
    const frac = Math.min(Math.max((d - ini) / (prox - ini), 0), 1);
    return F * Iidx(c, d) * cp * frac;
  };
  return {
    ...base,
    modelo: 'precificado',
    valorCheio: (d) => F * Iidx(c, lim(d)) * pu(lim(d), true),
    valorEx: (d) => F * Iidx(c, lim(d)) * pu(lim(d), false),
    cupom: (d) => (ehCupom.has(d) ? F * Iidx(c, d) * cp : 0),
    cupomCorridoCheio: (d) => corrido(lim(d)),
    cupomCorridoEx: (d) => (ehCupom.has(lim(d)) ? 0 : corrido(lim(d))),
  };
}

/* ---------- fluxos de uma aplicação sob um cronograma de resgates ---------- */
export interface ResgateProgramado {
  d: Dia;
  fracao: number; // fração da posição original
}

export type EventoFluxo =
  | { tipo: 'acumulo'; a: Dia; b: Dia; ano: number; fracao: number; variacao_brl: number; corrido_delta_brl: number }
  | { tipo: 'cupom'; d: Dia; ano: number; fracao: number; valor_brl: number; dias_desde_cupom: number; corrido_compra_brl: number }
  | {
      tipo: 'resgate' | 'vencimento';
      d: Dia;
      ano: number;
      fracao: number;
      valor_brl: number;
      custo_brl: number;
      corrido_brl: number;
      liquidacao: boolean; // resgate hipotético no fim do horizonte
    };

/**
 * Gera os fluxos a partir da compra. Os anos anteriores ao início da simulação também são
 * percorridos (para montar o custo em dólar), e quem consome decide o que reportar.
 * @param L dia da liquidação hipotética no fim do horizonte (se a aplicação ainda existir)
 */
export function geraFluxos(inst: Instrumento, resgates: ResgateProgramado[], L: Dia): EventoFluxo[] {
  const { c, T } = inst;
  const fim = Math.min(T, L);
  const pontos = new Set<Dia>();
  for (let a = anoDe(c) + 1; inicioAno(a) <= fim; a++) pontos.add(inicioAno(a));
  for (const t of inst.datasCupom) if (t <= fim) pontos.add(t);
  for (const r of resgates) if (r.d > c && r.d < T && r.d <= L) pontos.add(r.d);
  pontos.add(fim);
  const ordenados = [...pontos].filter((d) => d > c).sort((a, b) => a - b);

  const resgPorDia = new Map<Dia, number>();
  for (const r of resgates) if (r.d > c && r.d < T && r.d <= L) resgPorDia.set(r.d, (resgPorDia.get(r.d) ?? 0) + r.fracao);

  const out: EventoFluxo[] = [];
  let r = 1;
  let ant = c;
  let primeiroCupom = true;
  const corridoCompra = inst.cupomCorridoEx(c);
  for (const d of ordenados) {
    if (r <= 1e-12) break;
    out.push({
      tipo: 'acumulo',
      a: ant,
      b: d,
      ano: anoDe(ant),
      fracao: r,
      variacao_brl: r * (inst.valorCheio(d) - inst.valorEx(ant)),
      corrido_delta_brl: r * (inst.cupomCorridoCheio(d) - inst.cupomCorridoEx(ant)),
    });
    const cup = inst.cupom(d);
    if (cup > 0) {
      out.push({
        tipo: 'cupom',
        d,
        ano: anoDe(d),
        fracao: r,
        valor_brl: r * cup,
        dias_desde_cupom: d - inst.cupomAnterior(d),
        corrido_compra_brl: primeiroCupom ? r * corridoCompra : 0,
      });
      primeiroCupom = false;
    }
    if (d === T) {
      out.push({ tipo: 'vencimento', d, ano: anoDe(d), fracao: r, valor_brl: r * inst.valorEx(d), custo_brl: r * inst.P, corrido_brl: 0, liquidacao: false });
      r = 0;
    } else {
      const q = Math.min(resgPorDia.get(d) ?? 0, r);
      if (q > 1e-12) {
        out.push({ tipo: 'resgate', d, ano: anoDe(d), fracao: q, valor_brl: q * inst.valorEx(d), custo_brl: q * inst.P, corrido_brl: q * inst.cupomCorridoEx(d), liquidacao: false });
        r -= q;
      }
      if (d === L && r > 1e-12) {
        out.push({ tipo: 'resgate', d, ano: anoDe(d), fracao: r, valor_brl: r * inst.valorEx(d), custo_brl: r * inst.P, corrido_brl: r * inst.cupomCorridoEx(d), liquidacao: true });
        r = 0;
      }
    }
    ant = d;
  }
  return out;
}

/** Fração ainda aplicada depois de todos os eventos até o dia d (inclusive). */
export function fracaoEm(fluxos: EventoFluxo[], d: Dia): number {
  let r = 1;
  for (const e of fluxos) if ((e.tipo === 'resgate' || e.tipo === 'vencimento') && e.d <= d) r -= e.fracao;
  return Math.max(0, r);
}

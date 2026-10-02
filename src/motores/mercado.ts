// Trajetória de mercado: histórico real do BCB até a data de referência e projeção depois.
// CDI, Selic e IPCA viram fatores acumulados diários; o câmbio vira uma série diária.
import { anoDe, dia, fimAno, type Dia } from './calendario';
import type { PontoTrajetoria } from './tipos';

export interface Historico {
  cdi_diario?: [string, number][]; // % ao dia (SGS 12)
  selic_diaria?: [string, number][]; // % ao dia (SGS 11)
  ipca_mensal?: [string, number][]; // AAAA-MM-01, % no mês (SGS 433)
  ptax?: [string, number][]; // R$ por US$, venda (SGS 1)
}

export interface Estatistica {
  mediana: number;
  media?: number;
  desvio?: number;
  minimo?: number;
  maximo?: number;
  respondentes?: number;
}

export interface DadosMercado {
  gerado_em: string;
  hoje: string; // data de referência dos dados
  cambio_hoje: number;
  selic_hoje: number; // meta Selic, % a.a.
  spread_cdi_selic: number; // p.p.: Selic menos CDI, média de 12 meses
  fontes?: Record<string, string>;
  historico: Historico;
  focus?: {
    data_coleta: string;
    anos: { ano: number; selic: Estatistica; ipca: Estatistica; cambio: Estatistica }[];
  };
}

export interface AnoMercado {
  ano: number;
  selic_media: number; // % a.a.
  cdi: number; // % a.a.
  ipca: number; // % no ano
  cambio_fim: number; // R$ por US$
  origem: 'focus' | 'usuario' | 'mantido';
}

/**
 * Converte pontos anuais (Selic no fim do ano, IPCA, câmbio) em médias anuais.
 * Selic média do ano = média entre o início e o fim do ano (trajetória linear).
 * CDI = Selic média menos o diferencial, salvo se o ponto trouxer o CDI.
 * Anos sem ponto mantêm o último valor (premissa).
 */
export function trajetoriaAnual(
  pontos: PontoTrajetoria[],
  selicInicio: number,
  spread: number,
  anoIni: number,
  anoFim: number,
  origem: 'focus' | 'usuario',
): AnoMercado[] {
  if (!pontos.length) throw new Error('Trajetória sem pontos.');
  const ordenados = [...pontos].sort((a, b) => a.ano - b.ano);
  const out: AnoMercado[] = [];
  let selicAnterior = selicInicio;
  for (let ano = anoIni; ano <= anoFim; ano++) {
    const exato = ordenados.find((p) => p.ano === ano);
    const p = exato ?? [...ordenados].reverse().find((q) => q.ano < ano) ?? ordenados[0];
    const selicMedia = (selicAnterior + p.selic_fim) / 2;
    out.push({
      ano,
      selic_media: selicMedia,
      cdi: exato?.cdi ?? selicMedia - spread,
      ipca: p.ipca,
      cambio_fim: p.cambio_fim,
      origem: exato ? origem : 'mantido',
    });
    selicAnterior = p.selic_fim;
  }
  return out;
}

export function trajetoriaFocus(dados: DadosMercado, anoIni: number, anoFim: number): AnoMercado[] {
  if (!dados.focus?.anos.length) throw new Error('Dados do Focus ausentes.');
  const pontos = dados.focus.anos.map((a) => ({
    ano: a.ano,
    selic_fim: a.selic.mediana,
    ipca: a.ipca.mediana,
    cambio_fim: a.cambio.mediana,
  }));
  return trajetoriaAnual(pontos, dados.selic_hoje, dados.spread_cdi_selic, anoIni, anoFim, 'focus');
}

export interface Mercado {
  hoje: Dia;
  anos: AnoMercado[];
  fatorCDI(d0: Dia, d1: Dia): number;
  fatorSelic(d0: Dia, d1: Dia): number;
  fatorIPCA(d0: Dia, d1: Dia): number;
  cambio(d: Dia): number;
  cambioMedio(d0: Dia, d1: Dia): number;
  aproximacoes: Set<string>;
}

const diasNoMes = (d: Dia) => {
  const dt = new Date(d * 86_400_000);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
};
const chaveMes = (d: Dia) => new Date(d * 86_400_000).toISOString().slice(0, 7);

export function criaMercado(
  dados: { hoje: string; cambio_hoje: number; historico: Historico },
  anos: AnoMercado[],
  dIni: Dia,
  dFim: Dia,
): Mercado {
  if (!anos.length) throw new Error('Trajetória anual vazia.');
  const hoje = dia(dados.hoje);
  const aprox = new Set<string>();
  const porAno = new Map(anos.map((a) => [a.ano, a]));
  const anoProj = (d: Dia) => {
    const y = anoDe(d);
    return porAno.get(y) ?? (y < anos[0].ano ? anos[0] : anos[anos.length - 1]);
  };

  const serie = (pares?: [string, number][]) => {
    const m = new Map<Dia, number>();
    let min = Infinity;
    let max = -Infinity;
    for (const [s, v] of pares ?? []) {
      const d = dia(s);
      m.set(d, v);
      if (d < min) min = d;
      if (d > max) max = d;
    }
    return { m, min, max };
  };
  const cdiH = serie(dados.historico.cdi_diario);
  const selicH = serie(dados.historico.selic_diaria);
  const ptaxH = serie(dados.historico.ptax);
  const ipcaH = new Map((dados.historico.ipca_mensal ?? []).map(([s, v]) => [s.slice(0, 7), v]));

  // âncoras do câmbio projetado: hoje e o fim de cada ano projetado
  const ancoras: [Dia, number][] = [[hoje, dados.cambio_hoje]];
  for (const a of anos) {
    const f = fimAno(a.ano);
    if (f > hoje) ancoras.push([f, a.cambio_fim]);
  }
  const cambioProjetado = (d: Dia) => {
    if (d <= ancoras[0][0]) return ancoras[0][1];
    for (let i = 1; i < ancoras.length; i++) {
      const [d1, v1] = ancoras[i];
      if (d <= d1) {
        const [d0, v0] = ancoras[i - 1];
        return v0 + ((v1 - v0) * (d - d0)) / (d1 - d0);
      }
    }
    return ancoras[ancoras.length - 1][1];
  };

  const n = dFim - dIni + 2;
  const cum = { cdi: new Float64Array(n + 1), selic: new Float64Array(n + 1), ipca: new Float64Array(n + 1), fx: new Float64Array(n + 1) };
  const fx = new Float64Array(n);
  let ultimoPtax = dados.cambio_hoje;
  for (let i = 0; i < n; i++) {
    const d = dIni + i;
    const p = anoProj(d);
    let lnCdi: number;
    let lnSelic: number;
    let lnIpca: number;
    let cambio: number;
    if (d < hoje) {
      if (d >= cdiH.min && d <= cdiH.max) lnCdi = Math.log1p((cdiH.m.get(d) ?? 0) / 100);
      else {
        lnCdi = Math.log1p(p.cdi / 100) / 365;
        aprox.add('historico_cdi');
      }
      if (d >= selicH.min && d <= selicH.max) lnSelic = Math.log1p((selicH.m.get(d) ?? 0) / 100);
      else {
        lnSelic = Math.log1p(p.cdi / 100) / 365;
        aprox.add('historico_selic');
      }
      const mes = ipcaH.get(chaveMes(d));
      if (mes !== undefined) lnIpca = Math.log1p(mes / 100) / diasNoMes(d);
      else {
        lnIpca = Math.log1p(p.ipca / 100) / 365;
        aprox.add('historico_ipca');
      }
      if (d >= ptaxH.min && d <= ptaxH.max) {
        ultimoPtax = ptaxH.m.get(d) ?? ultimoPtax;
        cambio = ultimoPtax;
      } else {
        cambio = d > ptaxH.max ? ultimoPtax : dados.cambio_hoje;
        aprox.add('historico_cambio');
      }
    } else {
      lnCdi = Math.log1p(p.cdi / 100) / 365;
      // Selic efetiva (over) ≈ CDI: a meta fica cerca de 0,10 p.p. acima das duas (premissa)
      lnSelic = Math.log1p(p.cdi / 100) / 365;
      lnIpca = Math.log1p(p.ipca / 100) / 365;
      cambio = cambioProjetado(d);
    }
    fx[i] = cambio;
    cum.cdi[i + 1] = cum.cdi[i] + lnCdi;
    cum.selic[i + 1] = cum.selic[i] + lnSelic;
    cum.ipca[i + 1] = cum.ipca[i] + lnIpca;
    cum.fx[i + 1] = cum.fx[i] + cambio;
  }

  const idx = (d: Dia) => {
    if (d < dIni || d > dFim + 1) aprox.add('fora_do_intervalo');
    return Math.min(Math.max(d - dIni, 0), n);
  };
  const fator = (c: Float64Array) => (d0: Dia, d1: Dia) => Math.exp(c[idx(d1)] - c[idx(d0)]);

  return {
    hoje,
    anos,
    fatorCDI: fator(cum.cdi),
    fatorSelic: fator(cum.selic),
    fatorIPCA: fator(cum.ipca),
    cambio: (d) => fx[Math.min(idx(d), n - 1)],
    cambioMedio: (d0, d1) => (d1 > d0 ? (cum.fx[idx(d1)] - cum.fx[idx(d0)]) / (idx(d1) - idx(d0) || 1) : fx[Math.min(idx(d0), n - 1)]),
    aproximacoes: aprox,
  };
}

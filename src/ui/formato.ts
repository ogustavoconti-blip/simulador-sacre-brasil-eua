// Formatação em pt-BR e leitura de números e datas digitados.

const nf = (min: number, max: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
const f0 = nf(0, 0);
const f1 = nf(1, 1);
const f2 = nf(2, 2);
const fAte1 = nf(0, 1);
const fAte2 = nf(0, 2);

export const fmt0 = (v: number) => f0.format(Math.round(v) || 0);
export const fmt1 = (v: number) => f1.format(v);
export const fmt2 = (v: number) => f2.format(v);
export const fmtAte1 = (v: number) => fAte1.format(v);
export const fmtAte2 = (v: number) => fAte2.format(v);
export const fmtPct = (v: number | null | undefined, casas = 1) => (v === null || v === undefined || !isFinite(v) ? '—' : (casas === 1 ? f1 : f2).format(v * 100) + '%');

export type Moeda = 'USD' | 'BRL';
export const simbolo = (m: Moeda) => (m === 'USD' ? 'US$' : 'R$');

/** Valor com símbolo, arredondado (dólar à unidade; real à dezena). */
export function dinheiro(v: number, m: Moeda, sinal = false): string {
  const a = Math.abs(v);
  const n = m === 'USD' ? Math.round(a) : Math.round(a / 10) * 10;
  const s = v < -0.5 ? '−' : sinal && v > 0.5 ? '+' : '';
  return `${s}${simbolo(m)} ${f0.format(n)}`;
}

/** Valor grande em mil ou milhão: [número, unidade]. */
export function grande(v: number): [string, string] {
  const a = Math.abs(v);
  const s = v < -0.5 ? '−' : '';
  if (a >= 1e6) return [s + f2.format(a / 1e6), 'mi'];
  return [s + f1.format(a / 1e3), 'mil'];
}

/** Lê "120.000", "7,20", "1.234,56", "102". Vazio ou inválido → NaN. */
export function lerNumero(s: string): number {
  const t = (s ?? '').trim().replace(/\s/g, '');
  if (!t) return NaN;
  const limpo = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t;
  const n = Number(limpo.replace(/[^\d.-]/g, ''));
  return isFinite(n) ? n : NaN;
}

/** "17/03/2025" → "2025-03-17" (ou null se inválida). */
export function lerData(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s ?? '').trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

export const isoParaBR = (iso: string) => iso.split('-').reverse().join('/');
export const mesAno = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Máscara simples para datas digitadas: insere as barras. */
export function mascaraData(s: string): string {
  const d = s.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Formata número digitado com separador de milhar ao sair do campo. */
export const milhar = (s: string) => {
  const n = lerNumero(s);
  return isFinite(n) ? f0.format(n) : s;
};

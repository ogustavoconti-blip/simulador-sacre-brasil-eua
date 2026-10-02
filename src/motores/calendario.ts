// Datas como número de dias desde 1970-01-01 (UTC), para contas sem fuso horário.

export type Dia = number;

const MS = 86_400_000;

export function dia(iso: string): Dia {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS);
}

export function iso(d: Dia): string {
  return new Date(d * MS).toISOString().slice(0, 10);
}

export function isoValido(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(dia(s)) === s;
}

export const anoDe = (d: Dia): number => new Date(d * MS).getUTCFullYear();
export const inicioAno = (ano: number): Dia => Math.round(Date.UTC(ano, 0, 1) / MS);
export const fimAno = (ano: number): Dia => inicioAno(ano + 1) - 1;

/** Soma meses mantendo o dia do mês (ou o último dia, se o mês for mais curto). */
export function addMeses(d: Dia, meses: number): Dia {
  const dt = new Date(d * MS);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + meses;
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Math.round(Date.UTC(y, m, Math.min(dt.getUTCDate(), ultimo)) / MS);
}

export const meioDoAno = (ano: number): Dia => Math.round(Date.UTC(ano, 6, 1) / MS);

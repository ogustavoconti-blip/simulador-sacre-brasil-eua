// Imposto estadual. Modo A: estado sem imposto sobre juros e dividendos (zero, com fonte).
// Modo B: qualquer outro estado; só a alíquota estimada pelo usuário, sem crédito pelo IR brasileiro.
import type { Resolvedor } from './parametros';
import type { ParametrosEstado } from './tipos';

export type SeloEstado = 'incluido' | 'estimado' | 'nao_incluido';

export interface ResultadoEstadual {
  modo: 'A' | 'B';
  selo: SeloEstado;
  valor: number;
  observacoes: string[];
}

export function modoDoEstado(sigla: string, estados: Record<string, ParametrosEstado>): 'A' | 'B' {
  return estados[sigla] ? 'A' : 'B';
}

/**
 * @param rendaBrasilUsd renda dos investimentos no Brasil reconhecida nos EUA no ano
 *        (juros, OID e câmbio §988); valores negativos não geram imposto
 */
export function impostoEstadual(
  sigla: string,
  estados: Record<string, ParametrosEstado>,
  aliquotaEstimada: number | null,
  rendaBrasilUsd: number,
  r: Resolvedor,
): ResultadoEstadual {
  const est = estados[sigla];
  if (est) {
    const tributa = r.valor(est.tem_imposto_juros_dividendos, `estados.${sigla}.tem_imposto_juros_dividendos`);
    if (tributa) throw new Error(`Estado ${sigla} está no Modo A, mas o parâmetro indica imposto sobre juros e dividendos.`);
    return { modo: 'A', selo: 'incluido', valor: 0, observacoes: est.observacoes };
  }
  if (aliquotaEstimada === null || aliquotaEstimada === undefined) {
    return { modo: 'B', selo: 'nao_incluido', valor: 0, observacoes: [] };
  }
  return { modo: 'B', selo: 'estimado', valor: (Math.max(0, rendaBrasilUsd) * aliquotaEstimada) / 100, observacoes: [] };
}

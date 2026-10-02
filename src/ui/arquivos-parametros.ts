// Arquivos de parâmetros que o site carrega. É o único lugar a mudar na atualização anual
// (docs/ATUALIZACAO_ANUAL.md) e na inclusão de um estado do Modo A (docs/NOVO_ESTADO.md).

/** Parâmetros federais do ano vigente, em public/parametros/. */
export const ARQUIVO_FEDERAL = 'eua_federal_2026.json';

/** Estados do Modo A: sem imposto estadual sobre juros e dividendos, com fonte oficial conferida.
 *  Cada sigla tem o seu public/parametros/estados/<SIGLA>.json. */
export const ESTADOS_MODO_A = ['FL', 'TX', 'NV', 'WY', 'SD', 'AK', 'TN', 'NH', 'WA'];

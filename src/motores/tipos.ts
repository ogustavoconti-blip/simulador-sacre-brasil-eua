// Tipos compartilhados pelos motores. Nenhum import de interface (React/DOM).

/* ---------- parâmetros rastreáveis ---------- */
export type Status = 'confirmado' | 'pendente';

export interface Meta {
  fonte: string;
  url: string;
  data_verificacao: string; // AAAA-MM-DD
  nota?: string;
}
export interface Confirmado<T> extends Meta {
  status: 'confirmado';
  valor: T;
}
export interface Interpretacao<T> {
  id: string;
  rotulo: string;
  valor: T;
}
export interface Pendente<T> extends Meta {
  status: 'pendente';
  id: string; // identificador estável, usado para escolher a interpretação
  rotulo: string; // nome curto da regra, para a tela
  interpretacoes: Interpretacao<T>[];
}
export type Param<T> = Confirmado<T> | Pendente<T>;

/* ---------- domínio ---------- */
export type Filing = 'single' | 'mfj' | 'mfs' | 'hoh';
export type Regime = 'light' | 'full';

export const PRODUTOS = [
  'tesouro_selic',
  'tesouro_pre',
  'tesouro_pre_cupom',
  'tesouro_ipca',
  'tesouro_ipca_cupom',
  'cdb_pre',
  'cdb_cdi',
  'cdb_ipca',
  'lci',
  'lca',
  'cri',
  'cra',
  'debenture',
  'debenture_incentivada',
] as const;
export type ProdutoId = (typeof PRODUTOS)[number];

export type Indexador = 'pre' | 'cdi' | 'cdi_mais' | 'selic_mais' | 'ipca_mais';

export interface Faixa {
  acima_de: number;
  aliquota: number;
}
export interface FaixaRegressiva {
  ate_dias: number | null; // null = acima do último limite
  aliquota: number;
}
export interface FaixaParcela {
  ate: number | null; // limite superior da parcela; null = sem limite
  aliquota: number;
}

/* ---------- parâmetros: Brasil ---------- */
export type AliquotaBR = number | 'regressiva';
export interface RegraBR {
  aliquota: Param<AliquotaBR>;
  iof: Param<boolean>;
  base_legal: string;
}
export interface ParametrosBrasil {
  versao: string;
  revisado_em: string;
  tabela_regressiva: Param<FaixaRegressiva[]>;
  iof_regressivo: Param<number[]> | null; // 30 posições: índice i = resgate com i+1 dias corridos
  regimes: Record<Regime, Record<ProdutoId, RegraBR>>;
  cupons: {
    prazo_light: Param<'desde_compra' | 'desde_ultimo_cupom'>;
    taxa_cupom_tesouro: {
      tesouro_pre_cupom: Param<number> | null; // % a.a.
      tesouro_ipca_cupom: Param<number> | null; // % a.a.
    };
  };
  imoveis: {
    ganho_capital: Param<FaixaParcela[]>;
  };
}

/* ---------- parâmetros: EUA federal ---------- */
export interface ParametrosEUA {
  ano: number;
  faixas: Record<Filing, Param<Faixa[]> | null>;
  deducao_padrao: Record<Filing, Param<number> | null>;
  ganho_capital_qualificado: Record<Filing, Param<Faixa[]> | null> | null;
  niit: {
    aliquota: Param<number>;
    limiar_magi: Record<Filing, Param<number>>;
    inclui_cambio_988: Param<boolean>;
  };
  credito: {
    carryback_anos: Param<number>;
    carryforward_anos: Param<number>;
  };
  curto_prazo_meses: Param<number>; // §1283(a)(1)(A): prazo de emissão máximo
  // dedução do imposto de renda estrangeiro: itemizada, fora do teto do SALT (§164(b)(6), última frase)
  deducao_imposto_estrangeiro: Param<'itemizada_fora_do_teto_salt'>;
}

/* ---------- parâmetros: estados ---------- */
export interface ParametrosEstado {
  sigla: string;
  nome: string;
  modo: 'A';
  tem_imposto_juros_dividendos: Param<boolean>;
  observacoes: string[];
  // modelo completo, já tipado, nulo nesta versão (inclusão futura = só JSON e testes)
  base_inicial: Param<string> | null;
  faixas: Record<Filing, Param<Faixa[]>> | null;
  deducoes: Param<unknown> | null;
  juros_estrangeiros: Param<'tributa' | 'isenta'> | null;
  credito_imposto_estrangeiro: Param<'nao' | 'sim' | 'parcial'> | null;
  impostos_locais: Param<unknown> | null;
  residencia: Param<unknown> | null;
  ganho_capital_especifico: Param<unknown> | null;
}

export interface Parametros {
  brasil: ParametrosBrasil;
  eua: ParametrosEUA;
  estados: Record<string, ParametrosEstado>; // só os estados do Modo A
}

/* ---------- entrada da simulação (só em memória) ---------- */
export type Pagamento = { tipo: 'vencimento' } | { tipo: 'cupom'; meses: number };
export type Liquidez = { tipo: 'diaria' } | { tipo: 'vencimento' } | { tipo: 'carencia'; ate: string };
export type PlanoResgate =
  | { tipo: 'vencimento' }
  | { tipo: 'sugerir' }
  | { tipo: 'total'; data: string }
  | { tipo: 'parcial'; resgates: { data: string; fracao: number }[] };

export interface Posicao {
  id: string;
  produto: ProdutoId;
  valor_aplicado_brl: number;
  data_compra: string;
  data_vencimento: string;
  data_emissao?: string;
  indexador: Indexador;
  taxa: number; // % a.a. (pré, spread) ou % do CDI
  pagamento: Pagamento;
  liquidez: Liquidez;
  plano: PlanoResgate;
}

export interface Perfil {
  estado: string; // sigla
  filing: Filing;
  renda_tributavel_usd: number; // sem os investimentos do Brasil
  aliquota_estadual_estimada: number | null; // % — só Modo B
  avancado?: {
    itemizadas_usd?: number;
    outras_rendas_passivas_usd?: number; // já incluídas na renda tributável
    outros_impostos_estrangeiros_usd?: number;
    saldo_credito_existente?: { ano_origem: number; valor_usd: number }[];
    teto_livre_ano_anterior_usd?: number;
    ganhos_qualificados_usd?: number;
    outras_rendas_investimento_usd?: number; // para o NIIT
  };
}

export interface PontoTrajetoria {
  ano: number;
  selic_fim: number; // % a.a. no fim do ano
  ipca: number; // % no ano
  cambio_fim: number; // R$ por US$ no fim do ano
  cdi?: number; // % a.a., média do ano; se ausente, derivado da Selic
}

export type Reinvestimento = { tipo: 'nenhum' }; // espaço reservado para opções futuras

export interface Cenario {
  tipo: 'focus' | 'personalizado';
  trajetoria: PontoTrajetoria[];
  horizonte_anos: number; // 1 a 15
  moeda: 'USD' | 'BRL';
  liquidez: { data: string; valor_brl: number }[];
  objetivo: 'patrimonio' | 'carga' | 'credito_perdido';
  reinvestimento: Reinvestimento;
  inflacao_eua_faixas: number | null; // % a.a.
}

export interface Simulacao {
  perfil: Perfil;
  conta: Regime | 'comparar';
  posicoes: Posicao[];
  cenario: Cenario;
}

/* ---------- saída ---------- */
export type Origem = 'regra' | 'usuario' | 'mercado' | 'premissa' | 'calculado';
export type Selo = 'confirmado' | 'pendente' | 'aproximacao' | 'premissa';

export interface Memoria {
  rotulo: string;
  valor: number;
  unidade: 'USD' | 'BRL' | '%';
  formula: string;
  insumos: { rotulo: string; valor: number; unidade: 'USD' | 'BRL' | '%' | 'dias' | ''; origem: Origem }[];
  base_legal: string[];
  selos: Selo[];
}

export type NivelAlerta = 'baixo' | 'medio' | 'alto' | 'pendente' | 'info';
export interface Alerta {
  codigo: string;
  nivel: NivelAlerta;
  texto: string;
}

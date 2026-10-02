// Validação dos arquivos de parâmetros e resolução das regras pendentes.
import { z } from 'zod';
import {
  PRODUTOS,
  type Param,
  type Parametros,
  type ParametrosBrasil,
  type ParametrosEUA,
  type ParametrosEstado,
  type Pendente,
} from './tipos';

/* ---------- esquemas ---------- */
const meta = {
  fonte: z.string().min(1),
  url: z.string().regex(/^https?:\/\/\S+$/, 'url deve começar com http(s)://'),
  data_verificacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data_verificacao deve ser AAAA-MM-DD'),
  nota: z.string().optional(),
};

export function param<T extends z.ZodType>(valor: T) {
  return z.discriminatedUnion('status', [
    z.object({ ...meta, status: z.literal('confirmado'), valor }),
    z.object({
      ...meta,
      status: z.literal('pendente'),
      id: z.string().min(1),
      rotulo: z.string().min(1),
      interpretacoes: z.array(z.object({ id: z.string().min(1), rotulo: z.string().min(1), valor })).min(1),
    }),
  ]);
}

const aliquota = z.number().min(0).max(1);
const faixas = z.array(z.object({ acima_de: z.number().min(0), aliquota })).min(1);
const regressiva = z.array(z.object({ ate_dias: z.number().int().positive().nullable(), aliquota })).min(1);
const parcelas = z.array(z.object({ ate: z.number().positive().nullable(), aliquota })).min(1);
const porFiling = <T extends z.ZodType>(s: T) => z.object({ single: s, mfj: s, mfs: s, hoh: s });

const regraBR = z.object({
  aliquota: param(z.union([aliquota, z.literal('regressiva')])),
  iof: param(z.boolean()),
  base_legal: z.string().min(1),
});
const produtos = z.object(Object.fromEntries(PRODUTOS.map((p) => [p, regraBR])) as Record<(typeof PRODUTOS)[number], typeof regraBR>);

export const esquemaBrasil = z.object({
  versao: z.string().min(1),
  revisado_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tabela_regressiva: param(regressiva),
  iof_regressivo: param(z.array(aliquota).length(30)).nullable(),
  regimes: z.object({ light: produtos, full: produtos }),
  cupons: z.object({
    prazo_light: param(z.enum(['desde_compra', 'desde_ultimo_cupom'])),
    taxa_cupom_tesouro: z.object({
      tesouro_pre_cupom: param(z.number().positive()).nullable(),
      tesouro_ipca_cupom: param(z.number().positive()).nullable(),
    }),
  }),
  imoveis: z.object({ ganho_capital: param(parcelas) }),
});

export const esquemaEUA = z.object({
  ano: z.number().int(),
  faixas: porFiling(param(faixas).nullable()),
  deducao_padrao: porFiling(param(z.number().positive()).nullable()),
  ganho_capital_qualificado: porFiling(param(faixas).nullable()).nullable(),
  niit: z.object({
    aliquota: param(aliquota),
    limiar_magi: porFiling(param(z.number().positive())),
    inclui_cambio_988: param(z.boolean()),
  }),
  credito: z.object({
    carryback_anos: param(z.number().int().min(0)),
    carryforward_anos: param(z.number().int().min(0)),
  }),
  curto_prazo_meses: param(z.number().int().positive()),
  deducao_imposto_estrangeiro: param(z.literal('itemizada_fora_do_teto_salt')),
});

export const esquemaEstado = z.object({
  sigla: z.string().length(2),
  nome: z.string().min(1),
  modo: z.literal('A'),
  tem_imposto_juros_dividendos: param(z.boolean()),
  observacoes: z.array(z.string()),
  base_inicial: z.null(),
  faixas: z.null(),
  deducoes: z.null(),
  juros_estrangeiros: z.null(),
  credito_imposto_estrangeiro: z.null(),
  impostos_locais: z.null(),
  residencia: z.null(),
  ganho_capital_especifico: z.unknown().nullable(),
});

export function carregaParametros(raw: { brasil: unknown; eua: unknown; estados: unknown[] }): Parametros {
  const brasil = esquemaBrasil.parse(raw.brasil) as ParametrosBrasil;
  const eua = esquemaEUA.parse(raw.eua) as ParametrosEUA;
  const estados: Record<string, ParametrosEstado> = {};
  for (const e of raw.estados) {
    const est = esquemaEstado.parse(e) as ParametrosEstado;
    estados[est.sigla] = est;
  }
  return { brasil, eua, estados };
}

/* ---------- resolução ---------- */
export class ParametroAusente extends Error {
  constructor(public readonly nome: string) {
    super(`Parâmetro ausente: ${nome}. Ele precisa ser carregado da fonte oficial antes do uso.`);
    this.name = 'ParametroAusente';
  }
}

/**
 * Lê o valor de um parâmetro. Regra pendente: usa a interpretação escolhida em `escolhas`
 * (ou a primeira listada) e registra que a regra foi usada, para a tela mostrar o selo
 * "pendente" e o resultado nas outras interpretações.
 */
export class Resolvedor {
  readonly tocadas = new Map<string, Pendente<unknown>>();
  constructor(readonly escolhas: Readonly<Record<string, string>> = {}) {}

  valor<T>(p: Param<T> | null | undefined, nome: string): T {
    if (!p) throw new ParametroAusente(nome);
    if (p.status === 'confirmado') return p.valor;
    this.tocadas.set(p.id, p as Pendente<unknown>);
    const escolhida = this.escolhas[p.id];
    const it = (escolhida !== undefined && p.interpretacoes.find((i) => i.id === escolhida)) || p.interpretacoes[0];
    return it.valor;
  }

  /** Regras pendentes usadas que têm mais de uma interpretação. */
  multiplas(): Pendente<unknown>[] {
    return [...this.tocadas.values()].filter((p) => p.interpretacoes.length > 1);
  }
}

/** Todas as combinações de interpretações das regras pendentes informadas. */
export function combinacoes(pendentes: Pendente<unknown>[]): Record<string, string>[] {
  let out: Record<string, string>[] = [{}];
  for (const p of pendentes) {
    out = out.flatMap((c) => p.interpretacoes.map((i) => ({ ...c, [p.id]: i.id })));
  }
  return out;
}

export const statusDe = (p: Param<unknown> | null | undefined) => (p ? p.status : 'ausente');

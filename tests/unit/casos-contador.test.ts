// Seção 17.11: três casos para o contador americano conferir.
// Mercado constante e explícito, para o contador refazer a conta à mão.
// `GERAR_CASOS=1 npx vitest run casos-contador` regrava docs/VALIDACAO_CONTADOR.md com os números atuais.
import { writeFileSync } from 'node:fs';
import { cronogramaDoPlano, simula, type Contexto, type ResultadoEstrategia } from '../../src/motores/motor-cenarios';
import type { Posicao, Regime, Simulacao } from '../../src/motores/tipos';
import { mercadoConstante, params, posicao, simulacao } from './apoio';

const MERCADO = { cdi: 14, selic: 14.1, ipca: 4.5, cambio: 5.2, cambioFim: (a: number) => 5.2 + 0.15 * (a - 2026) };

interface Caso {
  nome: string;
  perfil: string;
  conta: Regime;
  sim: Simulacao;
  descricao: string[];
}

const casos: Caso[] = [
  {
    nome: 'Caso 1 · CDB de 3 anos na Light, IR só no vencimento',
    perfil: 'Single, Flórida (Modo A), renda tributável de US$ 120.000 sem o Brasil',
    conta: 'light',
    sim: simulacao(
      [posicao({ id: 'cdb', produto: 'cdb_cdi', valor_aplicado_brl: 500_000, taxa: 102, data_compra: '2026-01-05', data_vencimento: '2028-12-15' })],
      { estado: 'FL', filing: 'single', renda_tributavel_usd: 120_000, conta: 'light', horizonte: 4 },
    ),
    descricao: ['CDB 102% do CDI, R$ 500.000, compra 05/01/2026, vencimento 15/12/2028, mantido até o vencimento.'],
  },
  {
    nome: 'Caso 2 · Tesouro com cupons e CDB na Full, com NIIT',
    perfil: 'MFJ, Texas (Modo A), renda tributável de US$ 260.000 sem o Brasil',
    conta: 'full',
    sim: simulacao(
      [
        posicao({ id: 'ntnb', produto: 'tesouro_ipca_cupom', valor_aplicado_brl: 800_000, indexador: 'ipca_mais', taxa: 7, pagamento: { tipo: 'cupom', meses: 6 }, data_compra: '2026-03-10', data_emissao: '2024-01-10', data_vencimento: '2035-05-15' }),
        posicao({ id: 'cdb', produto: 'cdb_cdi', valor_aplicado_brl: 300_000, taxa: 100, data_compra: '2026-01-20', data_vencimento: '2027-07-20' }),
      ],
      { estado: 'TX', filing: 'mfj', renda_tributavel_usd: 260_000, conta: 'full', horizonte: 4 },
    ),
    descricao: [
      'Tesouro IPCA+ com juros semestrais (cupom de 6% a.a.), IPCA + 7%, R$ 800.000, compra 10/03/2026, emissão 10/01/2024, vencimento 15/05/2035; resgatado no fim de 2029 (fim do horizonte).',
      'CDB 100% do CDI, R$ 300.000, compra 20/01/2026, vencimento 20/07/2027.',
    ],
  },
  {
    nome: 'Caso 3 · Estado do Modo B com alíquota estimada, isento e debênture comum na Light',
    perfil: 'Single, Califórnia (Modo B, alíquota estadual estimada de 9,3%), renda tributável de US$ 90.000 sem o Brasil',
    conta: 'light',
    sim: simulacao(
      [
        posicao({ id: 'lca', produto: 'lca', valor_aplicado_brl: 400_000, taxa: 95, data_compra: '2026-02-01', data_vencimento: '2028-02-01' }),
        posicao({ id: 'deb', produto: 'debenture', valor_aplicado_brl: 200_000, indexador: 'ipca_mais', taxa: 7, pagamento: { tipo: 'cupom', meses: 6 }, data_compra: '2026-04-15', data_vencimento: '2031-04-15', plano: { tipo: 'total', data: '2029-07-01' } }),
      ],
      { estado: 'CA', filing: 'single', renda_tributavel_usd: 90_000, aliquota_estadual_estimada: 9.3, conta: 'light', horizonte: 4 },
    ),
    descricao: [
      'LCA 95% do CDI, R$ 400.000, compra 01/02/2026, vencimento 01/02/2028.',
      'Debênture comum IPCA + 7% com cupons semestrais, R$ 200.000, compra 15/04/2026, vencimento 15/04/2031, resgate total em 01/07/2029.',
    ],
  },
];

function roda(c: Caso): ResultadoEstrategia {
  const ctx: Contexto = { sim: c.sim, params, mercado: mercadoConstante(MERCADO), regime: c.conta, escolhas: {} };
  return simula(ctx, cronogramaDoPlano(c.sim));
}

const us = (v: number) => 'US$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(v));
const pct = (v: number | null) => (v === null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v * 100) + '%');

function saldoFim(r: ResultadoEstrategia, ano: number) {
  return r.credito.origens
    .filter((o) => o.ano_origem <= ano)
    .reduce((s, o) => {
      const usado = o.usado_proprio + o.enviado_anterior.reduce((a, x) => a + x.valor, 0) + o.usado_seguintes.filter((x) => x.ano <= ano).reduce((a, x) => a + x.valor, 0);
      return s + Math.max(0, o.gerado - usado - (o.ano_expiracao <= ano ? o.expirado : 0));
    }, 0);
}

function markdown(): string {
  const l: string[] = [];
  l.push('# Validação com contador americano (seção 17.11)', '');
  l.push('Três casos para um contador habilitado nos EUA conferir. Cada linha da tabela é um número do simulador; o contador preenche o valor dele e comenta as diferenças. As diferenças ficam documentadas aqui antes da publicação.', '');
  l.push('**Premissas comuns (mercado constante, para a conta poder ser refeita à mão):** CDI de 14% a.a.; Selic de 14,1% a.a.; IPCA de 4,5% a.a.; câmbio de R$ 5,20 por US$ hoje e no fim de 2026, subindo R$ 0,15 por ano (5,35 no fim de 2027, 5,50 em 2028, 5,65 em 2029), em linha reta dentro do ano. Faixas federais de 2026 em todos os anos. Juros (OID) de cada ano convertidos pelo câmbio médio do ano; IR retido e pagamentos, pelo câmbio do dia. O que ainda estiver aplicado no fim do horizonte é resgatado em 31/12.', '');
  l.push('**Valores negativos de IR federal a mais** são esperados em anos com perda cambial: a perda do §988 é de fonte americana e reduz a renda tributável total, enquanto o teto do crédito segue a renda estrangeira (Form 1116). O crédito então abate imposto que, sem o Brasil, recairia sobre outras rendas. Vale a conferência do contador justamente nesse ponto.', '');
  l.push('> Números gerados pelo próprio simulador (`GERAR_CASOS=1 npx vitest run casos-contador`). Se um parâmetro mudar, gere de novo antes de enviar ao contador.', '');
  for (const c of casos) {
    const r = roda(c);
    l.push(`## ${c.nome}`, '');
    l.push(`- **Perfil:** ${c.perfil}.`);
    l.push(`- **Conta:** CNR ${c.conta === 'light' ? 'Light' : 'Full'}.`);
    for (const d of c.descricao) l.push(`- ${d}`);
    l.push('');
    l.push('| Ano | Juros e OID (fonte estrangeira) | Câmbio §988 (fonte EUA) | IR e IOF retidos no Brasil | Renda estrangeira tributável (Form 1116) | Teto do crédito | Crédito ou dedução | Crédito usado | IR federal a mais, depois do crédito | NIIT a mais | Estadual | Saldo de crédito no fim do ano |');
    l.push('|---|--:|--:|--:|--:|--:|---|--:|--:|--:|--:|--:|');
    for (const a of r.anos)
      l.push(`| ${a.ano} | ${us(a.juros_usd)} | ${us(a.cambio_usd)} | ${us(a.ir_brasil_usd)} | ${us(a.federal.renda_estrangeira_tributavel)} | ${us(a.federal.teto)} | ${a.modo_credito === 'credito' ? 'crédito' : 'dedução'} | ${us(a.credito_usado)} | ${us(a.federal_liquido_incremental)} | ${us(a.niit_incremental)} | ${us(a.estadual)} | ${us(saldoFim(r, a.ano))} |`);
    l.push('');
    l.push(`**Totais do horizonte:** juros ${us(r.totais.juros_usd)}; IR e IOF no Brasil ${us(r.totais.ir_brasil_usd)}; IR federal a mais depois do crédito ${us(r.totais.federal_liquido_usd)}; NIIT ${us(r.totais.niit_usd)}; estadual ${us(r.totais.estadual_usd)}; crédito expirado ${us(r.resumo_credito.expirado)}; saldo no fim ${us(r.resumo_credito.saldo)}; carga efetiva ${pct(r.carga_efetiva)}.`, '');
    l.push('**Conferência do contador**', '');
    l.push('| Item | Simulador | Contador | Diferença | Comentário |', '|---|--:|--:|--:|---|');
    l.push(`| IR federal a mais, depois do crédito (soma) | ${us(r.totais.federal_liquido_usd)} | | | |`);
    l.push(`| Crédito usado (soma) | ${us(r.anos.reduce((s, a) => s + a.credito_usado, 0))} | | | |`);
    l.push(`| Saldo de crédito no fim | ${us(r.resumo_credito.saldo)} | | | |`);
    l.push(`| NIIT (soma) | ${us(r.totais.niit_usd)} | | | |`);
    l.push('| Classificação do título nos EUA (OID, cupons, §1283, §988) | conforme a tabela acima | | | |', '');
  }
  l.push('## Diferenças documentadas', '', '_A preencher depois do retorno do contador: item, valor do simulador, valor do contador, causa e se o simulador foi ajustado._', '');
  return l.join('\n');
}

describe('17.11 · casos para o contador', () => {
  it.each(casos.map((c) => [c.nome, c] as const))('%s: resultado coerente', (_, c) => {
    const r = roda(c);
    expect(r.anos.length).toBeGreaterThan(0);
    for (const a of r.anos) {
      expect(a.credito_usado).toBeLessThanOrEqual(a.federal.teto + 0.01);
    }
    expect(r.carga_efetiva).toBeGreaterThan(0);
    expect(r.carga_efetiva!).toBeLessThan(1);
  });

  it('o caso da Califórnia tem estadual de 9,3% sobre a renda reconhecida', () => {
    const r = roda(casos[2]);
    const a = r.anos[0];
    expect(a.estadual).toBeCloseTo(0.093 * Math.max(0, a.juros_usd + a.cambio_usd), 0);
  });

  it.runIf(process.env.GERAR_CASOS)('grava docs/VALIDACAO_CONTADOR.md', () => {
    writeFileSync('docs/VALIDACAO_CONTADOR.md', markdown());
  });
});

// mantém o tipo importado em uso mesmo quando a gravação está desligada
export type { Posicao };

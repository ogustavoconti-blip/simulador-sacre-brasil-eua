// Seção 17.6, 17.7 e 17.8: tabela regressiva, imóvel (Fase 2) e regimes Light × Full.
import { aliquotaRegressiva, irGanhoImovel, regraProduto } from '../../src/motores/motor-brasil';
import { simula, type Contexto } from '../../src/motores/motor-cenarios';
import { Resolvedor } from '../../src/motores/parametros';
import type { ProdutoId, Regime } from '../../src/motores/tipos';
import { mercadoConstante, params, posicao, simulacao } from './apoio';

const r = new Resolvedor();

describe('17.6 · tabela regressiva (Light)', () => {
  const tabela = r.valor(params.brasil.tabela_regressiva, 'tabela');
  it.each([
    [180, 0.225],
    [181, 0.2],
    [360, 0.2],
    [361, 0.175],
    [720, 0.175],
    [721, 0.15],
  ])('%i dias → %f', (dias, aliq) => expect(aliquotaRegressiva(dias, tabela)).toBe(aliq));
});

describe('17.7 · imóvel (Fase 2)', () => {
  const tabela = r.valor(params.brasil.imoveis.ganho_capital, 'imoveis');
  it('ganho de R$ 6 milhões → IR de R$ 925.000', () => expect(irGanhoImovel(6_000_000, tabela)).toBeCloseTo(925_000, 6));
  it('ganho de R$ 12 milhões → IR de R$ 2.025.000', () => expect(irGanhoImovel(12_000_000, tabela)).toBeCloseTo(2_025_000, 6));
});

describe('17.8 · regimes', () => {
  const aliq = (p: ProdutoId, g: Regime) => regraProduto(p, g, params.brasil, r).aliquota;

  it('alíquotas por produto conforme a seção 10', () => {
    for (const p of ['tesouro_selic', 'tesouro_pre', 'tesouro_ipca'] as const) {
      expect(aliq(p, 'light')).toBe('regressiva');
      expect(aliq(p, 'full')).toBe(0);
    }
    for (const p of ['cdb_pre', 'cdb_cdi', 'cdb_ipca', 'debenture'] as const) {
      expect(aliq(p, 'light')).toBe('regressiva');
      expect(aliq(p, 'full')).toBe(0.15);
    }
    for (const p of ['lci', 'lca', 'cri', 'cra', 'debenture_incentivada'] as const) {
      expect(aliq(p, 'light')).toBe(0);
      expect(aliq(p, 'full')).toBe(0);
    }
  });

  it('na mesma carteira, Light e Full retêm alíquotas diferentes para Tesouro, CDB e debêntures', () => {
    const m = mercadoConstante();
    const carteira = [
      posicao({ id: 'tesouro', produto: 'tesouro_pre', indexador: 'pre', taxa: 12, data_compra: '2026-01-05', data_vencimento: '2026-11-01' }),
      posicao({ id: 'cdb', produto: 'cdb_cdi', data_compra: '2026-01-05', data_vencimento: '2026-11-01' }),
      posicao({ id: 'deb', produto: 'debenture', indexador: 'ipca_mais', taxa: 6, data_compra: '2026-01-05', data_vencimento: '2026-11-01' }),
    ];
    const roda = (regime: Regime) => {
      const ctx: Contexto = { sim: simulacao(carteira, { conta: regime }), params, mercado: m, regime, escolhas: {} };
      const res = simula(ctx, {});
      return Object.fromEntries(res.eventos_brasil.map((e) => [e.posicao, e.aliquota]));
    };
    const light = roda('light'); // 300 dias → 20%
    const full = roda('full');
    expect(light).toEqual({ tesouro: 0.2, cdb: 0.2, deb: 0.2 });
    expect(full).toEqual({ tesouro: 0, cdb: 0.15, deb: 0.15 });
  });
});

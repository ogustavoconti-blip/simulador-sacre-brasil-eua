// Ponto de entrada: validação de dados faltando e execução com cenário do Focus.
import { executaSimulacao, validaSimulacao } from '../../src/motores';
import type { DadosMercado } from '../../src/motores/mercado';
import { params, posicao, simulacao } from './apoio';

const dados: DadosMercado = {
  gerado_em: '2026-10-01T09:00:00-03:00',
  hoje: '2026-10-01',
  cambio_hoje: 5.4,
  selic_hoje: 14.25,
  spread_cdi_selic: 0.1,
  historico: {
    cdi_diario: [['2026-09-29', 0.0527], ['2026-09-30', 0.0527]],
    ptax: [['2026-09-29', 5.39], ['2026-09-30', 5.41]],
  },
  focus: {
    data_coleta: '2026-09-25',
    anos: [
      { ano: 2026, selic: { mediana: 14.25 }, ipca: { mediana: 4.6 }, cambio: { mediana: 5.45 } },
      { ano: 2027, selic: { mediana: 12.25 }, ipca: { mediana: 4.0 }, cambio: { mediana: 5.6 } },
      { ano: 2028, selic: { mediana: 10.75 }, ipca: { mediana: 3.7 }, cambio: { mediana: 5.72 } },
    ],
  },
};

describe('Validação ("dado faltando")', () => {
  it('aponta campos faltando ou impossíveis', () => {
    const sim = simulacao([
      posicao({ id: 'a', produto: 'cdb_cdi', valor_aplicado_brl: 0, data_compra: '2026-05-01', data_vencimento: '2026-04-01' }),
      posicao({ id: 'b', produto: 'lca', data_compra: '2027-01-01', data_vencimento: '2028-01-01' }),
    ]);
    const campos = validaSimulacao(sim, dados.hoje).map((p) => p.campo);
    expect(campos).toEqual(expect.arrayContaining(['posicoes[0].valor_aplicado_brl', 'posicoes[0].data_vencimento', 'posicoes[1].data_compra']));
  });
  it('sem aplicações não simula', () => {
    const r = executaSimulacao(simulacao([]), params, dados);
    expect(r.ok).toBe(false);
  });
});

describe('Execução com o cenário do Focus', () => {
  it('roda do começo ao fim e informa a data dos dados de mercado', () => {
    const sim = simulacao([posicao({ id: 'cdb', produto: 'cdb_cdi', data_compra: '2025-03-10', data_vencimento: '2029-03-10' })], { horizonte: 5 });
    sim.cenario.tipo = 'focus';
    const r = executaSimulacao(sim, params, dados);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados_mercado.data).toBe('2026-10-01');
    const atual = r.resultado[0].interpretacoes[0].estrategias[0];
    expect(atual.anos.map((a) => a.ano)).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(atual.patrimonio_final_usd).toBeGreaterThan(0);
  });
  it('MFS roda com os parâmetros oficiais', () => {
    const sim = simulacao([posicao({ id: 'cdb', produto: 'cdb_cdi', data_compra: '2026-01-02', data_vencimento: '2028-01-02' })], { filing: 'mfs' });
    sim.cenario.tipo = 'focus';
    expect(executaSimulacao(sim, params, dados).ok).toBe(true);
  });
});

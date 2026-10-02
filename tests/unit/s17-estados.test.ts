// Seção 17.9: estados (Modo A, Modo B sem alíquota, Modo B com 5%).
import { simula, type Contexto } from '../../src/motores/motor-cenarios';
import { impostoEstadual } from '../../src/motores/motor-estados';
import { Resolvedor } from '../../src/motores/parametros';
import { ESTADOS_MODO_A, arquivosEstados, mercadoConstante, params, posicao, simulacao } from './apoio';

const carteira = [
  posicao({ id: 'cdb', produto: 'cdb_cdi', valor_aplicado_brl: 500_000, data_compra: '2026-01-05', data_vencimento: '2028-06-01' }),
  posicao({ id: 'lca', produto: 'lca', valor_aplicado_brl: 200_000, taxa: 95, data_compra: '2026-02-01', data_vencimento: '2027-08-01' }),
];
const roda = (estado: string, aliquota: number | null) => {
  const ctx: Contexto = {
    sim: simulacao(carteira, { estado, aliquota_estadual_estimada: aliquota, horizonte: 3 }),
    params,
    mercado: mercadoConstante({ cambioFim: (a) => 5 + 0.2 * (a - 2026) }),
    regime: 'light',
    escolhas: {},
  };
  return simula(ctx, {});
};

describe('17.9 · Modo A', () => {
  it.each(ESTADOS_MODO_A)('%s: estadual sobre a renda fixa = 0 e fonte registrada', (uf) => {
    const est = params.estados[uf];
    expect(est).toBeDefined();
    const p = est.tem_imposto_juros_dividendos;
    expect(p.fonte.length).toBeGreaterThan(0);
    expect(p.url).toMatch(/^https?:\/\//);
    expect(p.data_verificacao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const res = impostoEstadual(uf, params.estados, null, 50_000, new Resolvedor());
    expect(res).toMatchObject({ modo: 'A', selo: 'incluido', valor: 0 });
    expect(roda(uf, null).totais.estadual_usd).toBe(0);
  });
});

describe('17.9 · Modo B', () => {
  const fl = roda('FL', null);
  const semAliquota = roda('CA', null);
  const comAliquota = roda('CA', 5);

  it('sem alíquota: resultado igual ao federal, com selo e alerta', () => {
    expect(semAliquota.estado).toEqual({ modo: 'B', selo: 'nao_incluido' });
    expect(semAliquota.totais.estadual_usd).toBe(0);
    expect(semAliquota.patrimonio_final_usd).toBeCloseTo(fl.patrimonio_final_usd, 6);
    expect(semAliquota.alertas.some((a) => a.codigo === 'estado_nao_incluido')).toBe(true);
  });

  it('com 5%: estadual = 5% × renda brasileira reconhecida nos EUA no ano, sem crédito', () => {
    expect(comAliquota.estado.selo).toBe('estimado');
    for (const a of comAliquota.anos) {
      expect(a.estadual).toBeCloseTo(0.05 * Math.max(0, a.juros_usd + a.cambio_usd), 6);
    }
    expect(comAliquota.totais.estadual_usd).toBeGreaterThan(0);
  });

  it('com 5%: teto e crédito federal não mudam', () => {
    comAliquota.anos.forEach((a, i) => {
      expect(a.federal.teto).toBeCloseTo(semAliquota.anos[i].federal.teto, 6);
      expect(a.credito_usado).toBeCloseTo(semAliquota.anos[i].credito_usado, 6);
    });
    expect(comAliquota.resumo_credito).toEqual(semAliquota.resumo_credito);
  });
});

describe('Lista do Modo A', () => {
  it('cada sigla da lista tem arquivo, e cada arquivo está na lista', () => {
    const arquivos = Object.entries(arquivosEstados).map(([caminho, json]) => ({ arquivo: caminho.split('/').pop()!.replace('.json', ''), sigla: (json as { sigla: string }).sigla }));
    for (const a of arquivos) expect(a.sigla).toBe(a.arquivo);
    expect(arquivos.map((a) => a.sigla).sort()).toEqual([...ESTADOS_MODO_A].sort());
  });
});

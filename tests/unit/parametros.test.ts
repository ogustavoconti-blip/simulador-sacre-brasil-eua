// Todo parâmetro tem valor, fonte, url, data de verificação e status.
import { esquemaBrasil, esquemaEUA } from '../../src/motores/parametros';
import { brutos, params } from './apoio';

type No = Record<string, unknown>;
function folhas(no: unknown, caminho = ''): { caminho: string; folha: No }[] {
  if (!no || typeof no !== 'object' || Array.isArray(no)) return [];
  const o = no as No;
  if ('status' in o) return [{ caminho, folha: o }];
  return Object.entries(o).flatMap(([k, v]) => folhas(v, caminho ? `${caminho}.${k}` : k));
}

describe('Arquivos de parâmetros', () => {
  it('carregam e validam', () => {
    expect(params.brasil.versao).toBeTruthy();
    expect(Object.keys(params.estados).sort()).toEqual(['AK', 'FL', 'NH', 'NV', 'SD', 'TN', 'TX', 'WA', 'WY']);
  });

  it('toda regra traz os cinco campos obrigatórios', () => {
    const todas = [...folhas(brutos.brasil), ...folhas(brutos.eua), ...brutos.estados.flatMap((e) => folhas(e))];
    expect(todas.length).toBeGreaterThan(40);
    for (const { caminho, folha } of todas) {
      expect(folha.fonte, caminho).toBeTruthy();
      expect(String(folha.url), caminho).toMatch(/^https?:\/\//);
      expect(String(folha.data_verificacao), caminho).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['confirmado', 'pendente'], caminho).toContain(folha.status);
      if (folha.status === 'confirmado') expect('valor' in folha, caminho).toBe(true);
      else expect((folha.interpretacoes as unknown[]).length, caminho).toBeGreaterThan(0);
    }
  });

  it('recusa regra sem fonte', () => {
    const quebrado = structuredClone(brutos.brasil) as unknown as { tabela_regressiva: { fonte?: string } };
    delete quebrado.tabela_regressiva.fonte;
    expect(() => esquemaBrasil.parse(quebrado)).toThrow();
  });

  it('recusa alíquota fora de 0 a 1', () => {
    const quebrado = structuredClone(brutos.eua) as unknown as { niit: { aliquota: { valor: number } } };
    quebrado.niit.aliquota.valor = 3.8;
    expect(() => esquemaEUA.parse(quebrado)).toThrow();
  });

  it('debêntures incentivadas: isentas na Light (decisão da Sacre)', () => {
    const p = params.brasil.regimes.light.debenture_incentivada.aliquota;
    expect(p.status).toBe('confirmado');
    expect(p.status === 'confirmado' && p.valor).toBe(0);
  });
});

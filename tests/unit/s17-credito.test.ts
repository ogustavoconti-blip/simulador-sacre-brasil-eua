// Seção 17.3, 17.4 e 17.5: ordem do saldo, ano com dedução e expiração.
import { calculaCredito } from '../../src/motores/motor-credito';

const base = { carryback: 1, carryforward: 10 };

describe('17.3 · ordem do saldo', () => {
  const r = calculaCredito({
    ...base,
    anos: [
      { ano: 1, teto: 100, imposto: 0, modo: 'credito' },
      { ano: 2, teto: 50, imposto: 200, modo: 'credito' },
      { ano: 3, teto: 0, imposto: 0, modo: 'credito' },
    ],
  });
  const origem2 = r.origens.find((o) => o.ano_origem === 2)!;

  it('o Ano 2 usa 50', () => expect(r.anos[1].usado_proprio).toBe(50));
  it('100 voltam para o Ano 1', () => {
    expect(r.anos[0].carryback_recebido).toBe(100);
    expect(r.anos[0].credito_total).toBe(100);
    expect(origem2.enviado_anterior).toEqual([{ ano: 1, valor: 100 }]);
  });
  it('50 seguem para o Ano 3', () => expect(origem2.saldo_final).toBe(50));

  it('com espaço no Ano 3, os 50 são usados lá', () => {
    const r3 = calculaCredito({
      ...base,
      anos: [
        { ano: 1, teto: 100, imposto: 0, modo: 'credito' },
        { ano: 2, teto: 50, imposto: 200, modo: 'credito' },
        { ano: 3, teto: 80, imposto: 0, modo: 'credito' },
      ],
    });
    expect(r3.anos[2].carryforward_recebido).toBe(50);
    expect(r3.origens.find((o) => o.ano_origem === 2)!.saldo_final).toBe(0);
  });

  it('saldos mais antigos são usados primeiro', () => {
    const r4 = calculaCredito({
      ...base,
      saldos_iniciais: [
        { ano_origem: -1, valor: 30 },
        { ano_origem: -3, valor: 20 },
      ],
      anos: [{ ano: 1, teto: 25, imposto: 0, modo: 'credito' }],
    });
    expect(r4.origens.find((o) => o.ano_origem === -3)!.saldo_final).toBe(0);
    expect(r4.origens.find((o) => o.ano_origem === -1)!.saldo_final).toBe(25);
  });
});

describe('17.4 · ano com dedução', () => {
  it('saldo de 80 e teto livre de 30: o saldo cai para 50 sem gerar crédito', () => {
    const r = calculaCredito({
      ...base,
      saldos_iniciais: [{ ano_origem: 0, valor: 80 }],
      anos: [{ ano: 1, teto: 30, imposto: 0, modo: 'deducao' }],
    });
    expect(r.anos[0].consumido_sem_credito).toBe(30);
    expect(r.anos[0].credito_total).toBe(0);
    expect(r.origens[0].saldo_final).toBe(50);
  });
});

describe('17.5 · expiração', () => {
  const anos = (ate: number) =>
    Array.from({ length: ate - 2026 + 1 }, (_, i) => ({ ano: 2026 + i, teto: 0, imposto: i === 0 ? 100 : 0, modo: 'credito' as const }));

  it('saldo gerado em N continua disponível em N+10', () => {
    const r = calculaCredito({ ...base, anos: anos(2035) });
    const o = r.origens[0];
    expect(o.saldo_final).toBe(100);
    expect(o.expirado).toBe(0);
    expect(o.ano_expiracao).toBe(2036);
  });
  it('sem renda estrangeira depois, expira ao fim do ano N+10', () => {
    const r = calculaCredito({ ...base, anos: anos(2036) });
    const o = r.origens[0];
    expect(o.expirado).toBe(100);
    expect(o.saldo_final).toBe(0);
  });
});

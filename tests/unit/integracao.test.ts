// Coerência do motor completo: reconhecimento nos EUA, crédito, estratégias e decomposição.
import { dia } from '../../src/motores/calendario';
import { decompoe, objetivo, simula, simulaTudo, taxaEquilibrio, type Contexto } from '../../src/motores/motor-cenarios';
import { ParametroAusente } from '../../src/motores/parametros';
import type { Simulacao } from '../../src/motores/tipos';
import { mercadoConstante, params, posicao, simulacao } from './apoio';

const ctx = (sim: Simulacao, m = mercadoConstante()): Contexto => ({ sim, params, mercado: m, regime: sim.conta === 'full' ? 'full' : 'light', escolhas: {} });
const soma = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

describe('CDB longo, sem cupom, câmbio constante', () => {
  const cdb = posicao({ id: 'cdb', produto: 'cdb_cdi', valor_aplicado_brl: 500_000, data_compra: '2026-01-02', data_vencimento: '2028-01-03' });
  const res = simula(ctx(simulacao([cdb], { horizonte: 3 })), {});
  const ev = res.eventos_brasil;

  it('IR no Brasil só no vencimento, 15% (acima de 720 dias) sobre o rendimento', () => {
    expect(ev).toHaveLength(1);
    expect(ev[0].tipo).toBe('vencimento');
    expect(ev[0].aliquota).toBe(0.15);
    expect(ev[0].ir_brl).toBeCloseTo(0.15 * (ev[0].valor_bruto_brl - 500_000), 6);
  });

  it('nos EUA, os juros (OID) entram ano a ano e somam o rendimento em dólar', () => {
    expect(res.anos[0].juros_usd).toBeGreaterThan(0); // 2026, sem retenção no Brasil
    expect(res.anos[1].juros_usd).toBeGreaterThan(0); // 2027
    expect(soma(res.anos.map((a) => a.juros_usd))).toBeCloseTo((ev[0].valor_bruto_brl - 500_000) / 5, 4);
    expect(Math.abs(res.totais.cambio_usd)).toBeLessThan(1e-6);
  });

  it('o crédito nasce no ano da retenção e respeita a identidade do saldo', () => {
    const o = res.credito.origens.find((x) => x.ano_origem === 2028)!;
    expect(o.gerado).toBeCloseTo(ev[0].ir_usd, 6);
    const usado = o.usado_proprio + soma(o.enviado_anterior.map((x) => x.valor)) + soma(o.usado_seguintes.map((x) => x.valor));
    expect(usado + o.saldo_final + o.expirado).toBeCloseTo(o.gerado, 6);
    expect(o.enviado_anterior[0]?.ano).toBe(2027); // excedente volta 1 ano
  });

  it('patrimônio final = pagamentos líquidos − impostos americanos', () => {
    const liquido = ev[0].liquido_brl / ev[0].cambio;
    const eua = res.totais.federal_liquido_usd + res.totais.niit_usd + res.totais.estadual_usd;
    expect(res.patrimonio_final_usd).toBeCloseTo(liquido - eua, 6);
  });
});

describe('Título com prazo de emissão até 1 ano', () => {
  it('renda nos EUA só no resgate', () => {
    const p = posicao({ id: 'curto', produto: 'cdb_pre', indexador: 'pre', taxa: 12, data_compra: '2026-10-01', data_vencimento: '2027-09-30' });
    const res = simula(ctx(simulacao([p], { horizonte: 2 })), {});
    expect(res.anos[0].juros_usd).toBe(0);
    expect(res.anos[1].juros_usd).toBeGreaterThan(0);
  });
});

describe('Cupons', () => {
  const cdb = posicao({ id: 'cupom', produto: 'cdb_cdi', pagamento: { tipo: 'cupom', meses: 6 }, data_compra: '2026-01-02', data_vencimento: '2029-01-02' });
  const sim = simulacao([cdb], { horizonte: 4 });

  it('IR no Brasil a cada cupom e juros nos EUA no ano do recebimento', () => {
    const res = simula(ctx(sim), {});
    const cupons = res.eventos_brasil.filter((e) => e.tipo === 'cupom');
    expect(cupons.length).toBe(6);
    const recebido2026 = soma(cupons.filter((e) => e.ano === 2026).map((e) => e.valor_bruto_brl / e.cambio));
    expect(res.anos[0].juros_usd).toBeCloseTo(recebido2026, 6);
  });

  it('a regra pendente dos cupons na Light gera as duas interpretações', () => {
    const tudo = simulaTudo(sim, params, mercadoConstante());
    expect(tudo[0].pendencias.map((p) => p.id)).toContain('brasil.cupons.prazo_light');
    expect(tudo[0].interpretacoes).toHaveLength(2);
    const [a, b] = tudo[0].interpretacoes.map((i) => i.estrategias[0]);
    expect(b.totais.ir_brasil_usd).toBeGreaterThan(a.totais.ir_brasil_usd); // prazo desde o último cupom: 22,5%
  });
});

describe('CNR Full: Tesouro com 0% amplia o teto sem gerar crédito', () => {
  it('sem IR no Brasil, teto positivo', () => {
    const t = posicao({ id: 'tes', produto: 'tesouro_pre', indexador: 'pre', taxa: 12, data_compra: '2026-01-02', data_vencimento: '2029-01-01' });
    const res = simula(ctx(simulacao([t], { conta: 'full' })), {});
    expect(res.totais.ir_brasil_usd).toBe(0);
    expect(res.anos[0].federal.teto).toBeGreaterThan(0);
    expect(res.resumo_credito.imposto_estrangeiro).toBe(0);
  });
});

describe('Estratégias, otimizador e decomposição', () => {
  const carteira = [
    posicao({ id: 'cdb', produto: 'cdb_cdi', taxa: 102, valor_aplicado_brl: 800_000, data_compra: '2025-03-17', data_vencimento: '2031-03-17', plano: { tipo: 'total', data: '2031-03-17' } }),
    posicao({ id: 'lca', produto: 'lca', taxa: 95, valor_aplicado_brl: 300_000, data_compra: '2026-01-12', data_vencimento: '2028-01-12', liquidez: { tipo: 'vencimento' } }),
  ];
  const sim = simulacao(carteira, { horizonte: 6 });
  const m = mercadoConstante({ cambioFim: (a) => 5 + 0.15 * (a - 2026) });
  const tudo = simulaTudo(sim, params, m);
  const interp = tudo[0].interpretacoes[0];
  const atual = interp.estrategias.find((e) => e.id === 'atual')!;
  const otim = interp.estrategias.find((e) => e.id === 'otimizada')!;

  it('a melhor estratégia é pelo menos tão boa quanto o plano do usuário', () => {
    expect(objetivo(otim, 'patrimonio')).toBeGreaterThanOrEqual(objetivo(atual, 'patrimonio') - 1e-6);
  });

  it('a decomposição soma a diferença de patrimônio', () => {
    const d = decompoe(atual, otim);
    expect(d.rendimento_bruto + d.cambio + d.ir_brasil + d.ir_eua + d.credito).toBeCloseTo(d.total, 4);
  });

  it('aplicação comprada antes de 2026 gera alerta e só reporta de 2026 em diante', () => {
    expect(atual.alertas.some((a) => a.codigo === 'antes_2026')).toBe(true);
    expect(atual.anos[0].ano).toBe(2026);
    expect(atual.eventos_brasil.every((e) => e.data >= dia('2026-01-01'))).toBe(true);
  });

  it('carga efetiva e rateio por aplicação', () => {
    expect(atual.carga_efetiva).toBeGreaterThan(0);
    const lca = atual.por_posicao.find((p) => p.id === 'lca')!;
    expect(lca.ir_brasil_usd).toBe(0);
    expect(lca.carga).toBeGreaterThan(0); // isenta no Brasil, tributada nos EUA
  });
});

describe('Taxa de equilíbrio (13.2)', () => {
  it('% do CDI: r × (1 − carga tributado) ÷ (1 − carga isento)', () => {
    expect(taxaEquilibrio({ indexador: 'cdi', taxa: 102 }, 0.389, 0.24)).toBeCloseTo((102 * 0.611) / 0.76, 9);
  });
  it('com crédito usado por inteiro e cargas iguais, o equilíbrio é a própria taxa', () => {
    expect(taxaEquilibrio({ indexador: 'ipca_mais', taxa: 7.2 }, 0.24, 0.24, 0.035)).toBeCloseTo(7.2, 9);
  });
});

describe('Liquidez e parâmetros ausentes', () => {
  it('estratégia que não cobre a necessidade de liquidez gera alerta', () => {
    const p = posicao({ id: 'cdb', produto: 'cdb_cdi', data_compra: '2026-01-02', data_vencimento: '2030-01-02' });
    const sim = simulacao([p], { liquidez: [{ data: '2027-06-01', valor_brl: 50_000 }] });
    const res = simula(ctx(sim), {});
    expect(res.liquidez_ok).toBe(false);
    expect(res.alertas.some((a) => a.codigo === 'liquidez_nao_atendida')).toBe(true);
  });
  it('MFS e HoH já têm parâmetros oficiais (Rev. Proc. 2025-32)', () => {
    const p = posicao({ id: 'cdb', produto: 'cdb_cdi', data_compra: '2026-01-02', data_vencimento: '2028-01-02' });
    expect(() => simula(ctx(simulacao([p], { filing: 'hoh' })), {})).not.toThrow(ParametroAusente);
    expect(() => simula(ctx(simulacao([p], { filing: 'mfs' })), {})).not.toThrow(ParametroAusente);
  });
});

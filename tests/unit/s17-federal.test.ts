// Seção 17.1 e 17.2: imposto federal de 2026 e alíquota média.
import { impostoPorFaixas, rendaParaAliquotaMedia } from '../../src/motores/motor-eua-federal';
import { Resolvedor } from '../../src/motores/parametros';
import { params } from './apoio';

const r = new Resolvedor();
const single = r.valor(params.eua.faixas.single, 'single');
const mfj = r.valor(params.eua.faixas.mfj, 'mfj');

describe('17.1 · imposto federal de 2026 no topo de cada faixa', () => {
  it.each([
    [50_400, 5_800],
    [105_700, 17_966],
    [201_775, 41_024],
    [256_225, 58_448],
  ])('Single: US$ %i → US$ %i', (renda, imposto) => {
    expect(impostoPorFaixas(renda, single)).toBeCloseTo(imposto, 6);
  });
  it.each([
    [100_800, 11_600],
    [211_400, 35_932],
    [403_550, 82_048],
    [512_450, 116_896],
  ])('MFJ: US$ %i → US$ %i', (renda, imposto) => {
    expect(impostoPorFaixas(renda, mfj)).toBeCloseTo(imposto, 6);
  });
});

describe('17.2 · renda tributável em que a alíquota média atinge cada patamar', () => {
  it.each([
    [0.15, 75_543, 151_086],
    [0.175, 113_877, 227_754],
    [0.2, 185_050, 370_100],
    [0.225, 247_832, 495_663],
  ])('%f → Single US$ %i · MFJ US$ %i', (alvo, s, m) => {
    expect(Math.round(rendaParaAliquotaMedia(alvo, single))).toBe(s);
    expect(Math.round(rendaParaAliquotaMedia(alvo, mfj))).toBe(m);
  });
});

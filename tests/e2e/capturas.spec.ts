// Etapa 5: capturas das telas em 1920×1080 e 1366×768 (e celular), com a carteira de exemplo,
// e um PDF de exemplo do resultado. Saída em docs/revisao/.
import { test } from '@playwright/test';
import { ABAS, ETAPAS, abrir, esperaResultado, irPara, liberar } from './apoio';

const PASTA = 'docs/revisao/capturas';
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

for (const [w, h] of [[1920, 1080], [1366, 768]] as const) {
  test(`capturas ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const foto = (nome: string) => page.screenshot({ path: `${PASTA}/${w}x${h}/${nome}.png`, animations: 'disabled' });
    await abrir(page);
    await foto('01-boas-vindas');
    await liberar(page);
    for (let n = 2; n <= 7; n++) {
      await irPara(page, n);
      if (n === 6) {
        await esperaResultado(page);
        for (const [i, aba] of ABAS.entries()) {
          await page.getByRole('tab', { name: aba }).click();
          await foto(`06-${i + 1}-resultados-${slug(aba)}`);
        }
        await page.getByRole('tab', { name: 'Painel' }).click();
        await page.locator('.resumo .memo.bn-valor').first().click();
        await foto('06-7-memoria-de-calculo');
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'BRL' }).click();
        await foto('06-8-resultados-em-reais');
        await page.getByRole('button', { name: 'USD' }).click();
      } else await foto(`0${n}-${slug(ETAPAS[n - 1])}`);
    }
  });
}

test('capturas celular 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrir(page);
  await page.screenshot({ path: `${PASTA}/celular/01-boas-vindas.png`, animations: 'disabled' });
  await liberar(page);
  for (const n of [4, 6]) {
    await irPara(page, n);
    if (n === 6) await esperaResultado(page);
    await page.screenshot({ path: `${PASTA}/celular/0${n}-${slug(ETAPAS[n - 1])}.png`, animations: 'disabled', fullPage: true });
  }
});

test('PDF de exemplo do resultado', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await abrir(page);
  await liberar(page);
  await irPara(page, 6);
  await esperaResultado(page);
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({ path: `${PASTA}/impressao-pdf.png`, fullPage: true, animations: 'disabled' });
  await page.pdf({ path: 'docs/revisao/exemplo-resultado.pdf', format: 'A4', printBackground: true });
});

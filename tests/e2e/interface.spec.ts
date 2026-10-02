// Seção 17.10: privacidade, telas sem rolagem, celular, fluxo principal e exportações.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ABAS, abrir, esperaResultado, irPara, liberar, semRolagemDaPagina } from './apoio';

test('privacidade: só GET ao próprio site, sem dados digitados, sem cookies e sem armazenamento', async ({ page, context, baseURL }) => {
  const pedidos: { metodo: string; url: string }[] = [];
  const erros: string[] = [];
  page.on('request', (r) => pedidos.push({ metodo: r.method(), url: r.url() }));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && erros.push(`${r.status()} ${r.url()}`));
  page.on('pageerror', (e) => erros.push(e.message));

  await abrir(page);
  await liberar(page);
  // digita valores reconhecíveis para procurar depois na rede
  const renda = page.locator('#renda');
  await renda.fill('987.654');
  await irPara(page, 4);
  await page.locator('main article.inv .iw input').first().fill('424.242');
  for (let n = 5; n <= 7; n++) await irPara(page, n);
  await irPara(page, 6);
  await esperaResultado(page);
  for (const aba of ABAS) await page.getByRole('tab', { name: aba }).click();
  await page.getByRole('button', { name: 'BRL' }).click();

  const origem = new URL(baseURL!).origin;
  const externos = pedidos.filter((p) => !p.url.startsWith(origem) && !p.url.startsWith('blob:') && !p.url.startsWith('data:'));
  expect(externos, 'nenhum pedido a outro endereço').toEqual([]);
  expect(pedidos.filter((p) => p.metodo !== 'GET'), 'só pedidos GET').toEqual([]);
  expect(pedidos.filter((p) => new URL(p.url).search !== ''), 'nenhum parâmetro na URL').toEqual([]);
  expect(pedidos.filter((p) => /987.?654|424.?242/.test(p.url)), 'nenhum valor digitado na rede').toEqual([]);

  expect(await context.cookies()).toEqual([]);
  const armazenamento = await page.evaluate(async () => ({
    local: localStorage.length,
    sessao: sessionStorage.length,
    indexeddb: (await indexedDB.databases()).length,
    cookie: document.cookie,
  }));
  expect(armazenamento).toEqual({ local: 0, sessao: 0, indexeddb: 0, cookie: '' });
  expect(erros).toEqual([]);
});

for (const [w, h] of [[1366, 768], [1366, 650], [1920, 1080]] as const) {
  test(`sem rolagem da página em ${w}×${h}, em todas as etapas e abas`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await abrir(page);
    expect(await semRolagemDaPagina(page)).toEqual({ altura: 0, largura: 0 });
    await liberar(page);
    for (let n = 2; n <= 7; n++) {
      await irPara(page, n);
      if (n === 6) await esperaResultado(page);
      expect(await semRolagemDaPagina(page), `etapa ${n}`).toEqual({ altura: 0, largura: 0 });
      if (n === 6)
        for (const aba of ABAS) {
          await page.getByRole('tab', { name: aba }).click();
          expect(await semRolagemDaPagina(page), `aba ${aba}`).toEqual({ altura: 0, largura: 0 });
        }
    }
  });
}

test('celular (390×844): layout empilhado, com aviso, sem rolagem lateral', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrir(page);
  await expect(page.getByText('Melhor experiência no computador')).toBeVisible();
  await liberar(page);
  for (let n = 2; n <= 7; n++) {
    await irPara(page, n);
    if (n === 6) await esperaResultado(page);
    expect((await semRolagemDaPagina(page)).largura, `etapa ${n}`).toBe(0);
  }
});

test('etapas travadas até o "Entendi" e aviso completo no rodapé', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('.steps .step').nth(5)).toBeDisabled();
  await page.getByRole('button', { name: 'Leia o aviso completo' }).click();
  await expect(page.getByRole('dialog')).toContainText('Esta calculadora não realiza cálculo tributário');
  await page.keyboard.press('Escape');
  await liberar(page);
  await expect(page.locator('.steps .step').nth(5)).toBeEnabled();
});

test('carteira com um único CDB de R$ 100 mil: total certo e resultado calculado', async ({ page }) => {
  await abrir(page);
  await liberar(page);
  await irPara(page, 4);
  const remover = page.getByRole('button', { name: /Remover aplicação/ });
  while (await remover.count()) await remover.first().click();
  await expect(page.locator('.resumo')).toContainText('Inclua ao menos uma aplicação');
  await page.getByRole('button', { name: '+ Adicionar aplicação' }).click();
  await page.locator('main input[placeholder="0"]').fill('100000');
  const datas = page.locator('main input[placeholder="dd/mm/aaaa"]');
  await datas.nth(0).fill('02/01/2026');
  await datas.nth(1).fill('02/01/2029');
  await page.locator('main input[placeholder="102"]').fill('100');
  await expect(page.locator('.resumo')).toContainText('R$ 100');
  await expect(page.locator('.resumo')).not.toContainText('1,15');
  await irPara(page, 6);
  await esperaResultado(page);
  const usd = await page.locator('.resumo .bn-valor').first().innerText();
  expect(usd).toMatch(/^US\$/);
  await page.getByRole('button', { name: 'BRL' }).click();
  await expect(page.locator('.resumo .bn-valor').first()).toHaveText(/^R\$/);
  // a liquidação de um CDB de 3 anos gera saldo de crédito: o alerta e a tabela aparecem
  await page.getByRole('tab', { name: 'Crédito' }).click();
  await expect(page.locator('#p-cred table')).toContainText('2029');
});

test('troca de produto aceita prefixado e IPCA+ (não só % do CDI)', async ({ page }) => {
  await abrir(page);
  await liberar(page);
  await irPara(page, 4);
  const card = page.locator('main article.inv').first();
  const produto = card.locator('select').first();
  await produto.selectOption('LCA');
  const idx = card.getByRole('combobox', { name: /Indexador/ });
  const opcoes = await idx.locator('option').allInnerTexts();
  expect(opcoes.join('|')).toMatch(/Prefixado/);
  expect(opcoes.join('|')).toMatch(/IPCA/);
});

test('exportações: CSV gerado no navegador e memória de cálculo', async ({ page }) => {
  await abrir(page);
  await liberar(page);
  await irPara(page, 6);
  await esperaResultado(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar tabela (CSV)' }).first().click()]);
  expect(download.suggestedFilename()).toBe('simulacao-sacre-brasil-eua.csv');
  const texto = readFileSync((await download.path())!, 'utf8');
  expect(texto.charCodeAt(0)).toBe(0xfeff);
  expect(texto).toContain('Ano;');
  expect(texto.split('\r\n').length).toBeGreaterThan(3);
  await page.locator('.resumo .memo.bn-valor').first().click();
  await expect(page.getByRole('dialog')).toContainText('Base legal');
});

test('carga inicial abaixo de 2 segundos (servidor local)', async ({ page }) => {
  const t0 = Date.now();
  await abrir(page);
  expect(Date.now() - t0).toBeLessThan(2000);
});

import { expect, type Page } from '@playwright/test';

export const ETAPAS = ['Boas-vindas', 'Onde você mora', 'Sua conta no Brasil', 'Seus investimentos', 'Cenário', 'Resultados', 'Entenda o cálculo'];
export const ABAS = ['Painel', 'Alternativas', 'Estratégias', 'Crédito', 'Por produto', 'Detalhamento'];

export async function abrir(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Entendi, quero simular/ })).toBeVisible();
}

export async function liberar(page: Page) {
  await page.getByRole('button', { name: /Entendi, quero simular/ }).click();
  await expect(page.locator('#t2')).toBeVisible();
}

export async function irPara(page: Page, n: number) {
  await page.locator('.steps .step').nth(n - 1).click();
  await expect(page.locator(`#t${n}`)).toBeVisible();
  await expect(page.locator('.resumo .calc-status')).toHaveCount(0, { timeout: 30_000 });
}

/** Espera o painel de resultados sair de "Calculando…". */
export async function esperaResultado(page: Page) {
  await expect(page.locator('.resumo')).toContainText('Patrimônio final em', { timeout: 30_000 });
  await expect(page.locator('.resumo .calc-status')).toHaveCount(0, { timeout: 30_000 });
}

/** Página sem rolagem própria: só as colunas internas rolam. */
export async function semRolagemDaPagina(page: Page) {
  return page.evaluate(() => ({
    altura: document.documentElement.scrollHeight - innerHeight,
    largura: document.documentElement.scrollWidth - innerWidth,
  }));
}

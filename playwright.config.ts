// Testes de ponta a ponta (seção 17.10) sobre o build de produção, com a política de segurança (CSP) ativa.
// Usa os navegadores já instalados na máquina (Edge e Chrome); não baixa navegador.
// Para testar o site publicado: SITE=https://ogustavoconti-blip.github.io/simulador-sacre-brasil-eua/ npx playwright test interface
import { defineConfig } from '@playwright/test';

const site = process.env.SITE;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: site ? 'test-results/resultado-site.json' : 'docs/revisao/resultado-e2e.json' }]],
  use: { baseURL: site ?? 'http://localhost:4173/', locale: 'pt-BR', timezoneId: 'America/New_York' },
  webServer: site ? undefined : { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'edge', use: { channel: 'msedge' } },
    { name: 'chrome', use: { channel: 'chrome' }, testIgnore: /capturas/ },
  ],
});

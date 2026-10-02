// Testes de ponta a ponta (seção 17.10) sobre o build de produção, com a política de segurança (CSP) ativa.
// Usa os navegadores já instalados na máquina (Edge e Chrome); não baixa navegador.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'docs/revisao/resultado-e2e.json' }]],
  use: { baseURL: 'http://localhost:4173', locale: 'pt-BR', timezoneId: 'America/New_York' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'edge', use: { channel: 'msedge' } },
    { name: 'chrome', use: { channel: 'chrome' }, testIgnore: /capturas/ },
  ],
});

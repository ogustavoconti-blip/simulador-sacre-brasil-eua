import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

// Política de segurança de conteúdo só no build: a página não consegue enviar dados para fora.
// (No modo de desenvolvimento ela atrapalharia o recarregamento automático.)
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; " +
  "connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'";

const csp = (): Plugin => ({
  name: 'csp-no-build',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<!--CSP-->', `<meta http-equiv="Content-Security-Policy" content="${CSP}">`),
});

export default defineConfig({
  base: './',
  plugins: [react(), csp()],
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
});

# Simulador Sacre de Eficiência Brasil–EUA

Simulador web público para brasileiros residentes fiscais nos EUA que investem no Brasil por conta CNR (Light ou Full). Mostra o IR retido no Brasil, como os EUA tributam a renda, quanto vira Foreign Tax Credit, o teto anual, o saldo e estratégias comparadas.

> **Não é cálculo tributário.** É embasamento para decisões financeiras no Brasil. Os resultados são simulações e não substituem o contador nos EUA, o tributarista no Brasil e o assessor de investimentos.

**Privacidade:** sem login, sem cadastro, sem cookies e sem armazenamento no navegador. Todo o cálculo roda no navegador; nada digitado é enviado a servidor.

## Situação

| Etapa | Situação |
|---|---|
| 1. Plano e protótipo | Concluída: [`docs/PLANO.md`](docs/PLANO.md) e [`docs/prototipo/index.html`](docs/prototipo/index.html) |
| 2. Motores de cálculo e testes da seção 17 | Concluída |
| 3. Parâmetros com fonte oficial e rotina de dados de mercado | Concluída |
| 4. Interface | Concluída (React + Vite, cálculo em Web Worker) |
| 5. Revisão | Concluída: [relatório de testes](docs/revisao/RELATORIO_TESTES.md), [capturas](docs/revisao/capturas/) e [pendências](docs/PENDENCIAS.md) |
| 6. Publicação | Concluída: **<https://ogustavoconti-blip.github.io/simulador-sacre-brasil-eua/>** · [QR code](docs/publicacao/) · [passo a passo](docs/PUBLICACAO.md) |

Antes de divulgar o link: aprovação do compliance, conferência do contador e teste no Safari e no Firefox ([`docs/PENDENCIAS.md`](docs/PENDENCIAS.md), seção 1).

## Documentos

| Documento | Para quê |
|---|---|
| [`docs/PUBLICACAO.md`](docs/PUBLICACAO.md) | Publicar, domínio próprio e QR code do e-book |
| [`docs/ATUALIZACAO_ANUAL.md`](docs/ATUALIZACAO_ANUAL.md) | Revisar os parâmetros tributários todo ano |
| [`docs/NOVO_ESTADO.md`](docs/NOVO_ESTADO.md) | Incluir um estado no Modo A |
| [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md) | O que falta confirmar e as premissas adotadas |
| [`docs/VALIDACAO_CONTADOR.md`](docs/VALIDACAO_CONTADOR.md) | Os 3 casos para o contador americano conferir |
| [`docs/revisao/RELATORIO_TESTES.md`](docs/revisao/RELATORIO_TESTES.md) | Resultado dos testes da seção 17 |
| [`docs/PLANO.md`](docs/PLANO.md) | Arquitetura, modelo de dados e registro de decisões |

## Como rodar

Requer Node.js 20 ou mais novo.

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Simulador em <http://localhost:5173> |
| `npm test` | Testes dos motores (Vitest) |
| `npm run typecheck` | Checagem de tipos |
| `npm run build` | Site estático em `dist/`, com a política de segurança (CSP) |
| `npm run e2e` | Testes de ponta a ponta no Edge e no Chrome instalados, mais as capturas de tela |
| `npm run mercado` | Atualiza `public/dados/mercado.json` pelas APIs do Banco Central |
| `npm run qrcode -- <link>` | Gera o QR code do link em `docs/publicacao/` |

## Automação (GitHub Actions)

- [`publicar.yml`](.github/workflows/publicar.yml): a cada mudança na branch `main`, roda os testes, gera o site e publica no GitHub Pages. Se um teste falhar, nada é publicado.
- [`mercado.yml`](.github/workflows/mercado.yml): dias úteis às 08:30 de Brasília, busca SGS e Focus no Banco Central e grava os dados se mudaram. Em seguida, o site é publicado de novo.

## Estrutura

```
public/
  parametros/               regras tributárias versionadas (JSON): valor, fonte, url, data e status
    brasil.json
    eua_federal_2026.json
    estados/<UF>.json       9 estados do Modo A
  dados/mercado.json        CDI, Selic, IPCA, câmbio e Focus (atualizado automaticamente)
src/
  motores/                  cálculo puro, sem interface
    tipos.ts                tipos compartilhados
    parametros.ts           validação dos JSON e resolução das regras pendentes
    calendario.ts           datas
    mercado.ts              CDI, Selic, IPCA e câmbio: histórico + projeção
    fluxos.ts               valor na curva, cupons, resgates e vencimento de cada aplicação
    motor-brasil.ts         IR retido no Brasil por evento
    motor-eua-federal.ts    reconhecimento nos EUA (OID, cupons, curto prazo, câmbio §988), faixas, teto, NIIT
    motor-credito.ts        crédito: próprio ano, 1 ano para trás, 10 para frente, expiração
    motor-estados.ts        Modo A e Modo B
    motor-cenarios.ts       simulação completa, estratégias, otimizador, decomposição, taxa de equilíbrio
    index.ts                entrada única: valida, monta o mercado e roda
  worker/                   Web Worker que chama os motores
  ui/                       interface (React): etapas, resultados, gráficos e textos
    arquivos-parametros.ts  arquivo federal vigente e lista do Modo A (único ponto a mudar na revisão anual)
  estilo/                   CSS com a identidade visual Sacre
scripts/
  atualizar-mercado.mjs     coleta do Banco Central
  gerar-qrcode.mjs          QR code do link
tests/
  unit/                     seção 17 do prompt, coerência do motor e casos do contador
  e2e/                      interface, privacidade e capturas (Playwright)
docs/                       plano, protótipo, revisão e guias
```

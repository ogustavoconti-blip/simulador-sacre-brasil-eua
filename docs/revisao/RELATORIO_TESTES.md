# Relatório de testes · Etapa 5

Simulador Sacre de Eficiência Brasil–EUA · revisão de 02/10/2026 · parâmetros revisados em 01/10/2026 · dados de mercado de 01/10/2026.

## Resumo

| Bateria | Resultado | Como rodar |
|---|---|---|
| Motores de cálculo (Vitest) | **72 aprovados**, 1 desligado de propósito (a gravação do documento do contador) | `npm test` |
| Interface e privacidade, de ponta a ponta (Playwright) | **24 aprovados**: 10 no Edge, 10 no Chrome e 4 de capturas | `npm run e2e` |
| Checagem de tipos (TypeScript) | Sem erros | `npm run typecheck` |
| Build de produção | Gerado em `dist/`, com a política de segurança (CSP) | `npm run build` |

## Seção 17 do prompt, critério por critério

| Critério | Situação | Onde está o teste |
|---|---|---|
| 17.1 Imposto federal no topo de cada faixa (Single e MFJ) | Aprovado | `tests/unit/s17-federal.test.ts` |
| 17.2 Renda em que a alíquota média atinge 15%, 17,5%, 20% e 22,5% | Aprovado | `tests/unit/s17-federal.test.ts` |
| 17.3 Ordem do saldo: próprio ano, 1 para trás, 10 para frente | Aprovado | `tests/unit/s17-credito.test.ts` |
| 17.4 Ano com dedução consome saldo sem gerar crédito | Aprovado | `tests/unit/s17-credito.test.ts` |
| 17.5 Expiração no fim do ano N+10 | Aprovado | `tests/unit/s17-credito.test.ts` |
| 17.6 Tabela regressiva nos limites de 180, 181, 360, 361, 720 e 721 dias | Aprovado | `tests/unit/s17-brasil.test.ts` |
| 17.7 Imóvel (Fase 2): R$ 6 mi → R$ 925 mil; R$ 12 mi → R$ 2,025 mi | Aprovado | `tests/unit/s17-brasil.test.ts` |
| 17.8 Light × Full com alíquotas diferentes para Tesouro, CDB e debêntures | Aprovado | `tests/unit/s17-brasil.test.ts` |
| 17.9 Estados: 9 do Modo A com estadual zero e fonte; Modo B sem alíquota; Modo B com 5% sem mudar teto e crédito | Aprovado | `tests/unit/s17-estados.test.ts` |
| 17.10 Sem rolagem da página em 1366×768 e 1920×1080 | Aprovado, em todas as 7 etapas e nas 6 abas de resultado. Também em 1366×650 (área útil real de um notebook) | `tests/e2e/interface.spec.ts` |
| 17.10 Chrome, Edge, Safari e Firefox | **Aprovado no Chrome e no Edge.** Safari e Firefox não estão instalados nesta máquina: conferir à mão (ver pendências) | `tests/e2e/interface.spec.ts` |
| 17.10 Celular, layout empilhado | Aprovado em 390×844: aviso "melhor no computador" e nenhuma rolagem lateral | `tests/e2e/interface.spec.ts` |
| 17.10 Nenhuma requisição leva dados digitados | Aprovado: só `GET` ao próprio site, sem parâmetros na URL; valores digitados de propósito (US$ 987.654 e R$ 424.242) não aparecem em nenhum pedido | `tests/e2e/interface.spec.ts` |
| 17.10 Sem cookies e sem armazenamento | Aprovado: cookies, `localStorage`, `sessionStorage` e IndexedDB vazios depois do fluxo completo | `tests/e2e/interface.spec.ts` |
| 17.11 Três casos conferidos por contador americano | **Preparado, falta o contador.** Os 3 casos, com os números do simulador e a tabela de conferência, estão em [`docs/VALIDACAO_CONTADOR.md`](../VALIDACAO_CONTADOR.md) | `tests/unit/casos-contador.test.ts` |

## Outros testes

| Teste | Resultado |
|---|---|
| Cada parâmetro tem valor, fonte, link, data de verificação e status; regra pendente traz as interpretações | Aprovado (`parametros.test.ts`) |
| Lista de estados do Modo A bate com os arquivos da pasta | Aprovado (`s17-estados.test.ts`) |
| Simulação completa da carteira de exemplo: memória de cálculo, decomposição, otimizador e liquidez | Aprovado (`integracao.test.ts`, 16 testes) |
| Validação da entrada: datas, valores e campos faltando | Aprovado (`entrada.test.ts`) |
| Etapas travadas até o "Entendi" e aviso completo no rodapé | Aprovado |
| Carteira com um único CDB de R$ 100 mil: total aplicado de R$ 100 mil (erro do protótipo corrigido) e troca USD/BRL | Aprovado |
| Produto aceita prefixado e IPCA+, não só % do CDI (erro do protótipo corrigido) | Aprovado |
| CSV gerado no navegador (acentos certos no Excel) e memória de cálculo | Aprovado |
| Carga inicial abaixo de 2 segundos | Aprovado em servidor local (cerca de 0,8 s). O site pesa 1,1 MB sem compressão; o código principal tem 127 kB comprimido |

## Defeitos achados na revisão e corrigidos

1. **Tela de resultados em branco depois de apagar aplicações.** Enquanto o novo cálculo rodava, a aba Alternativas lia uma aplicação que já tinha sido removida. Corrigido. A tela agora também tem uma proteção: se uma parte falhar, aparece um aviso no lugar dela e o resto continua funcionando.
2. **Carga do isento na aba Alternativas.** Usava uma média da carteira inteira (12,6% na carteira de exemplo), diferente da aba Por produto (25,2% na LCA). Passou a usar o imposto americano da própria aplicação. A tabela ganhou a coluna "carga do isento".
3. **Projeção do Focus com 4 casas decimais** (IPCA de 4,9915%). Arredondada para 2 casas.
4. **Ícone da aba do navegador ausente** (erro 404 no console). Incluído.
5. **Texto interno** ("Pendência 2 do prompt v3") aparecia para o usuário em Entenda o cálculo. Reescrito.
6. **Tabelas largas quebravam números em duas linhas** em 1366×768. Ajustado.

## Capturas de tela

Pasta [`docs/revisao/capturas/`](capturas/), geradas pelo próprio teste (`tests/e2e/capturas.spec.ts`) com a carteira de exemplo:

- `1920x1080/` e `1366x768/`: as 7 etapas, as 6 abas de resultado, a memória de cálculo e o resultado em reais (14 imagens em cada).
- `celular/`: boas-vindas, investimentos e resultados.
- `impressao-pdf.png` e [`exemplo-resultado.pdf`](exemplo-resultado.pdf): o PDF que o usuário salva pelo botão "Salvar resultado em PDF".

## Ambiente

Windows 11, Node.js 24.19.0, Microsoft Edge e Google Chrome atuais (Playwright 1.63 usando os navegadores já instalados).

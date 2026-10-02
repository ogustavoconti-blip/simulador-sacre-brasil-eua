# Guia de atualização anual dos parâmetros

Os parâmetros tributários **não são puxados automaticamente**: não existe fonte oficial única em formato de dados. Ficam em arquivos JSON na pasta `public/parametros/`, revisados **ao menos uma vez por ano e sempre que a lei mudar**. A data da última revisão aparece na tela.

Os dados de mercado (CDI, Selic, IPCA, câmbio e Focus) são outra coisa: se atualizam sozinhos em dias úteis.

## Calendário

| Quando | O quê | Fonte |
|---|---|---|
| Outubro ou novembro | Faixas federais, dedução padrão e faixas de ganho de capital do ano seguinte | Rev. Proc. anual do IRS (a de 2026 foi a Rev. Proc. 2025-32) |
| Janeiro | Conferir se algo mudou no Brasil (IR da renda fixa, isenções, IOF, CNR) e nos 9 estados do Modo A | Planalto, Receita Federal, Tesouro Nacional, sites oficiais dos estados |
| A qualquer momento | Mudança de lei | Fonte oficial da mudança |

## Como cada regra é escrita

Toda regra tem 5 campos obrigatórios. Se faltar um, os testes falham e o site não é publicado.

```json
"aliquota": {
  "status": "confirmado",
  "valor": 0.15,
  "fonte": "Lei 11.033/2004, art. 1º, IV",
  "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11033.htm",
  "data_verificacao": "2027-01-15"
}
```

Regra ainda não confirmada: `"status": "pendente"`, com `id`, `rotulo` e a lista de `interpretacoes`. O simulador calcula todas e mostra lado a lado:

```json
"prazo_light": {
  "status": "pendente",
  "id": "brasil.cupons.prazo_light",
  "rotulo": "IR sobre cupons na CNR Light: prazo da tabela regressiva",
  "interpretacoes": [
    { "id": "compra", "rotulo": "Prazo contado da compra", "valor": "desde_compra" },
    { "id": "ultimo_cupom", "rotulo": "Prazo contado do último cupom", "valor": "desde_ultimo_cupom" }
  ],
  "fonte": "...", "url": "...", "data_verificacao": "..."
}
```

Ao confirmar uma pendência, troque o bloco por um `confirmado` com o `valor` da interpretação certa.

Campo opcional: `"nota"`, texto curto que aparece em "Entenda o cálculo".

## Passo a passo: faixas federais do novo ano (exemplo: 2027)

1. Em `public/parametros/`, copie `eua_federal_2026.json` para `eua_federal_2027.json`. **Não apague o de 2026**: os testes da seção 17 usam os valores de 2026.
2. No arquivo novo, troque `"ano": 2026` por `"ano": 2027`.
3. Atualize, com a Rev. Proc. nova (seção de faixas da tabela de cada status):
   - `faixas` de `single`, `mfj`, `mfs` e `hoh`;
   - `deducao_padrao` dos 4 status;
   - `ganho_capital_qualificado` dos 4 status.
4. Confira, sem esperar mudança: `niit` (3,8% e limites de US$ 200 mil, 250 mil e 125 mil, fixados em lei e não corrigidos pela inflação), `credito` (1 ano para trás e 10 para frente) e `curto_prazo_meses` (12).
5. Em cada regra: `fonte` (número da Rev. Proc. e seção), `url` do PDF no irs.gov e `data_verificacao`.
6. Em `src/ui/arquivos-parametros.ts`, troque `eua_federal_2026.json` por `eua_federal_2027.json`. É o único lugar do código a mudar; as telas leem o ano do próprio arquivo.

## Passo a passo: Brasil

Arquivo `public/parametros/brasil.json`:

1. Atualize `revisado_em` com a data da revisão (é a data que aparece na tela) e `versao`.
2. Confira e, se preciso, atualize: `tabela_regressiva`, `iof_regressivo` (30 valores, do dia 1 ao dia 30), `regimes.light` e `regimes.full` (alíquota e IOF de cada produto), `cupons` (cupom do Tesouro e regra dos cupons na Light) e `imoveis` (Fase 2).
3. Em cada regra conferida, atualize `data_verificacao`, mesmo sem mudança de valor.

## Passo a passo: estados do Modo A

Para cada arquivo em `public/parametros/estados/`, confira na página oficial do estado se continua sem imposto sobre juros e dividendos e atualize `data_verificacao`. Se um estado passar a cobrar, ele sai do Modo A: apague o arquivo e tire a sigla de `src/ui/arquivos-parametros.ts`. O simulador passa a tratá-lo pelo Modo B (alerta e alíquota opcional). Para incluir um estado, ver [`NOVO_ESTADO.md`](NOVO_ESTADO.md).

## Publicar

**Pelo site do GitHub, sem instalar nada:** abra o arquivo no repositório, clique no lápis (**Edit**), altere e clique em **Commit changes**. Para criar o arquivo do ano novo: **Add file → Create new file**, cole o conteúdo do anterior e ajuste.

**No computador:**

```bash
npm test
```

```bash
git add -A
```

```bash
git commit -m "Parâmetros revisados em 2027-01-15"
```

```bash
git push
```

Nos dois casos, o GitHub roda os testes e publica sozinho. Acompanhe na aba **Actions**: verde é publicado; vermelho significa que algum campo ficou errado, e o site continua na versão anterior. Clique no item vermelho para ver qual teste falhou.

## Depois de publicar

1. Abra o site e confira em "Entenda o cálculo" a data de revisão e a lista de regras.
2. Se os valores mudaram, gere de novo os casos do contador (no Git Bash: `GERAR_CASOS=1 npx vitest run casos-contador`; no PowerShell: `$env:GERAR_CASOS=1; npx vitest run casos-contador`) e registre a revisão no "Registro de decisões" de `docs/PLANO.md`.

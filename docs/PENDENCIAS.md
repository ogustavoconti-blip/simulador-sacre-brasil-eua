# Pendências

Situação em 02/10/2026. Cada pendência de regra aparece também no próprio simulador, em "Entenda o cálculo", e as regras com mais de uma interpretação mostram os dois resultados lado a lado.

## 1. Antes de divulgar o link (exigências do prompt)

| # | Pendência | Quem resolve | Referência |
|---|---|---|---|
| 1.1 | **Aprovação do compliance do BTG Pactual e da Sacre** (regras da CVM para assessores e materiais ao público), para o simulador e para o e-book | Sacre | Seção 16 |
| 1.2 | **Conferência de 3 casos por um contador americano**, com as diferenças documentadas. Casos prontos, com os números do simulador e a tabela para o contador preencher | Contador indicado pela Sacre | Seção 17.11 · [`VALIDACAO_CONTADOR.md`](VALIDACAO_CONTADOR.md) |
| 1.3 | **Teste no Safari e no Firefox.** Chrome e Edge foram testados automaticamente; Safari (iPhone ou Mac) e Firefox não estão nesta máquina. Basta abrir o link, percorrer as 7 etapas e trocar USD/BRL | Sacre | Seção 17.10 |
| 1.4 | **Domínio próprio antes de imprimir o QR code** (recomendado). O link do GitHub Pages fica preso ao nome da conta pessoal; um subdomínio da Sacre deixa o link do e-book estável para sempre | Sacre | [`PUBLICACAO.md`](PUBLICACAO.md), passo 7 |

## 2. Regras ainda não confirmadas (o simulador mostra as interpretações)

| # | Regra | Como o simulador trata | Para resolver |
|---|---|---|---|
| 2.1 | **IR sobre cupons na CNR Light:** o prazo da tabela regressiva conta da compra ou do último cupom? | Calcula as duas interpretações e mostra lado a lado. Há indício a favor da compra (material do Tesouro Direto) | Texto oficial da IN RFB 1.585/2015 ou confirmação do BTG |
| 2.2 | **NIIT sobre o ganho cambial do §988** | Uma interpretação, a conservadora: o ganho cambial entra na renda de investimentos do NIIT | Contador americano |

## 3. Assumidas por confirmação da Sacre, sem fonte documental

| # | Regra | Observação |
|---|---|---|
| 3.1 | Debêntures incentivadas isentas na CNR Light | Confirmação da Sacre com o BTG (registro de 01/10/2026) |
| 3.2 | CDB e debêntures comuns com 15% na CNR Full, em qualquer prazo | Verificada pela Sacre; o manual da B3 para investidor não residente não foi relido |

## 4. Aproximações e premissas (selo "aproximação" ou "premissa" na tela)

| # | Tema | Premissa atual |
|---|---|---|
| 4.1 | Classificação americana dos títulos (CDI, IPCA+, cupons indexados) | Juros reconhecidos ano a ano (OID) pelo rendimento na curva; até 1 ano de prazo, no resgate (§1283). Classificação final pelo contador |
| 4.2 | Reinvestimento | Espaço reservado. Hoje o valor resgatado, líquido do IR brasileiro, vira dólar na data e fica parado. Isso favorece "manter até o vencimento" nas comparações |
| 4.3 | Venda antes do vencimento | Pela curva contratada, sem marcação a mercado (Tesouro e debêntures podem valer mais ou menos no mercado) |
| 4.4 | Dias úteis | Aproximados pelos dias corridos |
| 4.5 | CDI futuro | Selic projetada menos o diferencial médio dos últimos 12 meses |
| 4.6 | Trajetória dentro do ano | Linha reta entre os pontos de fim de ano do Focus; depois do último ano do Focus, mantém o último valor |
| 4.7 | Faixas americanas futuras | As do ano vigente, nominais, salvo correção pela inflação informada |
| 4.8 | Data de emissão não informada | Igual à data de compra |
| 4.9 | Fora desta versão | AMT, regra de minimis do §904(j), previdência privada, ações, FIIs, imóveis, day trade (Fase 2) |
| 4.10 | Imposto estadual fora do Modo A | Sem cálculo; o usuário pode informar uma alíquota estimada, sem crédito |

## 5. Seção 18 do prompt

| # | Pendência do prompt | Situação |
|---|---|---|
| 1 | Debêntures incentivadas na Light | Resolvida pela Sacre (item 3.1) |
| 2 | Momento e alíquota do IR sobre cupons na Light | **Aberta** (item 2.1) |
| 3 | IOF regressivo em cada regime | Resolvida: Decreto 6.306/2007, conferido no Planalto. Vale para Tesouro, CDB e LCI; não vale para LCA, CRI, CRA e debêntures |
| 4 | Classificação americana de cada título | Aproximação sinalizada (item 4.1) |
| 5 | Estados do Modo A, inclusive o ganho de capital de Washington | Resolvida: 9 estados conferidos em páginas oficiais; o imposto de Washington sobre ganho de capital aparece como observação (não incide na renda fixa levada pela curva) |
| 6 | Faixas de ganho de capital de 2026 (Fase 2) | Já carregadas (Rev. Proc. 2025-32); usadas hoje só para empilhar ganhos qualificados informados |
| 7 | Previdência privada | Fora do escopo |
| 8 | Day trade e FII na Full | Fase 2 |

## 6. Operação

| # | Ponto | Observação |
|---|---|---|
| 6.1 | Atualização anual dos parâmetros | Faixas federais de 2027 saem em outubro ou novembro de 2026 (Rev. Proc. do IRS). Passo a passo em [`ATUALIZACAO_ANUAL.md`](ATUALIZACAO_ANUAL.md) |
| 6.2 | Rotina diária de dados de mercado | Roda no GitHub Actions em dias úteis. Se falhar, o site continua com o último arquivo válido e mostra a data. Conferir a aba Actions de vez em quando |
| 6.3 | Cabeçalhos de segurança | O GitHub Pages não permite configurar cabeçalhos; a política de segurança (CSP) vai no próprio HTML. Num domínio próprio com CDN, dá para acrescentar os cabeçalhos completos |

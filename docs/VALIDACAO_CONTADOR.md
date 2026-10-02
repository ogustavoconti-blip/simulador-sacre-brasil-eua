# Validação com contador americano (seção 17.11)

Três casos para um contador habilitado nos EUA conferir. Cada linha da tabela é um número do simulador; o contador preenche o valor dele e comenta as diferenças. As diferenças ficam documentadas aqui antes da publicação.

**Premissas comuns (mercado constante, para a conta poder ser refeita à mão):** CDI de 14% a.a.; Selic de 14,1% a.a.; IPCA de 4,5% a.a.; câmbio de R$ 5,20 por US$ hoje e no fim de 2026, subindo R$ 0,15 por ano (5,35 no fim de 2027, 5,50 em 2028, 5,65 em 2029), em linha reta dentro do ano. Faixas federais de 2026 em todos os anos. Juros (OID) de cada ano convertidos pelo câmbio médio do ano; IR retido e pagamentos, pelo câmbio do dia. O que ainda estiver aplicado no fim do horizonte é resgatado em 31/12.

**Valores negativos de IR federal a mais** são esperados em anos com perda cambial: a perda do §988 é de fonte americana e reduz a renda tributável total, enquanto o teto do crédito segue a renda estrangeira (Form 1116). O crédito então abate imposto que, sem o Brasil, recairia sobre outras rendas. Vale a conferência do contador justamente nesse ponto.

> Números gerados pelo próprio simulador (`GERAR_CASOS=1 npx vitest run casos-contador`). Se um parâmetro mudar, gere de novo antes de enviar ao contador.

## Caso 1 · CDB de 3 anos na Light, IR só no vencimento

- **Perfil:** Single, Flórida (Modo A), renda tributável de US$ 120.000 sem o Brasil.
- **Conta:** CNR Light.
- CDB 102% do CDI, R$ 500.000, compra 05/01/2026, vencimento 15/12/2028, mantido até o vencimento.

| Ano | Juros e OID (fonte estrangeira) | Câmbio §988 (fonte EUA) | IR e IOF retidos no Brasil | Renda estrangeira tributável (Form 1116) | Teto do crédito | Crédito ou dedução | Crédito usado | IR federal a mais, depois do crédito | NIIT a mais | Estadual | Saldo de crédito no fim do ano |
|---|--:|--:|--:|--:|--:|---|--:|--:|--:|--:|--:|
| 2026 | US$ 13.588 | US$ 0 | US$ 0 | US$ 12.127 | US$ 2.238 | crédito | US$ 0 | US$ 3.261 | US$ 0 | US$ 0 | US$ 0 |
| 2027 | US$ 15.468 | US$ 0 | US$ 0 | US$ 13.825 | US$ 2.563 | crédito | US$ 2.563 | US$ 1.150 | US$ 0 | US$ 0 | US$ 0 |
| 2028 | US$ 16.399 | US$ -6.691 | US$ 6.585 | US$ 14.668 | US$ 2.683 | crédito | US$ 2.683 | US$ -353 | US$ 0 | US$ 0 | US$ 1.339 |
| 2029 | US$ 0 | US$ 0 | US$ 0 | US$ 0 | US$ 0 | crédito | US$ 0 | US$ 0 | US$ 0 | US$ 0 | US$ 1.339 |

**Totais do horizonte:** juros US$ 45.456; IR e IOF no Brasil US$ 6.585; IR federal a mais depois do crédito US$ 4.058; NIIT US$ 0; estadual US$ 0; crédito expirado US$ 0; saldo no fim US$ 1.339; carga efetiva 23,4%.

**Conferência do contador**

| Item | Simulador | Contador | Diferença | Comentário |
|---|--:|--:|--:|---|
| IR federal a mais, depois do crédito (soma) | US$ 4.058 | | | |
| Crédito usado (soma) | US$ 5.246 | | | |
| Saldo de crédito no fim | US$ 1.339 | | | |
| NIIT (soma) | US$ 0 | | | |
| Classificação do título nos EUA (OID, cupons, §1283, §988) | conforme a tabela acima | | | |

## Caso 2 · Tesouro com cupons e CDB na Full, com NIIT

- **Perfil:** MFJ, Texas (Modo A), renda tributável de US$ 260.000 sem o Brasil.
- **Conta:** CNR Full.
- Tesouro IPCA+ com juros semestrais (cupom de 6% a.a.), IPCA + 7%, R$ 800.000, compra 10/03/2026, emissão 10/01/2024, vencimento 15/05/2035; resgatado no fim de 2029 (fim do horizonte).
- CDB 100% do CDI, R$ 300.000, compra 20/01/2026, vencimento 20/07/2027.

| Ano | Juros e OID (fonte estrangeira) | Câmbio §988 (fonte EUA) | IR e IOF retidos no Brasil | Renda estrangeira tributável (Form 1116) | Teto do crédito | Crédito ou dedução | Crédito usado | IR federal a mais, depois do crédito | NIIT a mais | Estadual | Saldo de crédito no fim do ano |
|---|--:|--:|--:|--:|--:|---|--:|--:|--:|--:|--:|
| 2026 | US$ 20.557 | US$ 0 | US$ 0 | US$ 18.441 | US$ 3.453 | crédito | US$ 0 | US$ 4.934 | US$ 781 | US$ 0 | US$ 0 |
| 2027 | US$ 22.743 | US$ -1.059 | US$ 1.845 | US$ 20.418 | US$ 3.827 | crédito | US$ 1.845 | US$ 3.360 | US$ 824 | US$ 0 | US$ 0 |
| 2028 | US$ 18.359 | US$ 0 | US$ 0 | US$ 16.456 | US$ 3.074 | crédito | US$ 0 | US$ 4.406 | US$ 698 | US$ 0 | US$ 0 |
| 2029 | US$ 20.045 | US$ -13.472 | US$ 0 | US$ 17.978 | US$ 3.316 | crédito | US$ 0 | US$ 1.578 | US$ 250 | US$ 0 | US$ 0 |

**Totais do horizonte:** juros US$ 81.705; IR e IOF no Brasil US$ 1.845; IR federal a mais depois do crédito US$ 14.277; NIIT US$ 2.553; estadual US$ 0; crédito expirado US$ 0; saldo no fim US$ 0; carga efetiva 22,9%.

**Conferência do contador**

| Item | Simulador | Contador | Diferença | Comentário |
|---|--:|--:|--:|---|
| IR federal a mais, depois do crédito (soma) | US$ 14.277 | | | |
| Crédito usado (soma) | US$ 1.845 | | | |
| Saldo de crédito no fim | US$ 0 | | | |
| NIIT (soma) | US$ 2.553 | | | |
| Classificação do título nos EUA (OID, cupons, §1283, §988) | conforme a tabela acima | | | |

## Caso 3 · Estado do Modo B com alíquota estimada, isento e debênture comum na Light

- **Perfil:** Single, Califórnia (Modo B, alíquota estadual estimada de 9,3%), renda tributável de US$ 90.000 sem o Brasil.
- **Conta:** CNR Light.
- LCA 95% do CDI, R$ 400.000, compra 01/02/2026, vencimento 01/02/2028.
- Debênture comum IPCA + 7% com cupons semestrais, R$ 200.000, compra 15/04/2026, vencimento 15/04/2031, resgate total em 01/07/2029.

| Ano | Juros e OID (fonte estrangeira) | Câmbio §988 (fonte EUA) | IR e IOF retidos no Brasil | Renda estrangeira tributável (Form 1116) | Teto do crédito | Crédito ou dedução | Crédito usado | IR federal a mais, depois do crédito | NIIT a mais | Estadual | Saldo de crédito no fim do ano |
|---|--:|--:|--:|--:|--:|---|--:|--:|--:|--:|--:|
| 2026 | US$ 11.860 | US$ 0 | US$ 271 | US$ 10.241 | US$ 1.721 | crédito | US$ 271 | US$ 2.338 | US$ 0 | US$ 1.103 | US$ 0 |
| 2027 | US$ 15.782 | US$ 0 | US$ 482 | US$ 13.697 | US$ 2.329 | crédito | US$ 482 | US$ 2.992 | US$ 0 | US$ 1.468 | US$ 0 |
| 2028 | US$ 5.605 | US$ -2.808 | US$ 420 | US$ 4.797 | US$ 782 | crédito | US$ 782 | US$ -167 | US$ 0 | US$ 260 | US$ 0 |
| 2029 | US$ 2.913 | US$ -2.817 | US$ 1.120 | US$ 2.483 | US$ 401 | crédito | US$ 401 | US$ -379 | US$ 0 | US$ 9 | US$ 358 |

**Totais do horizonte:** juros US$ 36.160; IR e IOF no Brasil US$ 2.293; IR federal a mais depois do crédito US$ 4.784; NIIT US$ 0; estadual US$ 2.840; crédito expirado US$ 0; saldo no fim US$ 358; carga efetiva 27,4%.

**Conferência do contador**

| Item | Simulador | Contador | Diferença | Comentário |
|---|--:|--:|--:|---|
| IR federal a mais, depois do crédito (soma) | US$ 4.784 | | | |
| Crédito usado (soma) | US$ 1.935 | | | |
| Saldo de crédito no fim | US$ 358 | | | |
| NIIT (soma) | US$ 0 | | | |
| Classificação do título nos EUA (OID, cupons, §1283, §988) | conforme a tabela acima | | | |

## Diferenças documentadas

_A preencher depois do retorno do contador: item, valor do simulador, valor do contador, causa e se o simulador foi ajustado._

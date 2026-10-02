# Como incluir um estado no Modo A

## O que é o Modo A

Estados **sem imposto estadual sobre juros e dividendos de pessoa física**, confirmados em fonte oficial do próprio estado. Para eles, o simulador mostra o selo "Estado incluído" e o imposto estadual sobre a renda fixa do Brasil é zero.

Hoje são 9: Flórida, Texas, Nevada, Wyoming, Dakota do Sul, Alasca, Tennessee, New Hampshire e Washington.

Os demais estados ficam no **Modo B**: o resultado é federal, com o selo "Imposto estadual não incluído" e um alerta; o usuário pode informar uma alíquota estimada, aplicada sobre a renda do Brasil, sem crédito.

## Quando um estado entra

Só quando a fonte oficial do estado (Department of Revenue ou lei estadual) disser que **não há imposto sobre juros e dividendos**. Estados com imposto sobre a renda, mesmo baixo, ficam no Modo B. Calcular o imposto de um estado com imposto sobre a renda (faixas, deduções, crédito por imposto estrangeiro) é outra versão do simulador; o arquivo já tem campos reservados para isso (`faixas`, `deducoes`, `credito_imposto_estrangeiro` e outros), hoje `null`.

## Passo a passo

Exemplo com um estado fictício de sigla `XX`.

1. Em `public/parametros/estados/`, copie `FL.json` para `XX.json`. O nome do arquivo é a sigla em maiúsculas.
2. Preencha:

   ```json
   {
     "sigla": "XX",
     "nome": "Nome do estado em português",
     "modo": "A",
     "tem_imposto_juros_dividendos": {
       "status": "confirmado",
       "valor": false,
       "fonte": "Órgão oficial e o que diz a página",
       "url": "https://pagina-oficial-do-estado",
       "data_verificacao": "AAAA-MM-DD",
       "nota": "Confirmado em página oficial do governo estadual em DD/MM/AAAA."
     },
     "observacoes": [],
     "base_inicial": null,
     "faixas": null,
     "deducoes": null,
     "juros_estrangeiros": null,
     "credito_imposto_estrangeiro": null,
     "impostos_locais": null,
     "residencia": null,
     "ganho_capital_especifico": null
   }
   ```

   Em `observacoes`, registre o que o investidor precisa saber e não entra no cálculo. Exemplo de Washington: o imposto estadual sobre ganho de capital de longo prazo.
3. Em `src/ui/arquivos-parametros.ts`, acrescente `'XX'` à lista `ESTADOS_MODO_A`.
4. Confira se o estado está na lista de nomes de `src/ui/textos.ts` (`ESTADOS`). Os 50 estados e o Distrito de Colúmbia já estão.
5. Rode os testes (`npm test`) ou publique pelo site do GitHub, que roda os testes sozinho (ver [`ATUALIZACAO_ANUAL.md`](ATUALIZACAO_ANUAL.md), "Publicar"). Os testes conferem que:
   - a sigla da lista tem arquivo, e o arquivo está na lista;
   - a sigla dentro do arquivo é igual ao nome do arquivo;
   - a regra tem fonte, link e data;
   - o imposto estadual do estado sobre a renda fixa dá zero.
6. No site publicado, escolha o estado na etapa 2: ele deve aparecer no grupo "Estados incluídos", com o selo verde. Em "Entenda o cálculo", a fonte aparece na tabela de regras.

## Como tirar um estado do Modo A

Se um estado passar a cobrar imposto sobre juros e dividendos: apague o arquivo dele, tire a sigla de `src/ui/arquivos-parametros.ts` e publique. Ele passa a ser tratado pelo Modo B. Registre a mudança no "Registro de decisões" de `docs/PLANO.md`.

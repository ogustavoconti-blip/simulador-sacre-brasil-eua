# Simulador Sacre de Eficiência Brasil–EUA · Plano (Etapa 1)

**Status:** aguardando aprovação · **Data:** 01/10/2026 · **Referências:** Prompt v3 e Nota Técnica "Crédito do IR brasileiro na declaração americana" (rev. 01/10/2026)

Este documento cobre o item 6 da seção 3 do prompt: **(a) arquitetura, (b) modelo de dados, (c) protótipos das telas e (d) dúvidas e regras a confirmar.** Ainda não existe código de produção. Nenhuma regra tributária foi tomada como confirmada; a verificação com fonte oficial é a Etapa 3.

- **Protótipo navegável:** [`docs/prototipo/index.html`](prototipo/index.html). Abra no Chrome ou no Edge. No botão "Protótipo ▾" da barra superior você vê a tela em 1920×1080, 1366×768, 1366×650 (área útil real), 1536×864, 1440×900 e celular.
- **Valores do protótipo:** ilustrativos, mas coerentes entre si e com as faixas federais de 2026 informadas no prompt. Não são resultado de cálculo. Só o painel da etapa 4 (carteira) e a troca de moeda já reagem ao que se digita.

## Registro de decisões

| Data | Decisão | Origem |
|---|---|---|
| 01/10/2026 | Telas 1 (boas-vindas) e 5 (cenário) aprovadas | Revisão da Sacre |
| 01/10/2026 | **Debêntures incentivadas são isentas no Brasil também na CNR Light.** Sai das pendências; status `confirmado`. Falta a fonte documental para registrar no parâmetro (ver 5.1, item 13) | Confirmação da Sacre |
| 01/10/2026 | Avançado da etapa 2 reescrito: deixa claro que são dados da declaração americana, não dos investimentos no Brasil, com explicação de cada campo | Dúvida da Sacre |
| 01/10/2026 | Etapa 4: remuneração passa a ser **indexador + taxa** (prefixado, % do CDI, CDI + taxa, IPCA + taxa, Selic + taxa). Produtos com indexador fixo (Tesouro, CDB pré, CDB % do CDI, CDB IPCA+) travam o indexador; LCI, LCA, CRI, CRA e debêntures deixam escolher. Tesouro trava o pagamento | Ajuste pedido |
| 01/10/2026 | Painel da etapa 4 ao vivo: total, divisão por tratamento no Brasil e alertas recalculam a cada alteração | Ajuste pedido |
| 01/10/2026 | Moeda do resultado (USD ou BRL) vale para todos os números da etapa 6 e fica sincronizada com a etapa 5 | Ajuste pedido |
| 01/10/2026 | Nova aba **Alternativas** nos resultados: taxa de equilíbrio dos isentos frente a cada produto com IR, teste de troca com a taxa oferecida e outras mudanças simuladas | Pedido da Sacre |
| 01/10/2026 | Definição de "seu plano" explicada na tela (ver seção 3) | Dúvida da Sacre |
| 01/10/2026 | **Plano aprovado.** Início da Etapa 2 (motores e testes) | Sacre |
| 01/10/2026 | Sem logo da Sacre. Mantida a identidade visual (cores e tipografia). O nome "Simulador Sacre de Eficiência Brasil–EUA" aparece em texto | Sacre |
| 01/10/2026 | Publicação na conta GitHub pessoal do responsável | Sacre |
| 01/10/2026 | Reinvestimento depois do resgate: espaço reservado na tela e no motor para opções futuras. Premissa atual: o valor resgatado, líquido do IR no Brasil, vai para dólar na data do resgate e não rende até o fim do horizonte | Sacre |
| 01/10/2026 | Aplicações compradas antes de 2026 entram na simulação, que considera de 2026 em diante (o ano fiscal de 2026 ainda não foi declarado). Os anos até 2025 contam como já declarados, com alerta para o investidor confirmar com o contador se os juros foram declarados e os impostos, pagos | Sacre |
| 01/10/2026 | Cenários: só Mercado (Boletim Focus) e Personalizado. Otimista e pessimista saem | Sacre |
| 01/10/2026 | Sem link de contato no final | Sacre |
| 01/10/2026 | Debêntures incentivadas isentas na Light sem fonte documental: fonte registrada como "confirmação da Sacre com o BTG Pactual, 01/10/2026" | Sacre |
| 01/10/2026 | Node.js LTS instalado (v24.19.0) | Autorizado pela Sacre |
| 01/10/2026 | **Etapa 2 concluída**: motores e 67 testes passando, inclusive os casos 17.1 a 17.9. Ver "Situação da Etapa 2" abaixo | Desenvolvimento |
| 01/10/2026 | **Etapa 3 concluída**: parâmetros conferidos na fonte oficial e rotina diária do BCB. Ver "Situação da Etapa 3" | Desenvolvimento |
| 01/10/2026 | **Etapa 4 concluída**: interface com as 7 etapas ligada aos motores (cálculo em Web Worker). Conferido no navegador em 1366×768 e 1920×1080 sem rolagem da página, celular sem rolagem horizontal, build de produção com CSP: só GET no próprio site, sem cookies e sem armazenamento no navegador | Desenvolvimento |
| 02/10/2026 | **Etapa 5 concluída**: 72 testes dos motores e 24 de ponta a ponta (Edge e Chrome) aprovados; capturas em 1920×1080, 1366×768 e celular; 6 defeitos achados e corrigidos (ver `docs/revisao/RELATORIO_TESTES.md`); pendências em `docs/PENDENCIAS.md`; 3 casos para o contador em `docs/VALIDACAO_CONTADOR.md` | Revisão |
| 02/10/2026 | **Etapa 6 preparada**: publicação automática no GitHub Pages (`publicar.yml`), gerador de QR code e guias de publicação, atualização anual e novo estado. Arquivo federal vigente e lista do Modo A num só lugar (`src/ui/arquivos-parametros.ts`) | Desenvolvimento |
| 02/10/2026 | **Etapa 6 concluída**: site publicado em https://ogustavoconti-blip.github.io/simulador-sacre-brasil-eua/ (conta pessoal do GitHub, repositório público). Os 20 testes de ponta a ponta passaram no site publicado. QR code em `docs/publicacao/`, conferido por leitura automática. Antes de divulgar: compliance, contador, Safari/Firefox e, de preferência, domínio próprio (`docs/PENDENCIAS.md`, seção 1) | Publicação |
| 01/10/2026 | **Correção do plano (5.2, item 4):** a dedução do imposto de renda estrangeiro **não** entra no teto do SALT (§164(b)(6), última frase; Schedule A, linha 6). O motor passou a comparar crédito × dedução ano a ano | Conferência na fonte |
| 01/10/2026 | **Correção do motor:** o IOF deixou de contar como crédito nos EUA (não é imposto de renda). Continua na carga | Revisão |

### Situação da Etapa 3

- **EUA (Rev. Proc. 2025-32, IRS e U.S. Code):** faixas de 2026 dos 4 status, dedução padrão, faixas de ganho de capital, NIIT, crédito (1 para trás, 10 para frente), curto prazo de 1 ano e dedução do imposto estrangeiro fora do SALT. Todos `confirmado`.
- **Brasil (Planalto e Tesouro Nacional):** tabela regressiva, isenções, 0% do Tesouro e das debêntures incentivadas na Full, 0% das incentivadas na Light (Lei 12.431, art. 2º, I, com art. 78 da Lei 8.981 e confirmação Sacre/BTG), tabela e alcance do IOF, cupons do Tesouro (10% e 6% a.a.), ganho de capital em imóveis.
- **Estados:** 9 do Modo A confirmados em páginas oficiais.
- **Dados de mercado:** `scripts/atualizar-mercado.mjs` (SGS 12, 11, 432, 433, 1 e 4389; Focus via Olinda, base de 30 dias) e `.github/workflows/mercado.yml` (dias úteis, 08:30 de Brasília). Se a API falhar ou vier dado fora de faixa, o arquivo anterior fica.
- **Continuam pendentes:** IR sobre cupons na Light (prazo da compra ou do último cupom); ganho cambial no NIIT; 15% da CDB na Full (manual da B3 não relido; vale a verificação da Sacre).

### Situação da Etapa 2

- **Motores prontos:** Brasil, EUA federal (OID, cupons, curto prazo, câmbio §988, teto, NIIT), crédito (próprio ano, 1 para trás, 10 para frente, expiração, ano com dedução), estados (Modo A e B), estratégias, otimizador, decomposição da diferença e taxa de equilíbrio. Entrada única em `src/motores/index.ts` e Web Worker em `src/worker/`.
- **Desempenho:** a carteira de exemplo inteira, com todas as estratégias e o otimizador, roda em menos de 0,2 s.
- **Parâmetros:** os valores do prompt foram para os arquivos JSON. As regras brasileiras já verificadas pela Sacre estão como `confirmado`. As federais e as estaduais estão como `pendente` até a conferência na fonte oficial (Etapa 3). Por isso aparecem com o selo "pendente".
- **Ainda sem parâmetro (a Etapa 3 carrega da fonte oficial):** faixas e dedução padrão de MFS e HoH, faixas de ganho de capital, tabela do IOF regressivo, taxa de cupom do Tesouro com juros semestrais e teto do SALT. Enquanto faltarem, a simulação desses casos devolve "parâmetro ausente" em vez de chutar um valor.
- **Crédito × dedução:** a mecânica do saldo em ano de dedução está pronta e testada (17.4). A escolha automática ano a ano depende do teto do SALT e entra na Etapa 3.
- **Premissa que pesa nos resultados:** sem reinvestimento, o valor resgatado fica parado em dólar. Isso favorece manter as aplicações até o fim. As opções de reinvestimento entram no espaço reservado quando a Sacre definir.

---

## 1. Arquitetura

### 1.1 Visão geral

```
                        ┌──────────────── GitHub (repositório da Sacre) ────────────────┐
                        │                                                                │
  BCB · SGS ─────┐      │  Actions diário: scripts/atualizar-mercado.mjs                 │
  BCB · Focus ───┴────► │      └─ valida e grava public/dados/mercado.json (commit)       │
  (APIs públicas)       │  Actions de publicação: testes → build → GitHub Pages (HTTPS)  │
                        └────────────────────────────────┬───────────────────────────────┘
                                                         │ site estático
                                                         ▼
  ┌──────────────────────────────── Navegador do usuário ─────────────────────────────────┐
  │  index.html + JS (React)  ──GET──►  parametros/*.json, dados/mercado.json (só leitura)  │
  │        │  estado só em memória                                                          │
  │        └── postMessage ──►  Web Worker: motores de cálculo puros + otimizador           │
  │  Sem cookies · sem localStorage/sessionStorage/IndexedDB · nenhum dado digitado sai      │
  └──────────────────────────────────────────────────────────────────────────────────────────┘
```

O navegador só faz requisições `GET` a arquivos estáticos do próprio site. Nada do que o usuário digita entra em URL, cabeçalho ou corpo de requisição.

### 1.2 Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Build | Vite + TypeScript | Build estático, rápido, sem servidor |
| Interface | React | Formulários com estado e painel ao vivo |
| Cálculo | Módulos TypeScript puros, sem DOM | Testáveis sem interface; rodam no Worker |
| Validação dos JSON | zod | Recusa parâmetro malformado ou sem `fonte`, `url`, `data_verificacao`, `status` |
| Gráficos | SVG próprio (componentes React) | Zero dependência, controle total do visual Sacre, imprime bem em PDF. Alternativa: ECharts |
| Testes | Vitest (motores) + Playwright (tela, rede, armazenamento) | Cobrem a seção 17 inteira |
| Fontes | Gelasio e Source Sans 3, licença OFL, embutidas em `woff2` | Sem depender de serviço externo |

### 1.3 Estrutura de pastas

```
/
├─ public/
│  ├─ parametros/
│  │  ├─ brasil.json
│  │  ├─ eua_federal_2026.json
│  │  └─ estados/  FL.json  TX.json  NV.json  WY.json  SD.json  AK.json  TN.json  NH.json  WA.json
│  ├─ dados/mercado.json            ← atualizado pela rotina diária
│  ├─ fonts/                        ← woff2 embutidos
│  └─ logo-sacre.svg                ← aguardando arquivo oficial
├─ src/
│  ├─ motores/                      ← nenhum import de React ou DOM
│  │  ├─ tipos.ts  parametros.ts  calendario.ts  mercado.ts  fluxos.ts
│  │  ├─ motor-brasil.ts  motor-eua-federal.ts  motor-credito.ts
│  │  ├─ motor-estados.ts  motor-cenarios.ts  memoria.ts
│  ├─ worker/simulador.worker.ts
│  ├─ ui/  shell/  etapas/  componentes/  graficos/  exportar/
│  ├─ textos/                       ← avisos, glossário e explicações, separados para o compliance
│  └─ estilo/tokens.css  impressao.css
├─ tests/  unit/  e2e/
├─ scripts/atualizar-mercado.mjs
├─ .github/workflows/  mercado.yml  publicar.yml
└─ docs/  PLANO.md  PUBLICACAO.md  ATUALIZACAO_ANUAL.md  NOVO_ESTADO.md  PENDENCIAS.md  prototipo/
```

### 1.4 Ordem do cálculo

1. **`parametros.ts`** carrega e valida os JSON. Cada regra pendente vira uma lista de interpretações.
2. **`mercado.ts`** monta a trajetória mensal de CDI, Selic, IPCA e câmbio do cenário escolhido (histórico real do BCB até hoje, projeção depois).
3. **`fluxos.ts`** gera, para cada aplicação, o valor na curva em reais mês a mês, cupons, vencimento e resgates do plano.
4. **`motor-brasil.ts`** gera os eventos de retenção: data, base em R$, alíquota, IR em R$, IOF, câmbio do dia e IR em US$.
5. **`motor-eua-federal.ts`** reconhece a renda por ano (OID, cupons, curto prazo, venda, câmbio §988), calcula o imposto federal com e sem os investimentos do Brasil e o NIIT.
6. **`motor-credito.ts`** calcula o teto do Form 1116, aplica a ordem obrigatória do saldo (ano, ano anterior, 10 seguintes, expiração), compara crédito e dedução e monta o Schedule B.
7. **`motor-estados.ts`** aplica Modo A (zero) ou Modo B (alíquota do usuário, sem crédito).
8. **`motor-cenarios.ts`** roda as estratégias, o otimizador e a decomposição da diferença.
9. **`memoria.ts`** guarda, para cada número exibido, a fórmula, os insumos com a origem (regra, usuário, premissa, calculado) e a base legal.

Uma simulação completa custa poucos milissegundos. O otimizador faz milhares de simulações no Worker, com limite de tempo e resultado reprodutível.

### 1.5 Privacidade por construção

- **Política de segurança de conteúdo** na própria página: `connect-src 'self'`, sem scripts, fontes ou imagens de terceiros. Mesmo um erro de programação não consegue enviar dados para fora.
- Nenhuma chamada a `localStorage`, `sessionStorage`, `IndexedDB` ou `document.cookie`. Um teste estático no build falha se alguma dessas palavras aparecer no código.
- O teste do Playwright intercepta toda a rede e confere que só há `GET` a arquivos do próprio site, que os cookies estão vazios e que o armazenamento do navegador continua vazio depois de uma simulação inteira.
- Exportar PDF (impressão do navegador) e CSV (`Blob` local) não envia nada.

### 1.6 Desempenho

- Meta: abaixo de 2 s na primeira carga em conexão comum. Orçamento: JS abaixo de 180 KB comprimido, fontes com subconjunto latino, `mercado.json` abaixo de 60 KB comprimido.
- O cálculo roda no Worker. A tela nunca trava.

### 1.7 Dados de mercado sem servidor

- **Rotina diária (GitHub Actions)** busca no BCB: SGS (CDI, Selic, IPCA, PTAX) e Expectativas/Focus pela API Olinda (Selic, IPCA e câmbio anuais, com mediana, média, desvio-padrão, mínimo e máximo).
- Os códigos de série citados no prompt (12, 432, 433, 1) serão conferidos no portal de dados abertos antes de usar.
- **Validação antes de gravar:** se faltar dado, o valor sair de faixas plausíveis ou a API falhar, o arquivo anterior fica. O site mostra "dados de mercado de dd/mm/aaaa".
- **Parâmetros tributários não são puxados automaticamente.** São revisados pela Sacre ao menos uma vez por ano, e a data aparece na tela.

### 1.8 Hospedagem, link e QR code

- **Recomendação:** GitHub Pages, porque a rotina do BCB já roda no GitHub e tudo fica num lugar só, com HTTPS grátis.
- **Link do e-book:** um subdomínio da Sacre apontando para o Pages (exige acesso ao DNS) ou o endereço padrão do GitHub.
- **QR code:** gerado no build em SVG e PNG, apontando para a página inicial, sem parâmetros.
- Alternativas equivalentes: Cloudflare Pages, Netlify ou Vercel.

### 1.9 Pré-requisito nesta máquina

Node.js e Python não estão instalados. Para as Etapas 2 a 6 preciso do **Node.js LTS**. Proponho instalar com:

```bash
winget install OpenJS.NodeJS.LTS
```

---

## 2. Modelo de dados

### 2.1 Parâmetro rastreável

Toda regra tributária é uma "folha" com os cinco campos obrigatórios do prompt. Uma regra pendente traz as interpretações possíveis, sem escolher uma.

```jsonc
// confirmado
{
  "valor": 0.15,
  "fonte": "B3, Manual do Investidor Não Residente Pessoa Natural (2024)",
  "url": "https://...",
  "data_verificacao": "2026-10-01",
  "status": "confirmado"
}

// pendente
{
  "status": "pendente",
  "fonte": "Lei 11.033/2004, art. 1º; IN RFB 1.585/2015",
  "url": "https://www.planalto.gov.br/...",
  "data_verificacao": "2026-10-01",
  "interpretacoes": [
    { "id": "A", "rotulo": "Prazo da tabela contado da compra", "valor": "desde_compra" },
    { "id": "B", "rotulo": "Prazo da tabela contado do último cupom", "valor": "desde_ultimo_cupom" }
  ]
}
```

```ts
type Status = 'confirmado' | 'pendente';
interface Meta { fonte: string; url: string; data_verificacao: string; nota?: string }
interface Confirmado<T> extends Meta { status: 'confirmado'; valor: T }
interface Pendente<T> extends Meta { status: 'pendente'; interpretacoes: { id: string; rotulo: string; valor: T }[] }
type Param<T> = Confirmado<T> | Pendente<T>;
```

O motor roda uma vez por combinação de interpretações que afeta a carteira do usuário. Na prática são 1 ou 2 combinações.

### 2.2 `parametros/brasil.json`

```ts
interface ParametrosBrasil {
  versao: string;                          // "2026.10.01"
  revisado_em: string;
  tabelas: {
    regressiva: Param<{ ate_dias: number | null; aliquota: number }[]>;   // 180/360/720/∞
    iof_regressivo: Param<number[]>;       // 29 posições (dias 1 a 29)
  };
  regimes: Record<'light' | 'full', Record<ProdutoId, RegraBR>>;
}
interface RegraBR {
  aliquota: Param<number | { ref: string }>;
  base: Param<'rendimento_nominal_brl'>;
  momento: Param<'resgate' | 'resgate_e_cupom'>;
  prazo_cupom: Param<'desde_compra' | 'desde_ultimo_cupom'>;   // pendente na Light
  iof: Param<boolean>;
  base_legal: string;
}
type ProdutoId = 'tesouro_selic' | 'tesouro_pre' | 'tesouro_pre_cupom' | 'tesouro_ipca' | 'tesouro_ipca_cupom'
  | 'cdb_pre' | 'cdb_cdi' | 'cdb_ipca' | 'lci' | 'lca' | 'cri' | 'cra' | 'debenture' | 'debenture_incentivada';
```

### 2.3 `parametros/eua_federal_2026.json`

```ts
type Filing = 'single' | 'mfj' | 'mfs' | 'hoh';
interface ParametrosEUA {
  ano: 2026;
  faixas: Record<Filing, Param<{ acima_de: number; aliquota: number }[]>>;
  deducao_padrao: Record<Filing, Param<number>>;
  ganho_capital_qualificado: Record<Filing, Param<{ acima_de: number; aliquota: number }[]>>;
  niit: { aliquota: Param<number>; limiar_magi: Record<Filing, Param<number>> };
  credito: {
    carryback_anos: Param<number>; carryforward_anos: Param<number>;
    categoria: Param<'passiva'>; limite_alta_tributacao: Param<number>;   // §904(d)(2)(F)
  };
  deducao_imposto_estrangeiro: { teto_salt: Record<Filing, Param<number>> };  // ver dúvida 5.2.4
  curto_prazo: Param<{ prazo_emissao_max_meses: 12 }>;                         // §1283(a)(1)(A)
  projecao_anos_seguintes: Param<'faixas_nominais_2026'>;
}
```

### 2.4 `parametros/estados/<UF>.json`

```ts
interface ParametrosEstado {
  sigla: string; nome: string;
  modo: 'A' | 'B';
  tem_imposto_juros_dividendos: Param<boolean>;           // false no Modo A
  observacoes: string[];                                  // ex.: ganho de capital em WA
  fonte: string; url: string; data_verificacao: string; status: Status;
  // modelo completo, já tipado, nulo nesta versão (inclusão futura = só JSON e testes)
  base_inicial: Param<'agi_federal' | 'renda_tributavel_federal' | 'propria'> | null;
  faixas: Record<Filing, Param<{ acima_de: number; aliquota: number }[]>> | null;
  deducoes: Param<unknown> | null;
  juros_estrangeiros: Param<'tributa' | 'isenta'> | null;
  credito_imposto_estrangeiro: Param<'nao' | 'sim' | 'parcial'> | null;
  impostos_locais: Param<unknown> | null;
  residencia: Param<unknown> | null;
  ganho_capital_especifico: Param<unknown> | null;        // WA
}
```

Os 42 estados do Modo B não precisam de arquivo: o motor usa só a alíquota informada pelo usuário.

### 2.5 `dados/mercado.json`

```ts
interface DadosMercado {
  gerado_em: string;                              // ISO, fuso de Brasília
  fontes: { sgs: string; focus: string };
  focus: {
    data_coleta: string;
    anos: { ano: number; selic: Estat; ipca: Estat; cambio: Estat }[];   // ano corrente + 4
  };
  historico: {                                    // 10 anos, para posições antigas
    cdi_diario: [string, number][];
    selic_meta: [string, number][];
    ipca_mensal: [string, number][];
    ptax_venda: [string, number][];
  };
  spread_cdi_selic: { valor: number; janela: string };   // usado para derivar o CDI
}
interface Estat { mediana: number; media: number; desvio: number; minimo: number; maximo: number; respondentes: number }
```

### 2.6 Entrada da simulação (só em memória)

```ts
interface Simulacao {
  perfil: {
    estado: string; filing: Filing; residente_fiscal: true;
    renda_tributavel_usd: number; origem_renda: 'exata' | 'faixa';
    aliquota_estadual_estimada: number | null;          // só Modo B
    avancado?: {
      itemizadas_usd?: number;
      outras_rendas_passivas?: { renda_usd: number; imposto_usd: number };
      saldo_credito_existente?: { ano_origem: number; valor_usd: number }[];
      teto_livre_ano_anterior_usd?: number;             // proposta (dúvida 5.1.7)
      ltcg_qd_usd?: number;
    };
  };
  conta: 'light' | 'full' | 'comparar';
  posicoes: Posicao[];
  cenario: {
    tipo: 'mercado' | 'otimista' | 'pessimista' | 'personalizado';
    trajetoria?: { ano: number; selic: number; ipca: number; cambio_fim: number }[];
    horizonte_anos: number;                              // 1 a 15
    moeda: 'USD' | 'BRL';
    liquidez: { data: string; valor_brl: number }[];
    objetivo: 'patrimonio' | 'carga' | 'credito_perdido';
    reinvestimento: { tipo: 'eua'; taxa_usd: number } | { tipo: 'brasil'; pct_cdi: number };
    inflacao_eua_faixas: number | null;
  };
}
interface Posicao {
  id: string; produto: ProdutoId;
  valor_aplicado_brl: number; data_compra: string; data_vencimento: string;
  data_emissao?: string;                                 // ausente → compra, selo "aproximação"
  remuneracao: { indexador: 'pre' | 'cdi' | 'cdi_mais' | 'selic_mais' | 'ipca_mais'; taxa: number };  // ex.: 13 (% a.a.), 102 (% do CDI), 1,2 (CDI + 1,2%), 6,5 (IPCA + 6,5%)
  pagamento: { tipo: 'vencimento' } | { tipo: 'cupom'; meses: 1 | 3 | 6 | 12 };
  liquidez: { tipo: 'diaria' | 'vencimento' } | { tipo: 'carencia'; ate: string };
  plano: { tipo: 'vencimento' | 'sugerir' } | { tipo: 'total'; data: string }
       | { tipo: 'parcial'; resgates: { data: string; fracao: number }[] };
  valor_atual_extrato_brl?: number;                      // opcional
  taxa_venda?: number;                                   // opcional, marcação a mercado
}
```

### 2.7 Saída e memória de cálculo

```ts
interface Resultado {
  interpretacoes: { combinacao: Record<string, string>; estrategias: Record<string, ResultadoEstrategia> }[];
}
interface ResultadoEstrategia {
  anos: AnoResultado[];
  eventos_brasil: { posicao: string; data: string; tipo: 'cupom' | 'resgate' | 'vencimento';
                    base_brl: number; aliquota: number; ir_brl: number; iof_brl: number; cambio: number; ir_usd: number }[];
  schedule_b: { ano_origem: number; gerado: number; usado_proprio: number; ano_anterior: number;
                anos_seguintes: number; expirado: number; saldo: number; expira_em: number }[];
  patrimonio_final: { usd: number; brl: number };
  carga_efetiva: number;
  credito: { proprio: number; ano_anterior: number; seguintes: number; saldo: number; perdido: number };
  alertas: { tipo: string; nivel: 'baixo' | 'medio' | 'alto' | 'pendente' | 'info'; texto: string }[];
  memoria: Record<string, Memoria>;
}
interface AnoResultado {
  ano: number;
  renda_estrangeira_passiva_usd: number;   // juros e OID
  cambio_988_usd: number;                  // fonte EUA
  ganho_capital_usd: number;               // fonte EUA
  renda_tributavel_total: number; imposto_regular: number; teto: number;
  credito_proprio: number; credito_recebido_seguinte: number; credito_carryforward: number;
  federal_incremental_liquido: number; niit: number; estadual: number;
  credito_ou_deducao: 'credito' | 'deducao'; ganho_da_escolha: number;
}
interface Memoria {
  rotulo: string; valor: number; unidade: 'USD' | 'BRL' | '%';
  formula: string;
  insumos: { rotulo: string; valor: number; origem: 'regra' | 'usuario' | 'mercado' | 'premissa' | 'calculado'; ref?: string }[];
  base_legal: { texto: string; url: string }[];
  selos: ('confirmado' | 'pendente' | 'aproximacao' | 'premissa')[];
}
```

---

## 3. Como os motores calculam (resumo)

**Brasil.** Light: tabela regressiva pelos dias corridos desde a compra de cada aplicação; isenções da Lei 11.033/2004; debênture incentivada isenta (confirmado pela Sacre); IR dos cupons em duas interpretações enquanto a regra estiver pendente. Full: Tesouro 0%, CDB e debênture comum 15%, isentos 0%, incentivada 0%. IOF nos resgates com menos de 30 dias, conforme o status confirmado em cada regime. Base: rendimento nominal em reais.

**EUA federal.**
- Título emitido com prazo acima de 1 ano: juros (OID) por rendimento constante, em reais, convertidos pelo câmbio médio do ano.
- CDI e Selic: renda anual igual à variação na curva do cenário, com selo "aproximação".
- IPCA+: mesma mecânica sobre a projeção do cenário, com selo "aproximação, classificação final pelo contador".
- Prazo de emissão até 1 ano: renda no resgate.
- Cupons: renda no ano do recebimento.
- Câmbio §988 sobre principal e juros apropriados: renda ordinária de fonte americana, apurada em cada pagamento.
- Imposto: faixas do ano, NIIT sobre a renda de investimentos acima do limite e imposto **incremental**, isto é, o imposto com os investimentos do Brasil menos o imposto sem eles.

**Crédito.**
- Teto = IR regular antes dos créditos × renda tributável de fonte estrangeira ÷ renda tributável total, com a dedução alocada pela renda bruta, como no Form 1116.
- Ordem obrigatória do saldo: próprio ano, ano anterior, 10 anos seguintes (mais antigo primeiro), expiração.
- Em ano de dedução, o espaço do teto consome o saldo sem gerar crédito.
- Comparação anual entre crédito e dedução.

**Estados.** Modo A: zero, com fonte registrada. Modo B: alíquota do usuário × renda brasileira reconhecida nos EUA no ano, sem crédito; teto e crédito federais não mudam.

**Cenários.**
- Estratégias determinísticas: manter, resgate total no ano X, parciais escalonados, esperar a faixa da Light, trocas de ativo, reinvestir ou não, crédito ou dedução.
- Otimizador: busca em grade por ano e fração de resgate, seguida de refino local. O resultado é avaliado sempre com a simulação completa, que inclui o saldo de crédito por ano de origem.
- A programação dinâmica exata não é viável porque o saldo de crédito é contínuo e depende do ano de origem.
- A diferença entre estratégias é decomposta em IR Brasil, IR EUA, crédito perdido, câmbio e rendimento bruto.

**"Seu plano".** É a carteira da etapa 4 com o plano de resgate escolhido em cada aplicação, no cenário da etapa 5. Onde o usuário marcou "deixar o simulador sugerir", o seu plano considera manter até o vencimento. A necessidade de liquidez não altera o seu plano: ela é restrição das estratégias alternativas, que só entram na comparação se entregarem o valor na data. Se o seu plano não cobrir a necessidade, aparece um alerta.

**Alternativas (aba nova).**
- Para cada aplicação com IR no Brasil, calcula a taxa a partir da qual um isento comparável empata depois de todos os impostos: taxa de equilíbrio = taxa do produto com IR × (1 − carga dele) ÷ (1 − carga do isento), usando as cargas da própria simulação (seção 13.2 do prompt).
- O isento é escolhido pelo mesmo indexador: LCI/LCA para % do CDI; CRI, CRA ou debênture incentivada para IPCA+ e CDI + taxa; LCI/LCA prefixadas para prefixado. Em IPCA+ e CDI + taxa, a conta é feita sobre o rendimento total projetado e volta para o formato do indexador.
- Mostra duas taxas: com o plano atual e com o crédito todo usado. Na maior parte dos casos, com o crédito todo usado o equilíbrio fica perto da própria taxa do produto com IR, porque nos EUA os dois pagam o mesmo imposto. O isento só ganha de verdade quando há crédito perdido ou quando a alíquota brasileira passa da americana.
- "Teste uma troca": o usuário digita a taxa oferecida e a simulação compara o patrimônio final com e sem a troca, nos dois planos de resgate.
- Outras mudanças simuladas: plano de resgate, com cupom × sem cupom, prazo de até 1 ano, espaço de teto criado pelos isentos (seções 13.3 e 13.4 do prompt).
- Considera só impostos. Não considera risco de crédito, FGC, liquidez nem perfil do investidor, e diz isso na tela.

---

## 4. Protótipos das 7 telas (16:9)

Estrutura em todas as etapas: barra superior (logo, nome, etapa, Recomeçar), navegação à esquerda (22%), área central (50%), painel-resumo escuro à direita (28%), rodapé fixo com o aviso curto. Só os painéis rolam. Em telas menores que 1100 px, tudo empilha e aparece "Melhor experiência no computador".

| Etapa | O que o protótipo mostra |
|---|---|
| 1. Boas-vindas | O que o simulador faz em 3 linhas, para quem é, aviso completo em destaque, privacidade, botão obrigatório "Entendi, quero simular". As etapas seguintes ficam travadas até o clique. |
| 2. Onde você mora | Estado (51 opções, com os 9 do Modo A agrupados e marcados), alerta e alíquota opcional do Modo B, situação de declaração com explicação em português, renda exata ou por faixa. Avançado: "outros dados da sua declaração nos EUA", com explicação de cada campo. Painel: alíquota média e marginal, se o IR de 15% a 22,5% cabe no teto, distância do NIIT. |
| 3. Sua conta no Brasil | Light, Full ou Comparar; "Não sei" orienta a perguntar ao assessor; tabela do que muda no IR. Painel: IR retido nas duas contas. |
| 4. Seus investimentos | Um cartão editável por aplicação: produto, valor, datas, indexador e taxa (o formato muda conforme o indexador), pagamento, liquidez e plano de resgate (anos até o vencimento). Etiquetas automáticas: alíquota no Brasil pela conta e pelo prazo, tratamento nos EUA, aproximação, pendência, dado faltando. Painel ao vivo: total, divisão por tratamento no Brasil, alertas. |
| 5. Cenário | Mercado, otimista, pessimista ou personalizado; trajetória anual editável; horizonte; moeda; liquidez; objetivo; reinvestimento e correção das faixas no avançado. Painel: câmbio projetado e lista do que é premissa. |
| 6. Resultados | Moeda USD ou BRL em todos os números; faixa de pendência com as duas interpretações lado a lado; abas Painel (com "o que é seu plano"), Alternativas, Estratégias, Crédito (gráfico e Schedule B), Por produto (carga, equilíbrio, Light × Full) e Detalhamento anual. Painel: big numbers clicáveis (memória de cálculo), alertas por nível de risco, PDF, CSV e chamada final. |
| 7. Entenda o cálculo | Aviso completo, por que o federal dá um bom norte, por que a isenção brasileira não vale nos EUA, glossário, regras com status e data, pendências. Painel: datas dos parâmetros e dos dados de mercado. |

**Logo:** o protótipo usa um marcador provisório. O arquivo oficial é necessário antes de finalizar.

---

## 5. Dúvidas e regras a confirmar

### 5.1 Decisões da Sacre

> **Respondidas em 01/10/2026.** As respostas estão no "Registro de decisões", no início deste documento. A tabela abaixo fica como histórico das perguntas.

| # | Decisão | Minha recomendação |
|---|---|---|
| 1 | **Logo oficial** em SVG ou PNG transparente | Enviar o SVG |
| 2 | **Hospedagem e domínio** | GitHub Pages + Actions numa conta GitHub da Sacre; subdomínio da Sacre se houver acesso ao DNS |
| 3 | **Link da chamada final** ("Fale com a Sacre") | Site, WhatsApp ou formulário; fica configurável |
| 4 | **Otimista e pessimista** | Mediana do Focus ± 1 desvio-padrão do próprio Focus (dado oficial, não arbitrário). Pessimista = real mais fraco e Selic mais baixa; otimista = o inverso; IPCA na mediana |
| 5 | **Anos além do Focus** (o Focus cobre cerca de 5 anos; o horizonte vai a 15) | Manter o último valor projetado, como premissa editável |
| 6 | **Depois de um resgate, o dinheiro vai para onde?** Isso muda bastante a comparação entre estratégias | Padrão "levar para os EUA", com um campo de rendimento em dólar informado pelo usuário (vazio = 0%). Opção "reinvestir no Brasil a X% do CDI" |
| 7 | **Aplicações compradas antes de 2026** | Simular de 2026 em diante. O valor atual vem da curva com dados reais do BCB (ou do extrato, se informado). Os anos anteriores contam como já declarados. O carryback para 2025 só entra se o usuário informar o espaço livre do teto de 2025; sem isso, conta como zero, com alerta |
| 8 | **Patrimônio final** | Valor de liquidação no fim do horizonte, líquido de todos os impostos. O saldo de crédito restante aparece à parte, sem somar |
| 9 | **Regra pendente na tela** ("nunca escolha sozinho") | Big numbers das duas interpretações sempre lado a lado. Os gráficos seguem a interpretação que o usuário marcar, começando pela primeira listada no parâmetro, com aviso visível |
| 10 | **Faixas de renda** | As do protótipo: até 50 mil, 50–100, 100–150, 150–250, 250–400, 400–650 e acima de 650 mil (valor exato) |
| 11 | **Carteira de exemplo** | A do protótipo: CDB 102% do CDI, LCA 95% do CDI, Tesouro IPCA+ com juros semestrais e debênture incentivada |
| 12 | **Instalar Node.js LTS** nesta máquina | Sim, com `winget` (seção 1.9) |
| 13 | **Fonte documental das debêntures incentivadas na Light** (já confirmadas como isentas) | Um documento ou link citável: confirmação escrita da área de produtos do BTG, parecer ou norma. Vai para `fonte` e `url` do parâmetro |
| 14 | **Nome e texto da aba de alternativas** | "Alternativas", com linguagem de simulação e o aviso de que considera só impostos. "Sugestões" soa como recomendação; levar ao compliance antes de publicar |

### 5.2 Pontos do prompt que proponho ajustar

1. **Fórmula da carga (13.1) conta o crédito perdido duas vezes.** Se o IR brasileiro não vira crédito, o IR federal não compensado já sobe na mesma medida. Somar "crédito perdido" de novo dobra o efeito. Exemplo: renda 100, IR Brasil 15, IR EUA 22. Com o crédito todo perdido, a carga correta é 37 (15 + 22), não 52. **Proposta:** Carga = IR Brasil + IR federal depois do crédito + NIIT + estadual. O crédito perdido aparece como componente explicativo. Assim a tabela de referência do 13.1 (max(t_BR, t_EUA) + NIIT + estadual) continua valendo.
2. **1366×768 de tela não é 1366×768 de navegador.** Com abas e barra de endereço, a área útil fica perto de 1366×650. O protótipo já cabe nessa área sem rolagem da página; o teste de aceite vai cobrir as duas medidas.
3. **IPCA+ na venda antecipada.** Se o título for tratado como contingente (Reg. §1.1275-4), o ganho na venda é juros, de fonte estrangeira, e não ganho de capital de fonte americana. A divisão em três partes do 11.1 muda para esses títulos. Proponho seguir a regra do §1.1275-4 para IPCA+, com o selo de aproximação, e confirmar na Etapa 3.
4. **Dedução do IR estrangeiro.** A dedução de imposto de renda estrangeiro é itemizada e, pelo §164(b)(6), entra no mesmo teto do SALT. Sem esse teto nos parâmetros, a comparação crédito × dedução fica otimista. Proponho incluir o teto vigente em 2026 no `eua_federal_2026.json`, com fonte.
5. **Renda muito tributada (§904(d)(2)(F)) e o descasamento de prazo.** No ano do resgate, o IR brasileiro de vários anos cai sobre a renda americana de um ano só. Dependendo da regra de teste, isso pode reclassificar a renda como categoria geral. Proponho implementar o teste conforme a Reg. §1.904-4(c) para imposto pago em ano posterior, a confirmar na Etapa 3, e sinalizar quando ocorrer.
6. **Renda bruta e MAGI.** O teto (alocação da dedução) e o NIIT precisam da renda bruta, mas o usuário informa a renda tributável. Proponho estimar: renda bruta = renda tributável + dedução padrão (ou itemizadas), com selo de aproximação.
7. **Venda antes do vencimento.** Projetar preço de mercado exige uma curva de juros futura. Proponho vender pela curva contratada, como ocorre no resgate antecipado de CDB pelo emissor. Nesse caso, a parte de ganho de capital é zero. No avançado, o usuário pode informar uma taxa de venda.
8. **IOF-câmbio** na entrada e na saída de recursos não está no prompt. Proponho só um aviso nesta versão, depois de confirmar as alíquotas vigentes para Light e Full.

### 5.3 Regras a confirmar na Etapa 3 (fonte oficial)

**Brasil**
1. Tabela regressiva e isenção de LCI, LCA, CRI e CRA vigentes em 2026. Confirmar que nenhuma norma posterior mudou essas regras. Por exemplo, a MP 1.303/2025 propunha alíquota única e perdeu a validade sem ser convertida.
2. ~~Debêntures incentivadas na Light~~: **resolvido.** Confirmado pela Sacre em 01/10/2026 como isentas. Falta só registrar a fonte documental (5.1, item 13).
3. IR sobre cupons na Light: o prazo da tabela é contado da compra ou do último cupom?
4. IOF regressivo em cada regime (Decreto 6.306/2007).
5. Norma sucessora da Res. CMN 4.373/2014 (novo marco cambial), para a citação correta na tela.
6. Alíquotas da CNR Full: Lei 11.312/2006, Lei 12.431/2011, art. 1º, e Manual B3 do investidor não residente.

**EUA**

7. Faixas, dedução padrão (os 4 status) e faixas de ganho de capital e dividendos qualificados de 2026: Rev. Proc. 2025-32.
8. Limiares do NIIT e se o ganho cambial do §988 entra na renda de investimentos.
9. Teto do SALT em 2026 e como ele afeta a dedução do imposto estrangeiro.
10. Teste de renda muito tributada com imposto pago em ano posterior: Reg. §1.904-4(c).
11. Ajuste do §904(b)(2)(B), quando o usuário informar ganhos ou dividendos qualificados americanos.
12. Classificação de CDI (§1.1275-5), IPCA+ (§1.1275-4 e §1.988-6) e cupons indexados.
13. Situação das Notices 2023-55 e 2023-80 na Publication 514 mais recente.

**Estados**

14. Cada um dos 9 estados do Modo A no site oficial da receita estadual, incluindo o imposto sobre ganho de capital de Washington e a revogação do imposto sobre juros e dividendos em New Hampshire.

**Mercado**

15. Códigos SGS (CDI, Selic, IPCA, PTAX) e o recurso de expectativas anuais da API Olinda.

### 5.4 Premissas e aproximações que vou adotar (salvo objeção)

| Tema | Premissa | Selo |
|---|---|---|
| Dias úteis | 252 dias úteis por ano, aproximados pelos dias corridos (sem calendário ANBIMA) | aproximação |
| Câmbio do OID | Média do ano civil para os juros apropriados; câmbio do dia para IR retido e pagamentos | regra (Reg. §1.988-2(b)) com aproximação na média |
| CDI | Selic menos o diferencial médio dos últimos 12 meses (SGS) | premissa |
| Trajetória dentro do ano | Interpolação linear entre os pontos de fim de ano do Focus | premissa |
| Faixas futuras dos EUA | Nominais de 2026, com opção de corrigir pela inflação americana informada | premissa |
| Data de emissão ausente | Igual à data de compra | aproximação |
| AMT e de minimis do §904(j) | Fora desta versão, com aviso | — |

---

## 6. Testes e critérios de aceite

- **Seção 17 inteira automatizada.** Conferi as contas do prompt contra as faixas de 2026 nele informadas. Os casos 17.1, 17.2, 17.3, 17.6 e 17.7 batem. Exemplos: Single US$ 105.700 → US$ 17.966; alíquota média de 20% em US$ 185.050; ganho imobiliário de R$ 12 milhões → R$ 2.025.000.
- **17.4 e 17.5** (ano com dedução e expiração em N+10) entram como testes do `motor-credito`.
- **17.8 e 17.9** (regimes e estados): testes por produto × regime e por estado, inclusive Modo B com 5%, verificando que teto e crédito federais não mudam.
- **17.10** (Playwright): rolagem zero em 1366×768, 1366×650 e 1920×1080; empilhado sem rolagem horizontal em 390×844; Chrome, Edge (Chromium), Firefox e Safari (WebKit); rede só com `GET` estático; cookies e armazenamento vazios.
- **Extras:** cada parâmetro tem os 5 campos (falha o build se faltar); toda memória de cálculo soma ao valor exibido; a carteira de exemplo tem resultado estável (teste de regressão).
- **17.11:** os 3 casos do contador americano ficam documentados em `docs/VALIDACAO_CONTADOR.md`.

---

## 7. Próximas etapas (após aprovação)

| Etapa | Entrega |
|---|---|
| 2 | Motores de cálculo e testes da seção 17, sem interface |
| 3 | Parâmetros com fonte e data (Brasil, federal 2026, 9 estados) e rotina de dados de mercado |
| 4 | Interface completa no visual Sacre, avisos, PDF e CSV |
| 5 | Revisão: capturas em 1920×1080 e 1366×768, relatório de testes, lista de pendências |
| 6 | Publicação: site, link, QR code, README, guia de atualização anual e de inclusão de estados |

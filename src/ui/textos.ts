// Textos obrigatórios (seção 15 do prompt v3) e textos de apoio. Separados para revisão do compliance.

export const AVISO_COMPLETO =
  'Esta calculadora não realiza cálculo tributário. É apenas um embasamento para a tomada de decisões financeiras no Brasil. Os resultados são simulações baseadas em regras públicas vigentes na data indicada e em premissas de mercado que podem não se confirmar. Não constituem declaração de imposto, parecer tributário ou recomendação de investimento, e não substituem a orientação de um contador habilitado nos EUA, de um tributarista no Brasil e do seu assessor de investimentos. A Sacre Investimentos, assessoria credenciada ao BTG Pactual, não armazena nenhuma informação digitada nesta página.';

export const AVISO_CURTO =
  'Simulação para embasamento de decisões financeiras. Não é cálculo tributário nem recomendação. Valide com seu contador e seu assessor.';

export const ALERTA_MODO_B_TITULO = 'Seu estado não está incluído neste cálculo.';
export const ALERTA_MODO_B =
  'O resultado considera apenas o imposto federal dos EUA (e a alíquota estadual que você informar, se informar). Seu estado pode cobrar imposto sobre os rendimentos do Brasil e, em geral, não dá crédito pelo IR pago no Brasil. Valide com seu contador como o seu estado trata esses rendimentos.';

export const LIGHT_TEXTO =
  'Segue as regras do residente no Brasil. Tesouro, CDB e debêntures comuns pagam IR pela tabela regressiva, de 22,5% a 15%. LCI, LCA, CRI, CRA e debêntures incentivadas são isentos.';
export const FULL_TEXTO =
  'Segue o regime do investidor não residente do Conselho Monetário Nacional. Títulos públicos com 0%; CDB e debêntures comuns com 15%, em qualquer prazo. Inclui ações, FIIs e opções.';

export const ISENCAO_EUA =
  'Os EUA tributam o residente fiscal sobre a renda do mundo todo. A isenção de LCI, LCA, CRI, CRA e debêntures incentivadas é uma regra do Brasil e não muda a lei americana. Por isso esses juros entram na renda nos EUA e, sem IR no Brasil, não geram crédito, mas ampliam o teto.';

export const FEDERAL_NORTE = [
  'O imposto estadual costuma alcançar os juros do Brasil e, em geral, não dá crédito pelo IR pago no Brasil. Ele soma à carga, por cima.',
  'Como incide igual sobre os produtos brasileiros que geram juros (CDB, LCI, Tesouro), a ordem de eficiência entre eles e a lógica de resgate tendem a não mudar. O que muda é quanto sobra no final.',
  'Onde o estado pode pesar é na comparação com investimentos nos EUA. Os juros de títulos do Tesouro americano são isentos de imposto estadual; os juros do Brasil, não. Em estados de alíquota alta, essa diferença precisa ser avaliada com o contador.',
];

export const GLOSSARIO: [string, string][] = [
  ['Foreign Tax Credit', 'Crédito pelo imposto de renda pago a outro país. Abate o IR federal americano sobre a mesma renda (IRC §901).'],
  ['Form 1116', 'Formulário da declaração americana em que a pessoa física calcula o crédito, por categoria de renda.'],
  ['Teto do crédito', 'Limite anual: o IR federal americano proporcional à renda estrangeira do ano (IRC §904).'],
  ['Saldo de crédito', 'O que passa do teto volta 1 ano (carryback, por declaração retificadora) e depois segue por até 10 anos (carryforward).'],
  ['OID', 'Original Issue Discount: juros embutidos em títulos que pagam tudo no vencimento. Nos EUA, entram na renda ano a ano.'],
  ['NIIT', 'Net Investment Income Tax: 3,8% sobre renda de investimentos acima de um limite de renda. O crédito estrangeiro não abate esse imposto.'],
  ['Renda de fonte estrangeira', 'Renda que a lei americana considera vinda de fora dos EUA, como juros de emissor brasileiro. Só ela forma o teto.'],
  ['Tabela regressiva', 'Alíquotas do IR brasileiro que caem com o prazo da aplicação: de 22,5% (até 180 dias) a 15% (acima de 720 dias).'],
  ['Deduções itemizadas', 'Alternativa à dedução padrão nos EUA: soma de despesas que a lei permite abater, como juros de hipoteca, impostos estaduais e doações (Schedule A).'],
  ['CNR', 'Conta de não residente: conta de investimento no Brasil de quem mora fora. Pode ser Light ou Full.'],
];

export const ESTADOS: [string, string][] = [
  ['AL', 'Alabama'], ['AK', 'Alasca'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'Califórnia'], ['NC', 'Carolina do Norte'], ['SC', 'Carolina do Sul'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['ND', 'Dakota do Norte'], ['SD', 'Dakota do Sul'], ['DE', 'Delaware'], ['DC', 'Distrito de Colúmbia'],
  ['FL', 'Flórida'], ['GA', 'Geórgia'], ['HI', 'Havaí'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
  ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'Nova Jersey'],
  ['NM', 'Novo México'], ['NY', 'Nova York'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pensilvânia'], ['RI', 'Rhode Island'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virgínia'], ['WV', 'Virgínia Ocidental'], ['WA', 'Washington'],
  ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

export const FAIXAS_RENDA: [string, number][] = [
  ['Até US$ 50 mil (usa US$ 25 mil)', 25_000],
  ['US$ 50 a 100 mil (usa US$ 75 mil)', 75_000],
  ['US$ 100 a 150 mil (usa US$ 125 mil)', 125_000],
  ['US$ 150 a 250 mil (usa US$ 200 mil)', 200_000],
  ['US$ 250 a 400 mil (usa US$ 325 mil)', 325_000],
  ['US$ 400 a 650 mil (usa US$ 525 mil)', 525_000],
];

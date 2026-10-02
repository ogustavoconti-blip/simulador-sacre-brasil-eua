// Atualiza public/dados/mercado.json com dados oficiais do Banco Central do Brasil.
// - SGS: CDI diário (12), Selic diária (11), meta Selic (432), IPCA mensal (433), dólar venda (1),
//   CDI anualizado base 252 (4389, usado no diferencial Selic − CDI).
// - Expectativas de Mercado (Focus), API Olinda: Selic, IPCA e câmbio anuais.
// Roda no GitHub Actions. Se algo falhar ou vier fora do esperado, sai com erro e o arquivo anterior fica.
import { writeFileSync } from 'node:fs';

const DESTINO = new URL('../public/dados/mercado.json', import.meta.url);
const ANOS_HISTORICO = 10;
const SGS = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.';
const OLINDA = 'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais';

const hojeSP = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10); // Brasília (UTC−3)
const br = (iso) => iso.split('-').reverse().join('/');
const isoDeBr = (s) => s.split('/').reverse().join('-');
const somaAnos = (iso, n) => `${Number(iso.slice(0, 4)) + n}${iso.slice(4)}`;

async function buscaJson(url, tentativas = 4) {
  let erro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      erro = e;
      await new Promise((ok) => setTimeout(ok, 2000 * (i + 1)));
    }
  }
  throw new Error(`Falha ao buscar ${url}: ${erro?.message}`);
}

/** Série do SGS em janelas de 5 anos (a API limita consultas longas de séries diárias). */
async function serieSgs(codigo, ini, fim) {
  const out = [];
  for (let a = ini; a < fim; a = somaAnos(a, 5)) {
    const b = somaAnos(a, 5) > fim ? fim : somaAnos(a, 5);
    const dados = await buscaJson(`${SGS}${codigo}/dados?formato=json&dataInicial=${br(a)}&dataFinal=${br(b)}`);
    if (!Array.isArray(dados)) throw new Error(`SGS ${codigo}: resposta inesperada (${JSON.stringify(dados).slice(0, 120)})`);
    for (const { data, valor } of dados) out.push([isoDeBr(data), Number(valor)]);
  }
  const unico = new Map(out.filter(([, v]) => Number.isFinite(v)));
  return [...unico.entries()].sort((x, y) => x[0].localeCompare(y[0]));
}

async function focus(indicador, anoIni) {
  const filtro = encodeURIComponent(`Indicador eq '${indicador}' and baseCalculo eq 0`);
  const campos = 'Indicador,Data,DataReferencia,Media,Mediana,DesvioPadrao,Minimo,Maximo,numeroRespondentes';
  const url = `${OLINDA}?$top=60&$filter=${filtro}&$orderby=Data%20desc&$format=json&$select=${campos}`;
  const { value } = await buscaJson(url);
  if (!value?.length) throw new Error(`Focus sem dados para ${indicador}`);
  const ultima = value[0].Data;
  const linhas = value.filter((v) => v.Data === ultima && Number(v.DataReferencia) >= anoIni);
  return {
    data: ultima,
    anos: Object.fromEntries(
      linhas.map((v) => [
        Number(v.DataReferencia),
        { mediana: v.Mediana, media: v.Media, desvio: v.DesvioPadrao, minimo: v.Minimo, maximo: v.Maximo, respondentes: v.numeroRespondentes },
      ]),
    ),
  };
}

function exige(cond, msg) {
  if (!cond) throw new Error(`Validação: ${msg}`);
}

async function main() {
  const hoje = hojeSP();
  const ini = somaAnos(hoje, -ANOS_HISTORICO);
  const anoAtual = Number(hoje.slice(0, 4));

  const [cdi, selic, ipca, ptax, meta, cdiAnual] = await Promise.all([
    serieSgs(12, ini, hoje),
    serieSgs(11, ini, hoje),
    serieSgs(433, ini, hoje),
    serieSgs(1, ini, hoje),
    serieSgs(432, somaAnos(hoje, -1), hoje),
    serieSgs(4389, somaAnos(hoje, -1), hoje),
  ]);
  const [fSelic, fIpca, fCambio] = await Promise.all([focus('Selic', anoAtual), focus('IPCA', anoAtual), focus('Câmbio', anoAtual)]);

  // diferencial médio de 12 meses entre a meta Selic e o CDI anualizado
  const metaPorDia = new Map(meta);
  const difs = cdiAnual.filter(([d]) => metaPorDia.has(d)).map(([d, v]) => metaPorDia.get(d) - v);
  const spread = difs.reduce((s, x) => s + x, 0) / difs.length;
  const ultimo = (serie) => serie.filter(([d]) => d <= hoje).at(-1);

  // validações: se algo estiver fora do esperado, não grava
  exige(cdi.length > 1000 && ptax.length > 1000 && selic.length > 1000, 'séries diárias curtas demais');
  exige(ipca.length > 60, 'IPCA curto demais');
  exige(ultimo(cdi)[1] > 0.005 && ultimo(cdi)[1] < 0.2, 'CDI diário fora da faixa');
  exige(ultimo(ptax)[1] > 2 && ultimo(ptax)[1] < 15, 'câmbio fora da faixa');
  exige(difs.length > 100 && Math.abs(spread) < 1, 'diferencial Selic − CDI inválido');
  const anosFocus = Object.keys(fSelic.anos).map(Number).filter((a) => fIpca.anos[a] && fCambio.anos[a]).sort();
  exige(anosFocus.length >= 3, 'Focus com menos de 3 anos');
  for (const a of anosFocus) {
    exige(fSelic.anos[a].mediana > 1 && fSelic.anos[a].mediana < 40, `Selic ${a} fora da faixa`);
    exige(fIpca.anos[a].mediana > -5 && fIpca.anos[a].mediana < 40, `IPCA ${a} fora da faixa`);
    exige(fCambio.anos[a].mediana > 2 && fCambio.anos[a].mediana < 15, `câmbio ${a} fora da faixa`);
  }

  const saida = {
    gerado_em: new Date().toISOString(),
    hoje,
    cambio_hoje: ultimo(ptax)[1],
    selic_hoje: ultimo(meta)[1],
    spread_cdi_selic: Number(spread.toFixed(4)),
    fontes: {
      sgs: 'Banco Central do Brasil, SGS: 12 (CDI diário), 11 (Selic diária), 432 (meta Selic), 433 (IPCA mensal), 1 (dólar venda), 4389 (CDI anualizado)',
      sgs_url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados',
      focus: `Banco Central do Brasil, Expectativas de Mercado (Focus), coleta de ${fSelic.data}, base de cálculo de 30 dias`,
      focus_url: OLINDA,
    },
    focus: {
      data_coleta: fSelic.data,
      anos: anosFocus.map((ano) => ({ ano, selic: fSelic.anos[ano], ipca: fIpca.anos[ano], cambio: fCambio.anos[ano] })),
    },
    historico: { cdi_diario: cdi, selic_diaria: selic, ipca_mensal: ipca, ptax },
  };
  writeFileSync(DESTINO, JSON.stringify(saida) + '\n', 'utf8');
  console.log(`mercado.json: ${hoje} · Focus de ${fSelic.data} · ${anosFocus.join(', ')} · câmbio ${saida.cambio_hoje} · meta Selic ${saida.selic_hoje} · diferencial ${saida.spread_cdi_selic}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

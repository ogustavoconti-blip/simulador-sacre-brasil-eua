// Etapa 6 (resultados), etapa 7 (entenda o cálculo) e os painéis-resumo correspondentes.
import { useState } from 'react';
import type { InfoMercado } from '../motores';
import { anoDe, iso } from '../motores/calendario';
import { decompoe, objetivo, taxaEquilibrio, type Cronograma, type ResultadoEstrategia, type ResultadoRegime } from '../motores/motor-cenarios';
import type { Memoria, Regime } from '../motores/tipos';
import { AlertaPainel, Callout, CampoValor, Dialogo, Icone, Selo } from './comuns';
import type { Dados, EstadoCalculo } from './dados';
import { IDX, PRODUTOS, rotuloAplicacao, type EstadoUI } from './estado';
import { dinheiro, fmt0, fmt1, fmt2, fmtPct, grande, isoParaBR, lerNumero, mesAno, simbolo, type Moeda } from './formato';
import { Decomposicao, GraficoCredito, GraficoLinha } from './graficos';
import { AVISO_COMPLETO, ESTADOS, FEDERAL_NORTE, GLOSSARIO, ISENCAO_EUA } from './textos';
import type { SetEstado } from './etapas';

/* ---------- seleção do que mostrar ---------- */
export interface Visao {
  regime: Regime;
  R: ResultadoRegime;
  interp: number;
  atual: ResultadoEstrategia;
  melhor: ResultadoEstrategia;
  todas: ResultadoEstrategia[];
  outraConta: ResultadoEstrategia | null;
  mercado: InfoMercado;
  moeda: Moeda;
  conv: (usd: number, ano: number) => number;
  anoFim: number;
}

export function montaVisao(regimes: ResultadoRegime[], mercado: InfoMercado, e: EstadoUI, regimeEscolhido: Regime, interp: number): Visao | null {
  const R = regimes.find((r) => r.regime === regimeEscolhido) ?? regimes[0];
  if (!R) return null;
  const k = Math.min(interp, R.interpretacoes.length - 1);
  const I = R.interpretacoes[k];
  const atual = I.estrategias.find((x) => x.id === 'atual')!;
  const melhor = I.estrategias.find((x) => x.id === I.melhor) ?? atual;
  const outra = regimes.find((r) => r.regime !== R.regime);
  const anoFim = atual.anos[atual.anos.length - 1]?.ano ?? 0;
  return {
    regime: R.regime,
    R,
    interp: k,
    atual,
    melhor,
    todas: I.estrategias,
    outraConta: outra ? outra.interpretacoes[0].estrategias.find((x) => x.id === 'atual') ?? null : null,
    mercado,
    moeda: e.moeda,
    conv: (usd, ano) => (e.moeda === 'USD' ? usd : usd * (mercado.cambio_fim_ano[ano] ?? mercado.cambio_hoje)),
    anoFim,
  };
}

const ROT_ESTR = (x: ResultadoEstrategia) =>
  x.id === 'atual' ? 'Seu plano' : x.id === 'otimizada' ? 'Melhor combinação encontrada' : x.rotulo;

function descreve(e: EstadoUI, crono: Cronograma): string {
  const partes: string[] = [];
  for (const [id, rs] of Object.entries(crono)) {
    if (!rs.length) continue;
    const nome = rotuloAplicacao(e, id).split(',')[0];
    if (rs.length === 1 && rs[0].fracao >= 0.999) partes.push(`${nome}: resgate total em ${mesAno(iso(rs[0].d))}`);
    else partes.push(`${nome}: ${rs.map((r) => `${fmt0(r.fracao * 100)}% em ${anoDe(r.d)}`).join(', ')}`);
  }
  return partes.length ? partes.join(' · ') : 'Todas as aplicações até o vencimento (ou até o fim do horizonte)';
}

/** Saldo de crédito em aberto no fim de cada ano. */
function saldoFimDoAno(est: ResultadoEstrategia, ano: number) {
  let s = 0;
  for (const o of est.credito.origens) {
    if (o.ano_origem > ano) continue;
    const enviado = o.enviado_anterior.reduce((a, x) => a + x.valor, 0);
    const usadoDepois = o.usado_seguintes.filter((x) => x.ano <= ano).reduce((a, x) => a + x.valor, 0);
    const exp = o.ano_expiracao <= ano ? o.expirado : 0;
    s += o.gerado - o.usado_proprio - enviado - usadoDepois - exp;
  }
  return Math.max(0, s);
}

/* ---------- memória de cálculo ---------- */
export function DialogoMemoria({ memoria, fechar }: { memoria: Memoria | null; fechar: () => void }) {
  const fmt = (v: number, u: string) => (u === 'USD' ? dinheiro(v, 'USD') : u === 'BRL' ? dinheiro(v, 'BRL') : u === '%' ? fmtPct(v) : u === 'dias' ? `${fmt0(v)} dias` : fmt2(v));
  const ORIG = { regra: ['ok', 'Regra'], usuario: ['fato', 'Você'], mercado: ['prem', 'Premissa'], premissa: ['prem', 'Premissa'], calculado: ['aprox', 'Calculado'] } as const;
  const SELO = { confirmado: ['ok', 'Regra confirmada'], pendente: ['pend', 'Pendente'], aproximacao: ['aprox', 'Aproximação'], premissa: ['prem', 'Premissa de mercado'] } as const;
  return (
    <Dialogo aberto={!!memoria} fechar={fechar} eyebrow="Memória de cálculo" titulo={memoria?.rotulo}>
      {memoria && (
        <>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.8rem' }}>
            {memoria.selos.map((s) => <Selo key={s} tipo={SELO[s][0]}>{SELO[s][1]}</Selo>)}
          </div>
          <div className="formula">{memoria.formula}<span className="res">{fmt(memoria.valor, memoria.unidade)}</span></div>
          <div className="dlg-sec"><h4>Insumos</h4>
            <table className="insumos"><tbody>
              {memoria.insumos.map((x, i) => (
                <tr key={i}><td>{x.rotulo}</td><td className="tnum">{fmt(x.valor, x.unidade)}</td><td><Selo tipo={ORIG[x.origem][0]}>{ORIG[x.origem][1]}</Selo></td></tr>
              ))}
            </tbody></table>
          </div>
          <div className="dlg-sec"><h4>Base legal</h4><ul className="base-legal">{memoria.base_legal.map((b) => <li key={b}>{b}</li>)}</ul></div>
          <p className="nota" style={{ marginTop: '1rem' }}>A memória de cálculo fica em US$, a moeda da declaração americana.</p>
        </>
      )}
    </Dialogo>
  );
}

/* ---------- CSV ---------- */
export function baixaCSV(v: Visao) {
  const m = v.moeda;
  const cab = ['Ano', `Juros e OID (${m})`, `Câmbio §988 (${m})`, `IR e IOF no Brasil (${m})`, `Teto do crédito (${m})`, 'Modo', `Crédito usado (${m})`, `IR federal depois do crédito (${m})`, `NIIT (${m})`, `Estadual (${m})`];
  const n = (x: number) => fmt2(x).replace(/\./g, '');
  const linhas = v.atual.anos.map((a) =>
    [a.ano, n(v.conv(a.juros_usd, a.ano)), n(v.conv(a.cambio_usd, a.ano)), n(v.conv(a.ir_brasil_usd, a.ano)), n(v.conv(a.federal.teto, a.ano)), a.modo_credito === 'credito' ? 'Crédito' : 'Dedução', n(v.conv(a.credito_usado, a.ano)), n(v.conv(a.federal_liquido_incremental, a.ano)), n(v.conv(a.niit_incremental, a.ano)), n(v.conv(a.estadual, a.ano))].join(';'),
  );
  const texto = '﻿' + [`Simulador Sacre de Eficiência Brasil–EUA · simulação, não cálculo tributário`, cab.join(';'), ...linhas].join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simulacao-sacre-brasil-eua.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ======================= 6. RESULTADOS ======================= */
export function Resultados({ e, set, calc, regime, setRegime, interp, setInterp, abrirMemoria }: {
  e: EstadoUI;
  set: SetEstado;
  calc: EstadoCalculo;
  regime: Regime;
  setRegime: (r: Regime) => void;
  interp: number;
  setInterp: (i: number) => void;
  abrirMemoria: (m: Memoria) => void;
}) {
  const [aba, setAba] = useState('painel');
  const exec = calc.fase === 'pronto' ? calc.execucao : calc.fase === 'calculando' ? calc.anterior : null;
  const cab = (
    <header className="tela-head" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <span className="eyebrow">Etapa 6 · Resultados da simulação</span>
        <h2 id="t6" tabIndex={-1}>O que a simulação mostra</h2>
      </div>
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }} className="nao-imprimir">
        {e.conta === 'comparar' && (
          <div className="seg" role="group" aria-label="Conta exibida">
            {(['light', 'full'] as const).map((r) => <button key={r} type="button" aria-pressed={regime === r} onClick={() => setRegime(r)}>{r === 'light' ? 'Light' : 'Full'}</button>)}
          </div>
        )}
        <div className="seg" role="group" aria-label="Moeda do resultado">
          {(['USD', 'BRL'] as const).map((m) => <button key={m} type="button" aria-pressed={e.moeda === m} onClick={() => set((s) => ({ ...s, moeda: m }))}>{m}</button>)}
        </div>
      </div>
    </header>
  );
  if (!exec) {
    return (
      <section className="tela" aria-labelledby="t6">
        {cab}
        <div className="vazio">{calc.fase === 'erro' ? `Erro no cálculo: ${calc.mensagem}` : calc.fase === 'ocioso' ? 'Complete os dados das etapas anteriores para ver os resultados.' : 'Calculando…'}</div>
      </section>
    );
  }
  if (!exec.ok) {
    return (
      <section className="tela" aria-labelledby="t6">
        {cab}
        <Callout titulo="Faltam dados para simular">
          <ul className="problemas">{exec.problemas.map((p) => <li key={p.campo + p.texto}><Icone n="alerta" />{p.texto}</li>)}</ul>
        </Callout>
      </section>
    );
  }
  const v = montaVisao(exec.resultado, exec.dados_mercado, e, regime, interp)!;
  const { atual, melhor } = v;
  const m = v.moeda;
  const din = (usd: number, ano = v.anoFim, sinal = false) => dinheiro(v.conv(usd, ano), m, sinal);
  const dif = melhor.patrimonio_final_usd - atual.patrimonio_final_usd;
  const dec = decompoe(atual, melhor);
  const fxFim = m === 'USD' ? 1 : v.mercado.cambio_fim_ano[v.anoFim] ?? 1;
  const decItens: [string, number][] = [
    ['Crédito aproveitado', dec.credito * fxFim],
    ['IR nos EUA', dec.ir_eua * fxFim],
    ['IR no Brasil', dec.ir_brasil * fxFim],
    ['Câmbio', dec.cambio * fxFim],
    ['Rendimento bruto', dec.rendimento_bruto * fxFim],
  ];
  const principal = [...decItens].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  const anos = atual.anos.map((a) => a.ano);
  const pend = v.R.pendencias;

  const ABAS = [
    ['painel', 'Painel'],
    ['alt', 'Alternativas'],
    ['estr', 'Estratégias'],
    ['cred', 'Crédito'],
    ['prod', 'Por produto'],
    ['det', 'Detalhamento'],
  ] as const;

  return (
    <section className="tela" aria-labelledby="t6">
      {cab}
      <div className="so-impressao">
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>Simulador Sacre de Eficiência Brasil–EUA · dados de mercado de {isoParaBR(v.mercado.data)} · conta CNR {v.regime === 'light' ? 'Light' : 'Full'}</p>
        <p className="nota"><b>Aviso importante.</b> {AVISO_COMPLETO}</p>
      </div>
      {calc.fase === 'calculando' && <p className="nota nao-imprimir">Atualizando com os dados mais recentes…</p>}

      {pend.length > 0 && (
        <div className="pend-strip">
          <span className="selo selo--pend"><Icone n="alerta" />Pendente</span>
          {v.R.interpretacoes.slice(0, 2).map((I, k) => {
            const a = I.estrategias.find((x) => x.id === 'atual')!;
            return (
              <button key={k} className="alt" type="button" aria-pressed={v.interp === k} onClick={() => setInterp(k)}>
                <span className="ajuda">{pend.map((p) => p.rotulo).join(' · ')}: <b>{I.rotulos.join(' · ')}</b></span>
                <b>{din(a.patrimonio_final_usd)}</b>
              </button>
            );
          })}
          <span className="ajuda pend-nota">A regra ainda não foi confirmada. Os dois resultados aparecem lado a lado; as abas abaixo seguem a interpretação que você marcar.</span>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Seções dos resultados">
        {ABAS.map(([id, t]) => (
          <button key={id} className="tab" role="tab" type="button" aria-selected={aba === id} aria-controls={`p-${id}`} id={`tb-${id}`} tabIndex={aba === id ? 0 : -1} onClick={() => setAba(id)}
            onKeyDown={(x) => {
              const i = ABAS.findIndex((a) => a[0] === aba);
              if (x.key === 'ArrowRight') setAba(ABAS[(i + 1) % ABAS.length][0]);
              if (x.key === 'ArrowLeft') setAba(ABAS[(i - 1 + ABAS.length) % ABAS.length][0]);
            }}>{t}</button>
        ))}
      </div>

      {/* Painel */}
      <div role="tabpanel" id="p-painel" aria-labelledby="tb-painel" hidden={aba !== 'painel'} className="stack">
        {melhor.id !== 'atual' && dif > 0.5 ? (
          <p className="frase">Na simulação, a estratégia <b>{ROT_ESTR(melhor).toLowerCase()}</b> resultou em patrimônio final <b>{din(dif)}</b> maior que o seu plano. O que mais pesou: <b>{principal[0].toLowerCase()}</b>.</p>
        ) : (
          <p className="frase">Na simulação, <b>o seu plano</b> teve o melhor resultado entre as estratégias testadas{e.cenario.liquidez.length ? ' que cobrem a sua necessidade de liquidez' : ''}.</p>
        )}
        {!atual.liquidez_ok && <Callout titulo="Seu plano não cobre a necessidade de liquidez informada">{<p>As estratégias alternativas foram escolhidas entre as que entregam o valor na data.</p>}</Callout>}
        <details className="avancado">
          <summary><Icone n="info" />O que é “seu plano”?</summary>
          <div className="avancado-corpo">
            <p style={{ fontSize: '.92rem' }}>Seu plano usa as aplicações da etapa 4, com o <b>plano de resgate que você escolheu em cada uma</b>, no cenário da etapa 5. Onde você marcou “deixar o simulador sugerir”, o seu plano considera manter até o vencimento. No fim do horizonte, o que ainda estiver aplicado é resgatado, para comparar tudo em pé de igualdade.</p>
            <p style={{ fontSize: '.92rem' }}>A <b>necessidade de liquidez</b> não muda o seu plano. Ela limita as estratégias alternativas: o simulador só compara estratégias que entregam aquele valor naquela data.</p>
          </div>
        </details>
        <div className="card">
          <div className="bloco-t" style={{ marginBottom: '.2rem' }}>Patrimônio líquido no fim de cada ano, em {simbolo(m)} mil</div>
          {(() => {
            const series = [
              { e: melhor, cor: 'var(--verde)', tr: undefined as string | undefined },
              { e: atual, cor: 'var(--alerta)', tr: '7 5' },
              { e: v.todas.find((x) => x.id === 'manter'), cor: 'var(--bege-escuro)', tr: '2 4' },
            ].filter((s, i, arr) => s.e && arr.findIndex((x) => x.e?.id === s.e?.id) === i);
            return (
              <>
                <div className="legend">{series.map((s) => <span key={s.e!.id}><i style={{ borderColor: s.cor, borderTopStyle: s.tr ? (s.tr.startsWith('2') ? 'dotted' : 'dashed') : 'solid' }} />{ROT_ESTR(s.e!)}</span>)}</div>
                <GraficoLinha x={anos} tituloY={`${simbolo(m).toUpperCase()} MIL`} tituloX="ANO" aria="Patrimônio por ano nas estratégias"
                  fmtDica={(x) => `${simbolo(m)} ${fmt1(x)} mil`}
                  series={series.map((s) => ({ nome: ROT_ESTR(s.e!), cor: s.cor, tracejado: s.tr, dados: s.e!.patrimonio_por_ano.map((p) => (m === 'USD' ? p.usd : p.brl) / 1000) }))} />
              </>
            );
          })()}
          <p className="nota">Valor das aplicações na curva, líquido do IR que seria retido no resgate, mais o que já foi resgatado, menos os impostos americanos pagos. No último ano, tudo resgatado.</p>
        </div>
        {melhor.id !== 'atual' && (
          <div className="card">
            <div className="bloco-t" style={{ marginBottom: '.2rem' }}>De onde vem a diferença</div>
            <p className="ajuda">{ROT_ESTR(melhor)} frente ao seu plano.</p>
            <Decomposicao itens={decItens} total={dif * fxFim} fmt={(x) => dinheiro(x, m, true)} />
          </div>
        )}
      </div>

      {/* Alternativas */}
      <div role="tabpanel" id="p-alt" aria-labelledby="tb-alt" hidden={aba !== 'alt'} className="stack">
        <Alternativas e={e} v={v} />
      </div>

      {/* Estratégias */}
      <div role="tabpanel" id="p-estr" aria-labelledby="tb-estr" hidden={aba !== 'estr'}>
        <div className="estrategias">
          {[...v.todas]
            .sort((a, b) => (a.id === 'atual' ? -1 : b.id === 'atual' ? 1 : objetivo(b, e.cenario.objetivo) - objetivo(a, e.cenario.objetivo)))
            .map((x) => (
              <article key={x.id} className={`est${x.id === melhor.id ? ' is-melhor' : ''}`}>
                <span className="eyebrow" style={{ margin: 0, color: x.id === melhor.id ? 'var(--verde)' : undefined }}>{x.id === melhor.id ? 'Na simulação, melhor resultado' : x.id === 'atual' ? 'Seu plano' : 'Alternativa'}</span>
                <h4>{ROT_ESTR(x)}</h4>
                <p className="plano">{descreve(e, x.cronograma)}</p>
                <div className="v">{(() => { const [n, u] = grande(v.conv(x.patrimonio_final_usd, v.anoFim)); return `${simbolo(m)} ${n} ${u}`; })()}
                  {x.id !== 'atual' && <small className={x.patrimonio_final_usd >= atual.patrimonio_final_usd ? 'dif-pos' : 'dif-neg'}>{din(x.patrimonio_final_usd - atual.patrimonio_final_usd, v.anoFim, true)}</small>}
                </div>
                <dl>
                  <dt>Carga efetiva</dt><dd>{fmtPct(x.carga_efetiva)}</dd>
                  <dt>Crédito em saldo no fim</dt><dd>{din(x.resumo_credito.saldo)}</dd>
                  <dt>Crédito expirado</dt><dd>{din(x.resumo_credito.expirado)}</dd>
                  <dt>Cobre a liquidez</dt><dd>{x.liquidez_ok ? 'Sim' : 'Não'}</dd>
                </dl>
              </article>
            ))}
        </div>
        <p className="nota">Estratégias simuladas: seu plano, manter até o vencimento, resgate total em cada ano, na Light esperar passar de 720 dias e a melhor combinação de resgates por aplicação e ano (busca em grade com melhoria local). Crédito ou dedução é escolhido ano a ano dentro de cada estratégia. Linguagem de simulação, não de recomendação.</p>
      </div>

      {/* Crédito */}
      <div role="tabpanel" id="p-cred" aria-labelledby="tb-cred" hidden={aba !== 'cred'} className="stack">
        <div className="card">
          <div className="bloco-t" style={{ marginBottom: '.2rem' }}>Linha do tempo do crédito, em {simbolo(m)} mil</div>
          <div className="legend">
            <span><i className="box" style={{ background: 'var(--verde-tint)', borderColor: 'var(--verde)' }} />Teto do ano</span>
            <span><i className="box" style={{ background: 'var(--bege)', borderColor: 'var(--bege-escuro)' }} />IR retido no Brasil</span>
            <span><i className="box" style={{ background: 'var(--verde)', borderColor: 'var(--verde)' }} />Crédito usado</span>
            <span><i style={{ borderColor: 'var(--alerta)' }} />Saldo no fim do ano</span>
          </div>
          <GraficoCredito anos={anos} tituloY={`${simbolo(m).toUpperCase()} MIL`}
            teto={atual.anos.map((a) => v.conv(a.federal.teto, a.ano) / 1000)}
            irbr={atual.anos.map((a) => v.conv(a.ir_brasil_usd - a.iof_brasil_usd, a.ano) / 1000)}
            usado={atual.anos.map((a) => v.conv(a.credito_usado, a.ano) / 1000)}
            saldo={atual.anos.map((a) => v.conv(saldoFimDoAno(atual, a.ano), a.ano) / 1000)} />
        </div>
        {atual.alertas.filter((a) => a.codigo.startsWith('retificar_')).map((a) => <Callout key={a.codigo} titulo="Retificar a declaração do ano anterior (Form 1040-X)"><p>{a.texto}</p></Callout>)}
        <div>
          <div className="bloco-t">Controle do saldo <span className="ajuda" style={{ fontFamily: 'var(--sans)' }}>no estilo do Schedule B do Form 1116 · seu plano</span></div>
          <div className="tabela-wrap">
            <table className="tabela tabela--densa">
              <thead><tr><th>Ano de origem</th><th className="r">Imposto creditável</th><th className="r">Usado no próprio ano</th><th className="r">Ano anterior</th><th className="r">Anos seguintes</th><th className="r">Expirado</th><th className="r">Expira em</th><th className="r">Saldo no fim</th></tr></thead>
              <tbody>
                {atual.credito.origens.length ? atual.credito.origens.map((o) => {
                  const ano = Math.max(o.ano_origem, anos[0]);
                  const ant = o.enviado_anterior.reduce((s, x) => s + x.valor, 0);
                  const seg = o.usado_seguintes.reduce((s, x) => s + x.valor, 0);
                  return (
                    <tr key={o.ano_origem}>
                      <td>{o.ano_origem}{o.inicial ? <small>saldo informado</small> : null}</td>
                      <td className="r">{din(o.gerado, ano)}</td>
                      <td className="r">{o.inicial ? '—' : din(o.usado_proprio, ano)}</td>
                      <td className="r">{ant ? <>{din(ant, ano)}<small>em {o.enviado_anterior.map((x) => x.ano).join(', ')}</small></> : '—'}</td>
                      <td className="r">{seg ? din(seg, ano) : '—'}</td>
                      <td className="r">{o.expirado ? din(o.expirado, ano) : '—'}</td>
                      <td className="r">{o.ano_expiracao}</td>
                      <td className="r"><b>{din(o.saldo_final, ano)}</b></td>
                    </tr>
                  );
                }) : <tr><td colSpan={8}>Nenhum imposto estrangeiro a creditar neste horizonte.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="nota">Imposto retido no Brasil convertido pelo câmbio da data de cada retenção. Ordem obrigatória: próprio ano, ano anterior, até 10 anos seguintes (26 CFR §1.904-2). {atual.anos_deducao.length ? `Em ${atual.anos_deducao.join(', ')}, a simulação deduziu o imposto em vez de creditar.` : ''}</p>
          <div style={{ marginTop: '.6rem' }}>
            <button className="link" type="button" onClick={() => abrirMemoria(atual.memoria.credito)}>Ver a memória de cálculo do crédito</button>
            {' · '}
            <button className="link" type="button" onClick={() => abrirMemoria(atual.memoria[`teto_${v.anoFim}`])}>Teto de {v.anoFim}</button>
          </div>
        </div>
      </div>

      {/* Por produto */}
      <div role="tabpanel" id="p-prod" aria-labelledby="tb-prod" hidden={aba !== 'prod'} className="stack">
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Aplicação</th><th className="r">Juros nos EUA</th><th className="r">IR no Brasil</th><th className="r">Carga<small>seu plano</small></th><th className="r">Carga<small>{ROT_ESTR(melhor).toLowerCase()}</small></th>{v.outraConta && <th className="r">Carga<small>na CNR {v.regime === 'light' ? 'Full' : 'Light'}</small></th>}</tr></thead>
            <tbody>
              {atual.por_posicao.map((p) => (
                <tr key={p.id}>
                  <td><b>{rotuloAplicacao(e, p.id)}</b></td>
                  <td className="r">{din(p.juros_usd)}</td>
                  <td className="r">{din(p.ir_brasil_usd)}</td>
                  <td className="r">{fmtPct(p.carga)}</td>
                  <td className="r">{fmtPct(melhor.por_posicao.find((x) => x.id === p.id)?.carga)}</td>
                  {v.outraConta && <td className="r">{fmtPct(v.outraConta.por_posicao.find((x) => x.id === p.id)?.carga)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">Carga efetiva = (IR no Brasil + IR federal depois do crédito + NIIT + estadual) ÷ juros reconhecidos nos EUA, com os impostos americanos rateados pela renda de cada aplicação. Valores somados no horizonte, convertidos pelo câmbio do fim do horizonte quando em reais.</p>
      </div>

      {/* Detalhamento */}
      <div role="tabpanel" id="p-det" aria-labelledby="tb-det" hidden={aba !== 'det'} className="stack">
        <div className="tabela-wrap">
          <table className="tabela tabela--densa">
            <thead><tr><th>Ano</th><th className="r">Juros e OID<small>fonte estrangeira</small></th><th className="r">Câmbio §988<small>fonte EUA</small></th><th className="r">IR e IOF<small>no Brasil</small></th><th className="r">Teto</th><th className="r">Crédito usado</th><th className="r">Federal<small>depois do crédito</small></th><th className="r">NIIT</th><th className="r">Estadual</th></tr></thead>
            <tbody>
              {atual.anos.map((a) => (
                <tr key={a.ano}>
                  <td>{a.ano}{a.modo_credito === 'deducao' ? <small>dedução</small> : null}</td>
                  <td className="r">{din(a.juros_usd, a.ano)}</td>
                  <td className="r">{din(a.cambio_usd, a.ano)}</td>
                  <td className="r">{din(a.ir_brasil_usd, a.ano)}</td>
                  <td className="r"><button className="memo-claro" type="button" onClick={() => abrirMemoria(atual.memoria[`teto_${a.ano}`])}>{din(a.federal.teto, a.ano)}</button></td>
                  <td className="r">{din(a.credito_usado, a.ano)}</td>
                  <td className="r">{din(a.federal_liquido_incremental, a.ano)}</td>
                  <td className="r">{din(a.niit_incremental, a.ano)}</td>
                  <td className="r">{din(a.estadual, a.ano)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">Seu plano. Federal = imposto com os investimentos do Brasil menos o imposto sem eles, depois do crédito (o crédito recebido de um ano seguinte aparece no ano que o recebe, por retificação). {m === 'BRL' ? 'Em reais, pelo câmbio projetado do fim de cada ano; a declaração americana é feita em dólar.' : ''}</p>
        <div className="nao-imprimir"><button className="btn btn--ghost btn--sm" type="button" onClick={() => baixaCSV(v)}>Baixar tabela (CSV)</button></div>
      </div>
    </section>
  );
}

/* ---------- aba Alternativas ---------- */
function Alternativas({ e, v }: { e: EstadoUI; v: Visao }) {
  const { atual, melhor } = v;
  const media = (k: 'ipca' | 'cdi') => v.mercado.anos.reduce((s, a) => s + a[k], 0) / Math.max(1, v.mercado.anos.length) / 100;
  const linhas = atual.por_posicao
    .filter((p) => p.ir_brasil_usd > 0.5 && p.juros_usd > 0 && p.carga !== null)
    .flatMap((p) => {
      // enquanto um novo cálculo roda, o resultado anterior pode citar uma aplicação já removida
      const l = e.carteira.find((x) => `a${x.uid}` === p.id);
      if (!l) return [];
      const idx = IDX[l.idx].motor;
      const indice = idx === 'ipca_mais' ? media('ipca') : idx === 'cdi_mais' || idx === 'selic_mais' ? media('cdi') : 0;
      const pos = { indexador: idx, taxa: lerNumero(l.taxa) };
      const tBR = p.ir_brasil_usd / p.juros_usd;
      // a mesma renda, isenta no Brasil, pagaria só o imposto americano dela
      const cargaIsento = Math.max(0, p.impostos_eua_usd / p.juros_usd);
      const cargaCheia = Math.max(tBR, cargaIsento);
      const cargaMelhor = melhor.por_posicao.find((x) => x.id === p.id)?.carga ?? p.carga!;
      const isento = idx === 'cdi' ? 'LCI ou LCA, % do CDI' : idx === 'pre' ? 'LCI ou LCA prefixada' : idx === 'ipca_mais' ? 'CRI, CRA ou debênture incentivada, IPCA +' : 'CRI, CRA ou debênture incentivada, CDI +';
      const fmtTaxa = (x: number) => (idx === 'cdi' ? `${fmt1(x)}% do CDI` : idx === 'pre' ? `${fmt2(x)}% a.a.` : `${IDX[l.idx].pre} ${fmt2(x)}%`);
      return [{ p, l, pos, indice, isento, fmtTaxa, cargaIsento, carga: p.carga!, cargaCheia, cargaMelhor, eqPlano: taxaEquilibrio(pos, p.carga!, cargaIsento, indice), eqCheio: taxaEquilibrio(pos, cargaCheia, cargaIsento, indice) }];
    });
  const [sel, setSel] = useState(0);
  const [oferta, setOferta] = useState('');
  const L = linhas[Math.min(sel, linhas.length - 1)];
  const rendTotal = (taxa: number) => (!L ? 0 : L.pos.indexador === 'cdi' || L.pos.indexador === 'pre' ? taxa : (1 + L.indice) * (1 + taxa / 100) - 1);
  const of = lerNumero(oferta);
  const ganho = (carga: number) => (L && of > 0 ? L.p.juros_usd * ((rendTotal(of) / rendTotal(L.pos.taxa)) * (1 - L.cargaIsento) - (1 - carga)) : 0);
  const din = (usd: number) => dinheiro(v.conv(usd, v.anoFim), v.moeda, true);
  return (
    <>
      <Callout tipo="branco" icone="info" titulo="Simulação, não recomendação">
        <p>Mostra, na sua situação, a partir de que taxa um produto isento no Brasil empata com o que você tem, depois de todos os impostos. Considera só impostos: não considera risco de crédito, garantia do FGC, liquidez nem o seu perfil de investidor. Leve ao seu assessor antes de decidir.</p>
      </Callout>
      <p className="frase">Para quem mora nos EUA, o isento só rende mais que o produto com IR quando o crédito desse produto se perde, ou quando a alíquota brasileira passa da americana. Com o crédito todo usado, a taxa de equilíbrio fica perto da própria taxa do produto com IR, porque nos EUA os dois pagam o mesmo imposto.</p>
      {linhas.length === 0 ? (
        <div className="vazio">Nenhuma aplicação com IR no Brasil nesta simulação: não há troca por isento a comparar.</div>
      ) : (
        <>
          <div>
            <div className="bloco-t">A partir de que taxa um isento empata</div>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Você tem</th><th className="r">Carga<small>seu plano</small></th><th>Isento comparável</th><th className="r">Carga do isento<small>só EUA</small></th><th className="r">Empata a partir de<small>seu plano</small></th><th className="r">Empata a partir de<small>crédito todo usado</small></th></tr></thead>
                <tbody>
                  {linhas.map((x) => (
                    <tr key={x.p.id}><td><b>{rotuloAplicacao(e, x.p.id)}</b></td><td className="r">{fmtPct(x.carga)}</td><td>{x.isento}</td><td className="r">{fmtPct(x.cargaIsento)}</td><td className="r"><b>{x.fmtTaxa(x.eqPlano)}</b></td><td className="r">{x.fmtTaxa(x.eqCheio)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="nota">Taxa de equilíbrio = taxa do produto com IR × (1 − carga dele) ÷ (1 − carga do isento). Carga do isento = imposto americano (federal, NIIT e estadual) sobre a mesma renda, que continua tributada nos EUA. Em IPCA+ e CDI+, a conta usa o rendimento total projetado no cenário. Acima da taxa de equilíbrio, o isento rende mais depois dos impostos.</p>
          </div>
          <div className="card">
            <div className="bloco-t">Teste uma troca</div>
            <div className="troca-grid">
              <div className="field"><label htmlFor="trocaDe">Trocar</label>
                <select className="input" id="trocaDe" value={Math.min(sel, linhas.length - 1)} onChange={(x) => { setSel(Number(x.target.value)); setOferta(''); }}>
                  {linhas.map((x, i) => <option key={x.p.id} value={i}>{rotuloAplicacao(e, x.p.id)}</option>)}
                </select>
              </div>
              <div className="field"><span className="lbl">Por</span><div className="troca-fixo">{L.isento}</div></div>
              <div className="field"><label htmlFor="trocaTaxa">Taxa oferecida</label>
                <CampoValor id="trocaTaxa" prefixo={IDX[L.l.idx].pre || undefined} sufixo={IDX[L.l.idx].suf} valor={oferta} placeholder={fmt1(L.eqPlano).replace('.', ',')} onChange={setOferta} />
              </div>
            </div>
            <p className="ajuda" style={{ marginTop: '.6rem' }}>Empata em <b>{L.fmtTaxa(L.eqPlano)}</b> no seu plano e em <b>{L.fmtTaxa(L.eqCheio)}</b> se todo o crédito for usado.</p>
            {of > 0 ? (
              <div className="troca-res">
                <div className="mini"><span>Com o seu plano de resgate</span><b className={ganho(L.carga) >= 0 ? 'dif-pos' : 'dif-neg'}>{din(ganho(L.carga))}</b><span>no patrimônio final</span></div>
                <div className="mini"><span>Com {melhor.id === 'atual' ? 'o seu plano' : ROT_ESTR(melhor).toLowerCase()}</span><b className={ganho(L.cargaMelhor) >= 0 ? 'dif-pos' : 'dif-neg'}>{din(ganho(L.cargaMelhor))}</b><span>no patrimônio final</span></div>
                <p className="nota" style={{ gridColumn: '1/-1' }}>Estimativa: mesma renda e mesmos prazos, mudando só a taxa e o tratamento no Brasil. Não considera que a troca também muda o teto do crédito das outras aplicações.</p>
              </div>
            ) : (
              <p className="ajuda">Digite a taxa oferecida para ver o efeito no patrimônio final.</p>
            )}
          </div>
        </>
      )}
      <div>
        <div className="bloco-t">Outras mudanças a avaliar</div>
        <div className="estrategias">
          <article className="est"><span className="eyebrow" style={{ margin: 0 }}>Sem trocar de produto</span><h4>Mudar o plano de resgate</h4><p>{melhor.id !== 'atual' ? <>Na simulação, {ROT_ESTR(melhor).toLowerCase()} mudou o patrimônio final em <b>{din(melhor.patrimonio_final_usd - atual.patrimonio_final_usd)}</b>. Veja a aba Estratégias.</> : 'Na simulação, nenhuma mudança de resgate superou o seu plano.'}</p></article>
          <article className="est"><span className="eyebrow" style={{ margin: 0 }}>Estrutura do título</span><h4>Com cupom no lugar de sem cupom</h4><p>O IR brasileiro é retido a cada cupom e vira crédito no mesmo ano, o que reduz o descasamento de prazo. Teste trocando o pagamento na etapa 4.</p></article>
          <article className="est"><span className="eyebrow" style={{ margin: 0 }}>Prazo</span><h4>Prazo de até 1 ano, renovado</h4><p>Sem juros anuais (OID): a renda e o IR caem no mesmo ano. Na Light, prazos curtos pagam 17,5% a 22,5% no Brasil, que precisam caber na sua alíquota média americana.</p></article>
          <article className="est"><span className="eyebrow" style={{ margin: 0 }}>Renda isenta</span><h4>Isentos ampliam o teto</h4><p>Juros sem IR no Brasil entram na renda estrangeira e abrem espaço no teto para o crédito do CDB, do Tesouro (na Light) e das debêntures comuns.</p></article>
        </div>
      </div>
    </>
  );
}

/* ---------- painel lateral dos resultados ---------- */
export function PainelResultados({ e, calc, regime, interp, abrirMemoria }: { e: EstadoUI; calc: EstadoCalculo; regime: Regime; interp: number; abrirMemoria: (m: Memoria) => void }) {
  const exec = calc.fase === 'pronto' ? calc.execucao : calc.fase === 'calculando' ? calc.anterior : null;
  if (!exec || !exec.ok) return <><div className="r-titulo"><h3>Seu plano · resultado</h3></div><div className="bn-sub">{calc.fase === 'calculando' ? 'Calculando…' : 'Os números aparecem quando os dados estiverem completos.'}</div></>;
  const v = montaVisao(exec.resultado, exec.dados_mercado, e, regime, interp)!;
  const { atual, melhor } = v;
  const m = v.moeda;
  const fx = v.mercado.cambio_fim_ano[v.anoFim] ?? 1;
  const [n, u] = grande(m === 'USD' ? atual.patrimonio_final_usd : atual.patrimonio_final_usd * fx);
  const rc = atual.resumo_credito;
  const conv = (x: number) => fmt0(m === 'USD' ? x : Math.round((x * fx) / 10) * 10);
  const dif = melhor.patrimonio_final_usd - atual.patrimonio_final_usd;
  const [dn, du] = grande(m === 'USD' ? dif : dif * fx);
  const est = atual.estado;
  const nomeUf = ESTADOS.find((x) => x[0] === e.perfil.estado)?.[1] ?? e.perfil.estado;
  const ordem = { alto: 0, pendente: 1, medio: 2, baixo: 3, info: 4 };
  return (
    <>
      <div className="r-titulo"><h3>Seu plano · CNR {v.regime === 'light' ? 'Light' : 'Full'}</h3>{calc.fase === 'calculando' ? <span className="calc-status">atualizando…</span> : <span className="ao-vivo">ao vivo</span>}</div>
      <div className="bn">
        <div className="bn-label">Patrimônio final em {v.anoFim}</div>
        <button className="memo bn-valor tnum" type="button" onClick={() => abrirMemoria(atual.memoria.patrimonio_final)}>{simbolo(m)} {n}<small>{u}</small></button>
        <div className="bn-sub">{m === 'USD' ? `R$ ${fmt0(atual.patrimonio_final_brl)}` : `US$ ${fmt0(atual.patrimonio_final_usd)}`} · depois de todos os impostos</div>
      </div>
      <div className="bn">
        <div className="bn-label">Carga efetiva total</div>
        <button className="memo bn-valor tnum" type="button" onClick={() => abrirMemoria(atual.memoria.carga)}>{fmtPct(atual.carga_efetiva)}</button>
        <div className="bn-sub">dos juros reconhecidos nos EUA</div>
      </div>
      <div className="bn">
        <div className="bn-label">Crédito do IR brasileiro, em {simbolo(m)}</div>
        <div className="bn-sub">{conv(rc.imposto_estrangeiro)} creditável{rc.deduzido > 0.5 ? ` · ${conv(rc.deduzido)} deduzido` : ''}</div>
        <div className="bn-grid tnum">
          <div><span>Usado no próprio ano</span><b><button className="memo" type="button" onClick={() => abrirMemoria(atual.memoria.credito)}>{conv(rc.proprio)}</button></b></div>
          <div><span>Enviado ao ano anterior</span><b>{conv(rc.ano_anterior)}</b></div>
          <div><span>Usado nos anos seguintes</span><b>{conv(rc.seguintes)}</b></div>
          <div><span>Em saldo · expirado</span><b>{conv(rc.saldo)} · {conv(rc.expirado)}</b></div>
        </div>
      </div>
      <div className="bn">
        <div className="bn-label">Melhor estratégia na simulação</div>
        {melhor.id !== 'atual' && dif > 0.5 ? (
          <><div className="bn-valor tnum">+{simbolo(m)} {dn.replace('−', '')}<small>{du}</small></div><div className="bn-sub">{ROT_ESTR(melhor)}</div></>
        ) : (
          <div className="bn-sub" style={{ fontSize: '.95rem', color: '#fff' }}>O seu plano teve o melhor resultado entre as estratégias testadas.</div>
        )}
      </div>
      <span className="selo selo--estado">{est.modo === 'A' ? <><Icone n="check" /> Estado incluído</> : est.selo === 'estimado' ? <><Icone n="alerta" /> Estadual estimado pelo usuário</> : <><Icone n="alerta" /> Imposto estadual não incluído</>} · {nomeUf}</span>
      <div className="r-sec">
        <h4>Alertas</h4>
        {[...atual.alertas].sort((a, b) => ordem[a.nivel] - ordem[b.nivel]).map((a) => <AlertaPainel key={a.codigo} a={a} />)}
      </div>
      <div className="r-botoes">
        <button className="btn btn--bege" type="button" onClick={() => window.print()}>Salvar resultado em PDF</button>
        <button className="btn btn--claro" type="button" onClick={() => baixaCSV(v)}>Baixar tabela (CSV)</button>
      </div>
      <p className="bn-sub" style={{ marginTop: '.6rem' }}>PDF e CSV são gerados no seu computador. Nada é enviado.</p>
    </>
  );
}

/** Painel da etapa 3: IR retido no Brasil nas duas contas, quando a simulação estiver pronta. */
export function PainelConta({ calc }: { calc: EstadoCalculo }) {
  const exec = calc.fase === 'pronto' ? calc.execucao : calc.fase === 'calculando' ? calc.anterior : null;
  const ir = (r: Regime) => {
    if (!exec || !exec.ok) return null;
    const R = exec.resultado.find((x) => x.regime === r);
    const a = R?.interpretacoes[0].estrategias.find((x) => x.id === 'atual');
    return a ? a.anos.reduce((s, y) => s + y.ir_brasil_brl, 0) : null;
  };
  const anoFim = exec && exec.ok ? exec.resultado[0].interpretacoes[0].estrategias[0].anos.at(-1)?.ano : undefined;
  const bloco = (r: Regime, rot: string, sub: string) => {
    const x = ir(r);
    return (
      <div className="bn">
        <div className="bn-label">{rot}</div>
        <div className="bn-valor tnum">{x === null ? '—' : <>R$ {fmt0(x / 1000)}<small>mil</small></>}</div>
        <div className="bn-sub">{sub}</div>
      </div>
    );
  };
  return (
    <>
      <div className="r-titulo"><h3>IR retido no Brasil{anoFim ? ` até ${anoFim}` : ''}</h3>{calc.fase === 'calculando' ? <span className="calc-status">atualizando…</span> : <span className="ao-vivo">ao vivo</span>}</div>
      {bloco('light', 'CNR Light', 'Tesouro, CDB e debêntures comuns pela tabela regressiva; isentos com 0%')}
      {bloco('full', 'CNR Full', 'CDB e debêntures comuns com 15%; Tesouro e isentos com 0%')}
      <div className="r-alerta"><Icone n="info" /><span><b>Menos IR no Brasil não é menos imposto no total.</b> Nos EUA, a renda é tributada igual nas duas contas; o IR brasileiro só vira crédito até o teto.</span></div>
    </>
  );
}

/* ======================= 7. ENTENDA O CÁLCULO ======================= */
type Folha = { caminho: string; status: string; fonte: string; url: string; data: string; rotulo?: string; nota?: string };
function folhas(no: unknown, caminho = ''): Folha[] {
  if (!no || typeof no !== 'object' || Array.isArray(no)) return [];
  const o = no as Record<string, unknown>;
  if ('status' in o) return [{ caminho, status: String(o.status), fonte: String(o.fonte), url: String(o.url), data: String(o.data_verificacao), rotulo: o.rotulo as string | undefined, nota: o.nota as string | undefined }];
  return Object.entries(o).flatMap(([k, v]) => folhas(v, caminho ? `${caminho}.${k}` : k));
}
const NOMES_PROD = Object.fromEntries(Object.entries(PRODUTOS).map(([n, p]) => [p.id, n]));
function nomeRegra(c: string, ano: number): string {
  const p = c.split('.');
  if (p[0] === 'regimes') return `CNR ${p[1] === 'light' ? 'Light' : 'Full'} · ${NOMES_PROD[p[2]] ?? p[2]} · ${p[3] === 'iof' ? 'IOF' : 'IR'}`;
  const M: Record<string, string> = {
    tabela_regressiva: 'Tabela regressiva', iof_regressivo: 'Tabela do IOF regressivo', 'cupons.prazo_light': 'IR sobre cupons na Light',
    'cupons.taxa_cupom_tesouro.tesouro_pre_cupom': 'Cupom do Tesouro Prefixado com juros semestrais', 'cupons.taxa_cupom_tesouro.tesouro_ipca_cupom': 'Cupom do Tesouro IPCA+ com juros semestrais',
    'imoveis.ganho_capital': 'Ganho de capital em imóveis (Fase 2)', 'niit.aliquota': 'NIIT: alíquota', 'niit.inclui_cambio_988': 'NIIT: ganho cambial',
    'credito.carryback_anos': 'Crédito: anos para trás', 'credito.carryforward_anos': 'Crédito: anos para frente', curto_prazo_meses: 'Título de curto prazo',
    deducao_imposto_estrangeiro: 'Dedução do imposto estrangeiro', tem_imposto_juros_dividendos: 'Imposto estadual sobre juros e dividendos',
  };
  if (M[c]) return M[c];
  const F: Record<string, string> = { single: 'Single', mfj: 'MFJ', mfs: 'MFS', hoh: 'HoH' };
  if (p[0] === 'faixas') return `Faixas federais de ${ano} · ${F[p[1]]}`;
  if (p[0] === 'deducao_padrao') return `Dedução padrão de ${ano} · ${F[p[1]]}`;
  if (p[0] === 'ganho_capital_qualificado') return `Ganho de capital e dividendos qualificados · ${F[p[1]]}`;
  if (p[0] === 'niit' && p[1] === 'limiar_magi') return `NIIT: limite · ${F[p[2]]}`;
  return c;
}

export function Entenda({ dados }: { dados: Dados }) {
  const grupos: [string, Folha[]][] = [
    ['Brasil', folhas(dados.brutos.brasil)],
    ['EUA, federal', folhas(dados.brutos.eua)],
    ['Estados do Modo A', (dados.brutos.estados as { nome: string }[]).flatMap((s) => folhas(s).map((f) => ({ ...f, caminho: `${s.nome}` })))],
  ];
  const pendentes = grupos.flatMap(([, fs]) => fs.filter((f) => f.status === 'pendente'));
  return (
    <section className="tela" aria-labelledby="t7">
      <header className="tela-head">
        <span className="eyebrow">Etapa 7 · Transparência</span>
        <h2 id="t7" tabIndex={-1}>Entenda o cálculo</h2>
        <p>As regras usadas, de onde vêm, quando foram verificadas e o que ainda está pendente.</p>
      </header>
      <nav className="subnav" aria-label="Seções">
        <a href="#e-aviso">Aviso</a><a href="#e-como">Como calculamos</a><a href="#e-isencao">Isenção brasileira</a><a href="#e-gloss">Glossário</a><a href="#e-pend">Pendências</a><a href="#e-regras">Regras e fontes</a>
      </nav>
      <div className="stack">
        <div className="aviso-card" id="e-aviso"><span className="pill-out">Aviso obrigatório</span><p><b>Aviso importante.</b> {AVISO_COMPLETO}</p></div>
        <div className="card" id="e-como">
          <div className="bloco-t">Como o simulador calcula</div>
          <ul style={{ paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '.5rem', fontSize: '.95rem' }}>
            <li><b>Brasil:</b> IR retido em cada cupom, resgate ou vencimento, pela regra da conta (Light ou Full) e do produto. IOF em resgates com menos de 30 dias.</li>
            <li><b>EUA:</b> títulos com prazo de emissão acima de 1 ano têm os juros (OID) reconhecidos ano a ano, convertidos pelo câmbio médio; até 1 ano, no resgate. Cupons no ano do recebimento. Variação cambial (§988) como renda de fonte americana.</li>
            <li><b>Crédito:</b> teto do Form 1116 (IR federal × renda estrangeira tributável ÷ renda tributável total); excedente volta 1 ano e segue por até 10. Crédito ou dedução escolhido ano a ano.</li>
            <li><b>Imposto americano:</b> calculado com e sem os investimentos do Brasil; a diferença é o custo desses investimentos. NIIT à parte (o crédito não abate).</li>
          </ul>
          <div className="bloco-t" style={{ marginTop: '1.2rem' }}>Por que o federal dá um bom norte</div>
          <ul style={{ paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '.5rem', fontSize: '.95rem' }}>{FEDERAL_NORTE.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <Callout id="e-isencao" icone="info" titulo="Por que a isenção brasileira não vale nos EUA"><p>{ISENCAO_EUA}</p></Callout>
        <div id="e-gloss">
          <div className="bloco-t">Glossário</div>
          <div className="glossario">{GLOSSARIO.map(([t, d]) => <div className="gl" key={t}><b>{t}</b><p>{d}</p></div>)}</div>
        </div>
        <div id="e-pend">
          <div className="bloco-t">Pendências</div>
          <ul className="pendencias">
            {pendentes.map((f) => <li key={f.caminho}><span className="selo selo--pend">Pendente</span><b>{f.rotulo ?? nomeRegra(f.caminho, dados.params.eua.ano)}</b>{f.nota}</li>)}
            <li><span className="selo selo--aprox">Aproximação</span><b>Classificação americana dos títulos</b>CDI, IPCA+ e cupons indexados: classificação final pelo contador.</li>
          </ul>
        </div>
        <div id="e-regras">
          <div className="bloco-t">Regras usadas e fontes</div>
          {grupos.map(([g, fs]) => (
            <details key={g} className="avancado" style={{ marginBottom: '.7rem' }} open={g !== 'Brasil'}>
              <summary>{g} <small>{fs.length} regras</small></summary>
              <div className="tabela-wrap" style={{ margin: '0 1rem 1rem' }}>
                <table className="tabela">
                  <thead><tr><th>Regra</th><th>Fonte</th><th>Verificada em</th><th>Status</th></tr></thead>
                  <tbody>{fs.map((f) => (
                    <tr key={g + f.caminho}><td>{g === 'Estados do Modo A' ? f.caminho : nomeRegra(f.caminho, dados.params.eua.ano)}</td><td>{f.fonte}<small><a href={f.url} target="_blank" rel="noopener noreferrer">{f.url.replace(/^https?:\/\//, '').slice(0, 60)}</a></small></td><td>{isoParaBR(f.data)}</td><td>{f.status === 'confirmado' ? <Selo tipo="ok">Confirmado</Selo> : <Selo tipo="pend">Pendente</Selo>}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PainelEntenda({ dados }: { dados: Dados }) {
  const pend = [...folhas(dados.brutos.brasil), ...folhas(dados.brutos.eua)].filter((f) => f.status === 'pendente').length;
  return (
    <>
      <div className="r-titulo"><h3>Sobre os dados</h3></div>
      <div className="bn"><div className="bn-label">Parâmetros tributários</div><div className="bn-valor tnum" style={{ fontSize: '1.6rem' }}>{isoParaBR(String((dados.brutos.brasil as { revisado_em: string }).revisado_em))}</div><div className="bn-sub">Última revisão. Revisados ao menos uma vez por ano e a cada mudança de lei.</div></div>
      <div className="bn"><div className="bn-label">Dados de mercado</div><div className="bn-valor tnum" style={{ fontSize: '1.6rem' }}>{isoParaBR(dados.mercado.hoje)}</div><div className="bn-sub">Banco Central (SGS e Focus{dados.mercado.focus ? ` de ${isoParaBR(dados.mercado.focus.data_coleta)}` : ''}), atualização automática em dias úteis. Se a rotina falhar, vale o último arquivo válido.</div></div>
      <div className="bn"><div className="bn-label">Pendências abertas</div><div className="bn-valor tnum" style={{ fontSize: '1.6rem' }}>{pend} <small>+ 1 aproximação</small></div></div>
      <div className="r-alerta"><Icone n="cadeado" /><span><b>Nada foi salvo.</b> Sem cookies, sem armazenamento no navegador, nada enviado a servidor.</span></div>
    </>
  );
}

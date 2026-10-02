// Casca da aplicação: topo, etapas, painel-resumo, rodapé e diálogos. Todo o estado vive só na memória.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Memoria, Regime } from '../motores/tipos';
import { Dialogo, Icone, Protecao } from './comuns';
import { useSimulacao, type Dados } from './dados';
import { estadoInicial, montaSimulacao, type EstadoUI } from './estado';
import { Boasvindas, Cenario, Conta, Investimentos, PainelCarteira, PainelCenario, PainelPerfil, Residencia } from './etapas';
import { isoParaBR } from './formato';
import { DialogoMemoria, Entenda, PainelConta, PainelEntenda, PainelResultados, Resultados } from './resultados';
import { AVISO_COMPLETO, AVISO_CURTO } from './textos';

const ETAPAS: [string, string][] = [
  ['Boas-vindas', 'O que o simulador faz'],
  ['Onde você mora', 'Estado, declaração e renda'],
  ['Sua conta no Brasil', 'CNR Light ou Full'],
  ['Seus investimentos', 'Uma linha por aplicação'],
  ['Cenário', 'Mercado, horizonte e liquidez'],
  ['Resultados', 'Carga, crédito e alternativas'],
  ['Entenda o cálculo', 'Regras, fontes e pendências'],
];

export function App({ dados }: { dados: Dados }) {
  const [e, set] = useState<EstadoUI>(() => estadoInicial(dados.mercado));
  const [regime, setRegime] = useState<Regime>('light');
  const [interp, setInterp] = useState(0);
  const [memoria, setMemoria] = useState<Memoria | null>(null);
  const [aviso, setAviso] = useState(false);
  const [recomecar, setRecomecar] = useState(false);
  const main = useRef<HTMLElement>(null);

  const hoje = dados.mercado.hoje;
  const { sim, problemas } = useMemo(() => montaSimulacao(e, hoje), [e, hoje]);
  const calc = useSimulacao(e.liberado ? sim : null, dados);

  // a conta escolhida na etapa 3 define a conta exibida; "comparar" deixa o seletor nos resultados
  useEffect(() => {
    if (e.conta !== 'comparar') setRegime(e.conta);
  }, [e.conta]);
  useEffect(() => setInterp(0), [sim]);

  const irPara = (n: number) => {
    set((s) => ({ ...s, etapa: n }));
    requestAnimationFrame(() => {
      main.current?.scrollTo({ top: 0 });
      (document.getElementById(`t${n}`) ?? main.current)?.focus({ preventScroll: true });
    });
  };

  const exec = calc.fase === 'pronto' ? calc.execucao : calc.fase === 'calculando' ? calc.anterior : null;
  const jurosBrasil = useMemo(() => {
    if (!exec || !exec.ok) return null;
    const R = exec.resultado.find((r) => r.regime === regime) ?? exec.resultado[0];
    const a = R.interpretacoes[0].estrategias[0];
    return Math.max(0, ...a.anos.map((y) => y.juros_usd + Math.max(0, y.cambio_usd)));
  }, [exec, regime]);

  const etapa = e.etapa;
  const conteudo = (() => {
    switch (etapa) {
      case 1: return <Boasvindas entrar={() => { set((s) => ({ ...s, liberado: true })); irPara(2); }} />;
      case 2: return <Residencia e={e} set={set} problemas={problemas} dados={dados} />;
      case 3: return <Conta e={e} set={set} />;
      case 4: return <Investimentos e={e} set={set} problemas={problemas} hoje={hoje} />;
      case 5: return <Cenario e={e} set={set} dados={dados} problemas={problemas} />;
      case 6: return <Resultados e={e} set={set} calc={calc} regime={regime} setRegime={setRegime} interp={interp} setInterp={setInterp} abrirMemoria={setMemoria} />;
      default: return <Entenda dados={dados} />;
    }
  })();
  const painel = (() => {
    switch (etapa) {
      case 2: return <PainelPerfil e={e} dados={dados} jurosBrasil={jurosBrasil} />;
      case 3: return <PainelConta calc={calc} />;
      case 4: return <PainelCarteira e={e} dados={dados} problemas={problemas} hoje={hoje} />;
      case 5: return <PainelCenario e={e} dados={dados} />;
      case 6: return <PainelResultados e={e} calc={calc} regime={regime} interp={interp} abrirMemoria={setMemoria} />;
      case 7: return <PainelEntenda dados={dados} />;
      default: return null;
    }
  })();

  const revisado = String((dados.brutos.brasil as { revisado_em?: string }).revisado_em ?? '');
  return (
    <div className={`app${etapa === 1 ? ' is-welcome' : ''}`}>
      <header className="topbar">
        <div className="brand"><span className="produto">Simulador Sacre de Eficiência <em>Brasil–EUA</em></span></div>
        <div className="etapa-atual" aria-live="polite">Etapa <b>{etapa} de 7</b> · {ETAPAS[etapa - 1][0]}</div>
        <div className="top-actions">
          <button className="btn--top" type="button" onClick={() => setRecomecar(true)}>Recomeçar</button>
        </div>
      </header>

      <div className="aviso-tela" role="note"><Icone n="info" />Melhor experiência no computador. Aqui tudo funciona, em formato empilhado.</div>

      <nav className="nav nao-imprimir" aria-label="Etapas da simulação">
        <div className="nav-head">
          <span className="eyebrow">Sua simulação</span>
          <div className="progress" aria-hidden="true"><div className="progress-bar" style={{ width: `${(etapa / 7) * 100}%` }} /></div>
          <span className="progress-txt">Etapa {etapa} de 7</span>
        </div>
        <ol className="steps">
          {ETAPAS.map(([t, s], i) => {
            const n = i + 1;
            return (
              <li key={n}>
                <button className={`step${n === etapa ? ' is-current' : n < etapa ? ' is-done' : ''}`} type="button" disabled={!e.liberado && n > 1} aria-current={n === etapa ? 'step' : undefined} onClick={() => irPara(n)}>
                  <span className="step-n">{String(n).padStart(2, '0')}</span>
                  <span className="step-t"><b>{t}</b><small>{s}</small></span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="nav-foot">
          <div className="dado"><span className="dot" /><span>Parâmetros tributários revisados em <b>{isoParaBR(revisado)}</b></span></div>
          <div className="dado"><span className="dot" /><span>Dados de mercado: BCB (SGS e Focus), coleta de <b>{isoParaBR(dados.mercado.hoje)}</b></span></div>
        </div>
      </nav>

      <main className="main" id="main" ref={main} tabIndex={-1}>
        <Protecao chave={`${etapa}-${calc.fase}`}>{conteudo}</Protecao>
        {etapa > 1 && (
          <div className="nav-telas nao-imprimir">
            <button className="btn btn--ghost" type="button" onClick={() => irPara(etapa - 1)}>Voltar</button>
            {etapa < 7 && <button className="btn btn--primary" type="button" onClick={() => irPara(etapa + 1)}>{etapa === 5 ? 'Ver resultados' : 'Continuar'} <Icone n="seta" /></button>}
          </div>
        )}
      </main>

      {etapa > 1 && <aside className="resumo" aria-label="Resumo da simulação"><Protecao chave={`${etapa}-${calc.fase}`}>{painel}</Protecao></aside>}

      <footer className="rodape nao-imprimir">
        <span>{AVISO_CURTO}</span>
        <button className="link" type="button" onClick={() => setAviso(true)}>Leia o aviso completo</button>
      </footer>

      <Dialogo aberto={aviso} fechar={() => setAviso(false)} eyebrow="Aviso obrigatório" titulo="Aviso completo">
        <p style={{ lineHeight: 1.6 }}><b>Aviso importante.</b> {AVISO_COMPLETO}</p>
      </Dialogo>
      <Dialogo aberto={recomecar} fechar={() => setRecomecar(false)} titulo="Recomeçar a simulação?" largura="min(28rem,calc(100vw - 2rem))">
        <p>Tudo o que você digitou será apagado desta página.</p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
          <button className="btn btn--ghost" type="button" onClick={() => setRecomecar(false)}>Cancelar</button>
          <button className="btn btn--primary" type="button" onClick={() => { set(estadoInicial(dados.mercado)); setRecomecar(false); irPara(1); }}>Recomeçar</button>
        </div>
      </Dialogo>
      <DialogoMemoria memoria={memoria} fechar={() => setMemoria(null)} />
    </div>
  );
}

// Etapas 1 a 5 (entrada de dados) e os painéis-resumo correspondentes.
import type { Dispatch, SetStateAction } from 'react';
import { impostoPorFaixas, rendaParaAliquotaMedia, aliquotaMarginal } from '../motores/motor-eua-federal';
import { Resolvedor } from '../motores/parametros';
import { Callout, CampoValor, Icone, Selo } from './comuns';
import type { Dados } from './dados';
import { IDX, LIQUIDEZ, PAGAMENTOS, PRODUTOS, carteiraExemplo, novaLinha, trajetoriaInicial, type EstadoUI, type LinhaInv, type ProblemaUI, type TipoBR } from './estado';
import { fmt0, fmtAte1, fmt2, isoParaBR, lerData, lerNumero, mascaraData, milhar } from './formato';
import { ESTADOS_MODO_A } from './arquivos-parametros';
import { GraficoLinha } from './graficos';
import { ALERTA_MODO_B, ALERTA_MODO_B_TITULO, AVISO_COMPLETO, ESTADOS, FAIXAS_RENDA, FULL_TEXTO, LIGHT_TEXTO } from './textos';

export type SetEstado = Dispatch<SetStateAction<EstadoUI>>;
const MODO_A = ESTADOS_MODO_A;
const nomeEstado = (uf: string) => ESTADOS.find((e) => e[0] === uf)?.[1] ?? uf;
const temErro = (problemas: ProblemaUI[], campo: string) => problemas.some((p) => p.campo === campo);

/* ======================= 1. BOAS-VINDAS ======================= */
export function Boasvindas({ entrar }: { entrar: () => void }) {
  return (
    <section className="tela tela--welcome" aria-labelledby="t1">
      <div className="welcome-grid">
        <div className="welcome-main">
          <span className="eyebrow">Simulador · Brasil–EUA</span>
          <h1 id="t1" tabIndex={-1}>Quanto do IR retido no Brasil vira crédito nos EUA?</h1>
          <p className="lead">Para brasileiros que moram nos EUA, são residentes fiscais lá e investem no Brasil por uma conta de não residente (CNR) Light ou Full.</p>
          <ol className="tres">
            <li><span>1</span><p><b>IR no Brasil.</b> Quanto é retido em cada aplicação, conforme o tipo de conta.</p></li>
            <li><span>2</span><p><b>Crédito nos EUA.</b> Quando os EUA tributam essa renda e quanto do IR brasileiro vira Foreign Tax Credit, com o teto anual e o saldo.</p></li>
            <li><span>3</span><p><b>Cenários.</b> Estratégias de resgate comparadas e o risco de o crédito se perder.</p></li>
          </ol>
          <div className="pills">
            {['Sem login', 'Sem cadastro', 'Sem cookies', 'Nada é salvo'].map((t) => (
              <span key={t}><Icone n="check" />{t}</span>
            ))}
          </div>
          <div className="cta">
            <button className="btn btn--primary btn--lg" type="button" onClick={entrar}>Entendi, quero simular <Icone n="seta" /></button>
            <span className="ajuda">Leva cerca de 5 minutos.<br />A carteira de exemplo já vem preenchida para você explorar.</span>
          </div>
        </div>
        <div className="welcome-side">
          <div className="aviso-card">
            <span className="pill-out">Aviso obrigatório</span>
            <p><b>Aviso importante.</b> {AVISO_COMPLETO}</p>
          </div>
          <div className="priv-card">
            <h4>Privacidade</h4>
            <ul>
              <li><Icone n="cadeado" /><span>Não pedimos nome, e-mail, CPF, SSN nem outro dado que identifique você.</span></li>
              <li><Icone n="cadeado" /><span>Nada é enviado a servidor. Sem cookies e sem armazenamento no navegador.</span></li>
              <li><Icone n="cadeado" /><span>A simulação vive só nesta página. Ao fechar, ela se apaga.</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ======================= 2. ONDE VOCÊ MORA ======================= */
export function Residencia({ e, set, problemas, dados }: { e: EstadoUI; set: SetEstado; problemas: ProblemaUI[]; dados: Dados }) {
  const pf = e.perfil;
  const ano = dados.params.eua.ano;
  const r = new Resolvedor();
  const ded = (f: 'single' | 'mfj' | 'hoh') => fmt0(r.valor(dados.params.eua.deducao_padrao[f], 'deducao'));
  const up = (p: Partial<EstadoUI['perfil']>) => set((s) => ({ ...s, perfil: { ...s.perfil, ...p } }));
  const modoA = MODO_A.includes(pf.estado);
  const opt = ([uf, nome]: [string, string]) => <option key={uf} value={uf}>{nome}</option>;
  return (
    <section className="tela" aria-labelledby="t2">
      <header className="tela-head">
        <span className="eyebrow">Etapa 2 · Perfil nos EUA</span>
        <h2 id="t2" tabIndex={-1}>Onde você mora nos EUA</h2>
        <p>O imposto federal é calculado para todos os estados. O estadual entra, exato, nos estados sem imposto sobre juros e dividendos.</p>
      </header>
      <div className="stack">
        <Callout tipo="branco" icone="info" titulo="Premissa: você é residente fiscal nos EUA">
          <p>Green card ou teste de presença substancial. <button className="link" type="button" onClick={() => set((s) => ({ ...s, naoResidente: !s.naoResidente }))}>Não sou residente fiscal nos EUA</button></p>
          {e.naoResidente && <p><b>Este simulador não se aplica ao seu caso.</b> As regras usadas aqui valem para quem é tributado nos EUA sobre a renda mundial. Converse com seu assessor.</p>}
        </Callout>

        <div className="card">
          <div className="grid-2">
            <div className="field">
              <label htmlFor="selEstado">Estado de residência</label>
              <select className="input" id="selEstado" value={pf.estado} onChange={(x) => up({ estado: x.target.value })}>
                <optgroup label="Estados incluídos: sem imposto estadual sobre juros e dividendos">{ESTADOS.filter((s) => MODO_A.includes(s[0])).map(opt)}</optgroup>
                <optgroup label="Demais estados: federal, com alerta">{ESTADOS.filter((s) => !MODO_A.includes(s[0])).map(opt)}</optgroup>
              </select>
              <div>
                {modoA ? (
                  <Selo tipo="estado"><Icone n="check" /> Estado incluído: sem imposto estadual sobre estes rendimentos</Selo>
                ) : pf.aliqEst.trim() ? (
                  <Selo tipo="estado"><Icone n="alerta" /> Estadual estimado pelo usuário: {pf.aliqEst}%</Selo>
                ) : (
                  <Selo tipo="estado"><Icone n="alerta" /> Imposto estadual não incluído</Selo>
                )}
                {pf.estado === 'WA' && <p className="ajuda" style={{ marginTop: '.4rem' }}>Washington tem imposto estadual sobre ganho de capital de longo prazo de pessoa física. Na renda fixa levada pela curva, estadual = 0.</p>}
              </div>
            </div>
            <div className="field">
              <span className="lbl">Como funciona o estadual</span>
              <p className="ajuda">Nos 9 estados marcados como “estado incluído”, o imposto estadual sobre a renda fixa brasileira é zero (confirmado nos sites oficiais). Nos demais, o resultado é federal, com alerta e alíquota estadual opcional.</p>
            </div>
          </div>
          {!modoA && (
            <div className="stack" style={{ marginTop: '1rem' }}>
              <Callout titulo={ALERTA_MODO_B_TITULO}><p>{ALERTA_MODO_B}</p></Callout>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="aliqEst">Alíquota estadual estimada sobre estes rendimentos (%) <span className="ajuda">opcional</span></label>
                  <CampoValor id="aliqEst" sufixo="%" valor={pf.aliqEst} onChange={(v) => up({ aliqEst: v })} placeholder="vazio = só federal" invalido={temErro(problemas, 'aliqEst')} />
                  <p className="ajuda">Consulte o site do departamento de receita do seu estado ou o seu contador. O simulador não sugere valores por estado.</p>
                </div>
                <div className="field">
                  <span className="lbl">Premissas, se você preencher</span>
                  <ul className="ajuda" style={{ paddingLeft: '1.1rem' }}>
                    <li>Conservadora: sem crédito estadual pelo IR brasileiro.</li>
                    <li>A dedução federal do imposto estadual (SALT) não é considerada.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <fieldset className="field">
            <legend>Situação de declaração (filing status)</legend>
            <div className="opcoes opcoes--2" style={{ marginTop: '.4rem' }}>
              {(
                [
                  ['single', 'SINGLE', 'Solteiro(a)', 'Declara sozinho, sem dependente que dê direito a chefe de família.'],
                  ['mfj', 'MARRIED FILING JOINTLY', 'Casado(a), declaração conjunta', 'O casal soma as rendas em uma só declaração.'],
                  ['mfs', 'MARRIED FILING SEPARATELY', 'Casado(a), declarações separadas', 'Cada cônjuge declara a própria renda.'],
                  ['hoh', 'HEAD OF HOUSEHOLD', 'Chefe de família', 'Solteiro(a) que mantém a casa para um dependente qualificado.'],
                ] as const
              ).map(([v, en, t, d]) => (
                <label className="opcao" key={v}>
                  <input type="radio" name="fs" value={v} checked={pf.filing === v} onChange={() => up({ filing: v })} />
                  <span className="marca" />
                  <span className="tag-en">{en}</span>
                  <b>{t}</b>
                  <small>{d}</small>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="card">
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <label htmlFor="renda" className="lbl">Renda tributável federal estimada, <u>sem</u> os investimentos do Brasil</label>
              <div className="seg" role="group" aria-label="Forma de informar a renda">
                <button type="button" aria-pressed={pf.rendaModo === 'exata'} onClick={() => up({ rendaModo: 'exata' })}>Valor exato</button>
                <button type="button" aria-pressed={pf.rendaModo === 'faixa'} onClick={() => up({ rendaModo: 'faixa' })}>Faixa</button>
              </div>
            </div>
            <div className="grid-2" style={{ marginTop: '.35rem' }}>
              {pf.rendaModo === 'exata' ? (
                <CampoValor id="renda" prefixo="US$" valor={pf.renda} onChange={(v) => up({ renda: v })} onBlur={() => up({ renda: milhar(pf.renda) })} inputMode="numeric" invalido={temErro(problemas, 'renda')} />
              ) : (
                <select className="input" aria-label="Faixa de renda tributável" value={pf.faixa} onChange={(x) => up({ faixa: Number(x.target.value) })}>
                  {FAIXAS_RENDA.map(([t], i) => <option key={t} value={i}>{t}</option>)}
                </select>
              )}
              <div style={{ display: 'flex', alignItems: 'center' }}><Selo tipo="fato">Fato · informado por você</Selo></div>
            </div>
            <p className="ajuda" style={{ marginTop: '.3rem' }}>
              <b>Renda tributável</b> é a renda bruta menos as deduções. Quem não itemiza usa a dedução padrão: em {ano}, US$ {ded('single')} (solteiro ou casado em separado), US$ {ded('hoh')} (chefe de família) e US$ {ded('mfj')} (casal, declaração conjunta). Acima de US$ 650 mil, use o valor exato.
            </p>
          </div>
        </div>

        <details className="avancado">
          <summary><Icone n="ajuste" />Avançado: outros dados da sua declaração nos EUA <small>opcional · não são dados dos investimentos no Brasil</small></summary>
          <div className="avancado-corpo">
            <Callout tipo="verde" icone="info" titulo="Estes campos vêm da sua declaração americana">
              <p>Os investimentos no Brasil entram na etapa 4. Aqui ficam dados da sua vida fiscal nos EUA que mudam o teto do crédito e o NIIT. Se não souber, deixe em branco: o simulador usa a dedução padrão e considera zero nos demais. Seu contador tem esses números.</p>
            </Callout>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="itm">Deduções itemizadas (US$)</label>
                <CampoValor id="itm" prefixo="US$" valor={pf.itemizadas} onChange={(v) => up({ itemizadas: v })} placeholder="vazio = dedução padrão" />
                <p className="ajuda">Nos EUA, ou você usa a dedução padrão, ou soma as despesas que a lei permite abater: juros da hipoteca da casa, impostos estaduais e locais, doações (Schedule A). Se for o seu caso, informe o total.</p>
              </div>
              <div className="field">
                <label htmlFor="ltcg">Ganhos de capital e dividendos qualificados nos EUA (US$ por ano)</label>
                <CampoValor id="ltcg" prefixo="US$" valor={pf.ganhosQualif} onChange={(v) => up({ ganhosQualif: v })} placeholder="0" />
                <p className="ajuda">Já incluídos na renda tributável acima. Têm alíquota menor (0%, 15% ou 20%) e entram também no NIIT.</p>
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="opr">Rendas de investimentos em outros países, fora o Brasil (US$ por ano)</label>
                <CampoValor id="opr" prefixo="US$" valor={pf.outrasRendas} onChange={(v) => up({ outrasRendas: v })} placeholder="0" />
                <p className="ajuda">Exemplo: juros de uma conta em Portugal. Entram na mesma categoria de crédito do Brasil.</p>
              </div>
              <div className="field">
                <label htmlFor="opi">Imposto pago nesses outros países (US$ por ano)</label>
                <CampoValor id="opi" prefixo="US$" valor={pf.outrosImpostos} onChange={(v) => up({ outrosImpostos: v })} placeholder="0" />
              </div>
            </div>
            <div className="field">
              <span className="lbl">Crédito de anos anteriores ainda não usado</span>
              <p className="ajuda">Imposto estrangeiro já declarado que passou do teto e ficou como saldo, de qualquer país, inclusive do Brasil. Está no Schedule B do Form 1116 da sua última declaração.</p>
              {pf.saldos.map((s, i) => (
                <div className="grid-3" key={i}>
                  <CampoValor prefixo="Ano" valor={s.ano} rotulo="Ano de origem do saldo" inputMode="numeric" onChange={(v) => up({ saldos: pf.saldos.map((x, j) => (j === i ? { ...x, ano: v } : x)) })} />
                  <CampoValor prefixo="US$" valor={s.valor} rotulo="Valor do saldo" onChange={(v) => up({ saldos: pf.saldos.map((x, j) => (j === i ? { ...x, valor: v } : x)) })} />
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => up({ saldos: pf.saldos.filter((_, j) => j !== i) })}>Remover</button>
                </div>
              ))}
              <div><button className="btn btn--ghost btn--sm" type="button" onClick={() => up({ saldos: [...pf.saldos, { ano: '2024', valor: '' }] })}>+ Adicionar saldo</button></div>
            </div>
            <div className="field">
              <label htmlFor="tl">Espaço livre no teto do ano anterior (US$)</label>
              <div className="grid-2">
                <CampoValor id="tl" prefixo="US$" valor={pf.tetoLivreAnterior} onChange={(v) => up({ tetoLivreAnterior: v })} placeholder="vazio = 0, conservador" />
                <p className="ajuda">Se sobrar crédito no primeiro ano simulado, ele pode voltar 1 ano e abater o imposto do ano anterior. Seu contador encontra esse espaço no Form 1116.</p>
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

export function PainelPerfil({ e, dados, jurosBrasil }: { e: EstadoUI; dados: Dados; jurosBrasil: number | null }) {
  const r = new Resolvedor();
  const pf = e.perfil;
  const faixas = r.valor(dados.params.eua.faixas[pf.filing], 'faixas');
  const padrao = r.valor(dados.params.eua.deducao_padrao[pf.filing], 'deducao');
  const limiar = r.valor(dados.params.eua.niit.limiar_magi[pf.filing], 'niit');
  const renda = pf.rendaModo === 'exata' ? lerNumero(pf.renda) : FAIXAS_RENDA[pf.faixa][1];
  const ok = renda > 0;
  const imposto = ok ? impostoPorFaixas(renda, faixas) : 0;
  const media = ok ? imposto / renda : 0;
  const ded = Math.max(padrao, lerNumero(pf.itemizadas) || 0);
  const magi = (ok ? renda : 0) + ded + (jurosBrasil ?? 0);
  const modoA = MODO_A.includes(pf.estado);
  return (
    <>
      <div className="r-titulo"><h3>Seu perfil federal</h3><span className="ao-vivo">ao vivo</span></div>
      <div className="bn"><div className="bn-label">Alíquota média federal</div><div className="bn-valor tnum">{ok ? `${fmtAte1(media * 100)}%` : '—'}</div><div className="bn-sub">{ok ? `US$ ${fmt0(imposto)} sobre US$ ${fmt0(renda)} (faixas de ${dados.params.eua.ano})` : 'Informe a renda tributável'}</div></div>
      <div className="bn"><div className="bn-label">Alíquota marginal</div><div className="bn-valor tnum">{ok ? `${fmt0(aliquotaMarginal(renda, faixas) * 100)}%` : '—'}</div><div className="bn-sub">A próxima renda entra nesta faixa</div></div>
      <div className="r-sec">
        <h4>O IR do Brasil cabe no teto do ano?</h4>
        <table className="r-tabela">
          <tbody>
            {(
              [
                [0.15, '15%', 'CDB na Full; Light acima de 720 dias'],
                [0.175, '17,5%', 'Light, 361 a 720 dias'],
                [0.2, '20%', 'Light, 181 a 360 dias'],
                [0.225, '22,5%', 'Light, até 180 dias'],
              ] as const
            ).map(([a, t, d]) => {
              const cabe = ok && renda >= rendaParaAliquotaMedia(a, faixas);
              return (
                <tr key={t}>
                  <td>{t} <span className="ajuda" style={{ color: 'var(--sobre-escuro-2)' }}>{d}</span></td>
                  <td className={cabe ? 'ok-txt' : ''}>{cabe ? 'tende a caber' : 'gera saldo'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="bn-sub" style={{ marginTop: '.4rem' }}>Comparação da alíquota média federal com a alíquota brasileira. A conta completa, com a renda do Brasil, sai nos resultados.</p>
      </div>
      <div className="r-sec">
        <h4>Estado</h4>
        <span className="selo selo--estado">{modoA ? <><Icone n="check" /> Estado incluído</> : <><Icone n="alerta" /> {pf.aliqEst.trim() ? 'Estadual estimado pelo usuário' : 'Imposto estadual não incluído'}</>} · {nomeEstado(pf.estado)}</span>
      </div>
      {ok && (
        <div className="r-alerta">
          <Icone n="info" />
          <span>
            <b>NIIT{magi > limiar ? ' incide' : magi > 0.9 * limiar ? ' perto do limite' : ' longe do limite'}.</b> Renda ajustada estimada{jurosBrasil !== null ? ', com os investimentos do Brasil,' : ''} perto de US$ {fmt0(magi / 1000)} mil. O limite é US$ {fmt0(limiar / 1000)} mil.
          </span>
        </div>
      )}
    </>
  );
}

/* ======================= 3. SUA CONTA ======================= */
export function Conta({ e, set }: { e: EstadoUI; set: SetEstado }) {
  return (
    <section className="tela" aria-labelledby="t3">
      <header className="tela-head">
        <span className="eyebrow">Etapa 3 · Conta CNR</span>
        <h2 id="t3" tabIndex={-1}>Sua conta no Brasil</h2>
        <p>O tipo de conta muda o IR cobrado no Brasil e, com ele, o tamanho do crédito. Nos EUA, a tributação é a mesma nas duas contas.</p>
      </header>
      <div className="opcoes opcoes--3">
        {(
          [
            ['light', 'CNR LIGHT', 'Regras do residente no Brasil', LIGHT_TEXTO],
            ['full', 'CNR FULL', 'Regime do investidor não residente', FULL_TEXTO],
            ['comparar', 'COMPARAR', 'Comparar Light e Full', 'Mostra o resultado nas duas contas. Útil se você não sabe qual é a sua.'],
          ] as const
        ).map(([v, en, t, d]) => (
          <label className="opcao" key={v}>
            <input type="radio" name="conta" checked={e.conta === v} onChange={() => set((s) => ({ ...s, conta: v }))} />
            <span className="marca" />
            <span className="tag-en">{en}</span>
            <b>{t}</b>
            <small>{d}</small>
          </label>
        ))}
      </div>
      <details className="ajuda" style={{ marginTop: '.9rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--verde)' }}>Não sei qual é a minha conta · base legal</summary>
        <p style={{ marginTop: '.4rem' }}>Pergunte ao seu assessor: “Minha conta de não residente é Light ou Full (regime do CMN)?”. Enquanto isso, escolha <b>Comparar Light e Full</b>.</p>
        <p style={{ marginTop: '.4rem' }}><b>Light:</b> Lei 8.981/1995, art. 78; Lei 11.033/2004, arts. 1º e 3º; Lei 12.431/2011, art. 2º. <b>Full:</b> Res. CMN 4.373/2014 e normas sucessoras; Lei 11.312/2006, art. 1º; Lei 12.431/2011, art. 1º; B3, Manual do Investidor Não Residente.</p>
      </details>
      <div className="bloco">
        <div className="bloco-t">O que muda no IR brasileiro</div>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Produto</th><th>IR no Brasil<small>CNR Light</small></th><th>IR no Brasil<small>CNR Full</small></th><th>Nos EUA</th></tr></thead>
            <tbody>
              <tr><td><b>Tesouro</b></td><td>Tabela regressiva, 22,5% a 15%</td><td>0%</td><td>Juros tributados; na Full, amplia o teto</td></tr>
              <tr><td><b>CDB</b></td><td>Tabela regressiva, 22,5% a 15%</td><td>15%</td><td>Juros tributados; IR vira crédito</td></tr>
              <tr><td><b>Debêntures comuns</b></td><td>Tabela regressiva, 22,5% a 15%</td><td>15%</td><td>Juros tributados; IR vira crédito</td></tr>
              <tr><td><b>Debêntures incentivadas</b><small>Lei 12.431/2011</small></td><td>Isento</td><td>0%</td><td>Juros tributados; amplia o teto</td></tr>
              <tr><td><b>LCI, LCA, CRI e CRA</b></td><td>Isento</td><td>0%</td><td>Juros tributados; amplia o teto</td></tr>
            </tbody>
          </table>
        </div>
        <p className="nota">IOF regressivo em resgates com menos de 30 dias (zero para LCA, CRA, CRI e debêntures). O IOF não gera crédito nos EUA. Previdência privada, ações, FIIs e imóveis ficam para a Fase 2. Conta em nome de empresa ou de residente em paraíso fiscal: o simulador não se aplica.</p>
      </div>
    </section>
  );
}

/* ======================= 4. INVESTIMENTOS ======================= */
const tratamento = (tipo: TipoBR, c: 'light' | 'full') => (c === 'light' ? (tipo === 'isento' ? 'isento' : 'regressiva') : tipo === 'cdb' || tipo === 'deb' ? 'quinze' : 'zero');
const regressivaPct = (dias: number) => (dias <= 180 ? 22.5 : dias <= 360 ? 20 : dias <= 720 ? 17.5 : 15);
const diasEntre = (a: string | null, b: string | null) => (a && b && b > a ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : null);

function etiquetas(l: LinhaInv, conta: EstadoUI['conta'], hoje: string) {
  const P = PRODUTOS[l.p];
  const c = lerData(l.c);
  const v = lerData(l.ven);
  const dias = diasEntre(c, v);
  const cupom = (PAGAMENTOS[l.pag] ?? 0) > 0;
  const contas: ('light' | 'full')[] = conta === 'comparar' ? ['light', 'full'] : [conta];
  const out: { t: string; cls: 'tag' | 'pend' | 'aprox' | 'falta' }[] = [];
  for (const k of contas) {
    const tr = tratamento(P.tipo, k);
    const nm = k === 'light' ? 'Light' : 'Full';
    if (tr === 'regressiva') {
      if (dias === null) out.push({ t: `${nm}: tabela regressiva, 22,5% a 15%`, cls: 'tag' });
      else if (dias > 720) out.push({ t: `${nm}: 15% (acima de 720 dias)`, cls: 'tag' });
      else out.push({ t: `${nm}: ${fmtAte1(regressivaPct(dias))}% no vencimento (${dias} dias)`, cls: 'tag' });
      if (cupom) out.push({ t: 'IR do cupom: pendente', cls: 'pend' });
    } else out.push({ t: `${nm}: ${tr === 'quinze' ? '15%' : tr === 'zero' ? '0%' : 'isento'}`, cls: 'tag' });
  }
  if (dias !== null) {
    const em = lerData(l.em) ?? c;
    const prazoEmissao = diasEntre(em, v);
    if (prazoEmissao !== null && prazoEmissao <= 366) out.push({ t: 'EUA: renda no resgate (emissão até 1 ano)', cls: 'tag' });
    else if (cupom) out.push({ t: 'EUA: juros todo ano; cupons no ano do pagamento', cls: 'tag' });
    else out.push({ t: 'EUA: juros (OID) todo ano', cls: 'tag' });
    if (!l.em.trim()) out.push({ t: 'Emissão = compra', cls: 'aprox' });
    if (c && c < `${hoje.slice(0, 4)}-01-01`) out.push({ t: `Comprada antes de ${hoje.slice(0, 4)}`, cls: 'falta' });
  } else out.push({ t: 'Falta data', cls: 'falta' });
  if (l.idx !== 'pre') out.push({ t: l.idx === 'ipca' ? 'IPCA+: aproximação' : 'Taxa variável: aproximação', cls: 'aprox' });
  return out;
}

function anosPlano(l: LinhaInv, hoje: string) {
  const v = lerData(l.ven);
  const ate = v ? Math.min(Number(v.slice(0, 4)), Number(hoje.slice(0, 4)) + 15) : Number(hoje.slice(0, 4)) + 5;
  const anos: number[] = [];
  for (let a = Number(hoje.slice(0, 4)); a <= ate; a++) anos.push(a);
  return anos;
}

function CartaoInvestimento({ l, i, e, set, problemas, hoje }: { l: LinhaInv; i: number; e: EstadoUI; set: SetEstado; problemas: ProblemaUI[]; hoje: string }) {
  const P = PRODUTOS[l.p];
  const I = IDX[l.idx];
  const n = String(i + 1).padStart(2, '0');
  const up = (p: Partial<LinhaInv>) => set((s) => ({ ...s, exemplo: false, carteira: s.carteira.map((x) => (x.uid === l.uid ? { ...x, ...p } : x)) }));
  const err = (c: string) => temErro(problemas, `inv${l.uid}.${c}`);
  const trocaProduto = (p: string) => {
    const NP = PRODUTOS[p];
    const idx = NP.idx.includes(l.idx) ? l.idx : NP.idx[0];
    up({ p, idx, taxa: idx === l.idx ? l.taxa : '', pag: NP.pag ?? l.pag, liq: NP.tipo === 'tesouro' ? 'Diária' : l.liq });
  };
  return (
    <article className="inv" aria-label={`Aplicação ${n}`}>
      <div className="inv-cab">
        <span className="n">Aplicação {n}</span>
        <button className="x" type="button" aria-label={`Remover aplicação ${n}`} onClick={() => set((s) => ({ ...s, exemplo: false, carteira: s.carteira.filter((x) => x.uid !== l.uid) }))}>✕</button>
      </div>
      <div className="inv-l1">
        <div className="field"><label htmlFor={`p${l.uid}`}>Produto</label>
          <select className="input" id={`p${l.uid}`} value={l.p} onChange={(x) => trocaProduto(x.target.value)}>
            {Object.keys(PRODUTOS).map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor={`v${l.uid}`}>Valor aplicado</label>
          <CampoValor id={`v${l.uid}`} prefixo="R$" valor={l.v} inputMode="numeric" placeholder="0" invalido={err('v')} onChange={(v) => up({ v })} onBlur={() => up({ v: milhar(l.v) })} />
        </div>
        <div className="field"><label htmlFor={`c${l.uid}`}>Compra</label>
          <input className="input tnum" id={`c${l.uid}`} value={l.c} placeholder="dd/mm/aaaa" inputMode="numeric" aria-invalid={err('c') || undefined} onChange={(x) => up({ c: mascaraData(x.target.value) })} />
        </div>
        <div className="field"><label htmlFor={`ve${l.uid}`}>Vencimento</label>
          <input className="input tnum" id={`ve${l.uid}`} value={l.ven} placeholder="dd/mm/aaaa" inputMode="numeric" aria-invalid={err('ven') || undefined} onChange={(x) => up({ ven: mascaraData(x.target.value) })} />
        </div>
      </div>
      <div className="inv-l2">
        <div className="field"><label htmlFor={`tx${l.uid}`}>Remuneração</label>
          <div className="rem">
            {P.idx.length > 1 && (
              <select className="input" aria-label={`Indexador da aplicação ${n}`} value={l.idx} onChange={(x) => up({ idx: x.target.value as LinhaInv['idx'], taxa: '' })}>
                {P.idx.map((k) => <option key={k} value={k}>{IDX[k].nome}</option>)}
              </select>
            )}
            <CampoValor id={`tx${l.uid}`} prefixo={P.idx.length > 1 ? undefined : I.pre || undefined} sufixo={I.suf} valor={l.taxa} placeholder={I.ph} invalido={err('taxa')} onChange={(taxa) => up({ taxa })} />
          </div>
        </div>
        <div className="field"><label htmlFor={`pg${l.uid}`}>Pagamento</label>
          <select className="input" id={`pg${l.uid}`} value={l.pag} disabled={!!P.pag} title={P.pag ? 'Definido pelo título' : undefined} onChange={(x) => up({ pag: x.target.value })}>
            {Object.keys(PAGAMENTOS).map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor={`l${l.uid}`}>Liquidez</label>
          <select className="input" id={`l${l.uid}`} value={l.liq} onChange={(x) => up({ liq: x.target.value })}>
            {LIQUIDEZ.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="inv-l3">
        <div className="field"><label htmlFor={`pl${l.uid}`}>Plano de resgate</label>
          <select className="input" id={`pl${l.uid}`} value={l.plano} aria-invalid={err('plano') || undefined} onChange={(x) => up({ plano: x.target.value, parciais: x.target.value === 'parcial' && !l.parciais.length ? [{ ano: hoje.slice(0, 4), pct: '50' }, { ano: String(Number(hoje.slice(0, 4)) + 1), pct: '50' }] : l.parciais })}>
            <option value="vencimento">Manter até o vencimento</option>
            {anosPlano(l, hoje).map((a) => <option key={a} value={`total:${a}`}>Resgate total em {a}</option>)}
            <option value="parcial">Resgates parciais (definir anos)</option>
            <option value="sugerir">Deixar o simulador sugerir</option>
          </select>
        </div>
        <button className="link" type="button" onClick={() => up({ avancado: !l.avancado })}>{l.avancado ? 'Fechar avançado' : 'Avançado: data de emissão, carência'}</button>
      </div>
      {l.plano === 'parcial' && (
        <div>
          <p className="ajuda" style={{ marginTop: '.6rem' }}>Ano e percentual da aplicação original resgatado em cada ano (1º de julho).</p>
          {l.parciais.map((x, j) => (
            <div className="parciais" key={j}>
              <CampoValor prefixo="Ano" valor={x.ano} inputMode="numeric" rotulo="Ano do resgate" onChange={(v) => up({ parciais: l.parciais.map((y, k) => (k === j ? { ...y, ano: v } : y)) })} />
              <CampoValor sufixo="%" valor={x.pct} rotulo="Percentual resgatado" onChange={(v) => up({ parciais: l.parciais.map((y, k) => (k === j ? { ...y, pct: v } : y)) })} />
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => up({ parciais: l.parciais.filter((_, k) => k !== j) })}>Remover</button>
            </div>
          ))}
          <button className="link" type="button" style={{ fontSize: '.85rem', marginTop: '.4rem' }} onClick={() => up({ parciais: [...l.parciais, { ano: '', pct: '' }] })}>+ Outro ano</button>
        </div>
      )}
      {(l.avancado || l.liq === 'Com carência') && (
        <div className="grid-2" style={{ marginTop: '.7rem' }}>
          <div className="field"><label htmlFor={`em${l.uid}`}>Data de emissão <span className="ajuda">opcional</span></label>
            <input className="input tnum" id={`em${l.uid}`} value={l.em} placeholder="dd/mm/aaaa (vazio = compra)" aria-invalid={err('em') || undefined} onChange={(x) => up({ em: mascaraData(x.target.value) })} />
          </div>
          {l.liq === 'Com carência' && (
            <div className="field"><label htmlFor={`car${l.uid}`}>Fim da carência</label>
              <input className="input tnum" id={`car${l.uid}`} value={l.carencia} placeholder="dd/mm/aaaa" aria-invalid={err('carencia') || undefined} onChange={(x) => up({ carencia: mascaraData(x.target.value) })} />
            </div>
          )}
        </div>
      )}
      <div className="inv-tags">
        {etiquetas(l, e.conta, hoje).map((t) => (
          <span key={t.t} className={t.cls === 'tag' ? 'tag' : `selo selo--${t.cls}`}>{t.t}</span>
        ))}
      </div>
    </article>
  );
}

export function Investimentos({ e, set, problemas, hoje }: { e: EstadoUI; set: SetEstado; problemas: ProblemaUI[]; hoje: string }) {
  return (
    <section className="tela" aria-labelledby="t4">
      <header className="tela-head">
        <span className="eyebrow">Etapa 4 · Carteira no Brasil</span>
        <h2 id="t4" tabIndex={-1}>Seus investimentos</h2>
        <p>Uma linha por aplicação. Os dados estão no extrato do BTG. Nesta versão: renda fixa.</p>
      </header>
      <div className="inv-acoes" style={{ marginBottom: '1rem' }}>
        <button className="btn btn--primary btn--sm" type="button" onClick={() => set((s) => ({ ...s, exemplo: false, carteira: [...s.carteira, novaLinha()] }))}>+ Adicionar aplicação</button>
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => set((s) => ({ ...s, exemplo: true, carteira: carteiraExemplo() }))}>Usar carteira de exemplo</button>
        {e.exemplo && <span className="selo selo--ex">Exemplo carregado</span>}
      </div>
      <div className="stack">
        {e.carteira.length ? e.carteira.map((l, i) => <CartaoInvestimento key={l.uid} l={l} i={i} e={e} set={set} problemas={problemas} hoje={hoje} />) : <div className="vazio">Nenhuma aplicação. Use <b>+ Adicionar aplicação</b> ou a carteira de exemplo.</div>}
        <p className="nota">Fase 2: previdência privada, ações, FIIs e imóveis.</p>
      </div>
    </section>
  );
}

export function PainelCarteira({ e, dados, problemas, hoje }: { e: EstadoUI; dados: Dados; problemas: ProblemaUI[]; hoje: string }) {
  const total = e.carteira.reduce((s, l) => s + (lerNumero(l.v) || 0), 0);
  const contas: ('light' | 'full')[] = e.conta === 'comparar' ? ['light', 'full'] : [e.conta];
  const ROT = { regressiva: 'Com IR pela tabela regressiva', quinze: 'Com IR de 15%', zero: '0% no Brasil', isento: 'Isento no Brasil' };
  const antigas = e.carteira.filter((l) => {
    const c = lerData(l.c);
    return c && c < `${hoje.slice(0, 4)}-01-01`;
  }).length;
  const apl = (k: number) => `${k} ${k > 1 ? 'aplicações' : 'aplicação'}`;
  const probs = problemas.filter((p) => p.campo.startsWith('inv') || p.campo === 'carteira');
  return (
    <>
      <div className="r-titulo"><h3>Sua carteira</h3><span className="ao-vivo">ao vivo</span></div>
      <div className="bn">
        <div className="bn-label">Total aplicado</div>
        <div className="bn-valor tnum">{total >= 1e6 ? <>R$ {fmt2(total / 1e6)}<small>mi</small></> : total >= 1e3 ? <>R$ {fmtAte1(total / 1e3)}<small>mil</small></> : `R$ ${fmt0(total)}`}</div>
        <div className="bn-sub">{total ? `≈ US$ ${fmtAte1(total / dados.mercado.cambio_hoje / 1e3)} mil pelo dólar de ${isoParaBR(dados.mercado.hoje)} (R$ ${fmt2(dados.mercado.cambio_hoje)}) · ${apl(e.carteira.length)}` : 'Informe o valor de cada aplicação'}</div>
      </div>
      <div className="r-sec">
        <h4>Como cada parte é tributada no Brasil</h4>
        <table className="r-tabela">
          <tbody>
            {contas.flatMap((c) => {
              const soma: Record<string, number> = {};
              e.carteira.forEach((l) => {
                const t = tratamento(PRODUTOS[l.p].tipo, c);
                soma[t] = (soma[t] ?? 0) + (lerNumero(l.v) || 0);
              });
              const linhas = Object.entries(soma).map(([t, v]) => (
                <tr key={c + t}><td>{ROT[t as keyof typeof ROT]}</td><td className="ok-txt">R$ {fmtAte1(v / 1e3)} mil</td></tr>
              ));
              return contas.length > 1 ? [<tr key={c}><td colSpan={2} style={{ color: 'var(--bege)', fontWeight: 700, fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>CNR {c === 'light' ? 'Light' : 'Full'}</td></tr>, ...linhas] : linhas;
            })}
          </tbody>
        </table>
      </div>
      <div className="r-sec">
        <h4>Alertas</h4>
        {probs.slice(0, 6).map((p) => <div className="r-alerta" key={p.campo + p.texto}><Icone n="alerta" /><span><b>Dado faltando:</b> {p.texto}</span></div>)}
        {antigas > 0 && <div className="r-alerta"><span className="risco risco--medio">◆ Médio</span><span><b>Comprada antes de {hoje.slice(0, 4)}</b> em {apl(antigas)}: a simulação considera de {hoje.slice(0, 4)} em diante. Confirme com seu contador se os juros dos anos anteriores foram declarados nos EUA e se os impostos foram pagos.</span></div>}
        {e.carteira.some((l) => PRODUTOS[l.p].tipo === 'isento') && <div className="r-alerta"><Icone n="info" /><span><b>Isentos no Brasil</b> são tributados nos EUA e ampliam o teto do crédito.</span></div>}
      </div>
    </>
  );
}

/* ======================= 5. CENÁRIO ======================= */
export function Cenario({ e, set, dados, problemas }: { e: EstadoUI; set: SetEstado; dados: Dados; problemas: ProblemaUI[] }) {
  const c = e.cenario;
  const up = (p: Partial<EstadoUI['cenario']>) => set((s) => ({ ...s, cenario: { ...s.cenario, ...p } }));
  const editavel = c.tipo === 'personalizado';
  const anoFocusMax = Math.max(...(dados.mercado.focus?.anos.map((a) => a.ano) ?? [0]));
  const mudaHorizonte = (h: number) => {
    const base = trajetoriaInicial(dados.mercado, h);
    up({ horizonte: h, trajetoria: base.map((b) => c.trajetoria.find((t) => t.ano === b.ano) ?? b) });
  };
  const muda = (ano: number, campo: 'selic' | 'ipca' | 'cambio', v: string) => up({ trajetoria: c.trajetoria.map((t) => (t.ano === ano ? { ...t, [campo]: v } : t)) });
  return (
    <section className="tela" aria-labelledby="t5">
      <header className="tela-head">
        <span className="eyebrow">Etapa 5 · Premissas</span>
        <h2 id="t5" tabIndex={-1}>Cenário</h2>
        <p>CDI, IPCA e câmbio futuros são premissas, não fatos. Use o Focus ou digite a sua trajetória.</p>
      </header>
      <div className="opcoes opcoes--2">
        <label className="opcao"><input type="radio" name="cen" checked={c.tipo === 'focus'} onChange={() => up({ tipo: 'focus', trajetoria: trajetoriaInicial(dados.mercado, c.horizonte) })} /><span className="marca" /><span className="tag-en">PADRÃO</span><b>Mercado (Boletim Focus)</b><small>Mediana das projeções do Focus, Banco Central, coleta de {dados.mercado.focus ? isoParaBR(dados.mercado.focus.data_coleta) : '—'}.</small></label>
        <label className="opcao"><input type="radio" name="cen" checked={c.tipo === 'personalizado'} onChange={() => up({ tipo: 'personalizado' })} /><span className="marca" /><span className="tag-en">LIVRE</span><b>Personalizado</b><small>Você digita a trajetória ano a ano: Selic, IPCA e câmbio.</small></label>
      </div>
      <div className="bloco">
        <div className="bloco-t">Trajetória anual <Selo tipo="prem">Premissa de mercado</Selo></div>
        <div className="tabela-wrap">
          <table className="tabela traj">
            <thead><tr><th>Indicador</th>{c.trajetoria.map((t) => <th key={t.ano} className="r">{t.ano}{t.ano > anoFocusMax ? '*' : ''}</th>)}</tr></thead>
            <tbody>
              {(
                [
                  ['selic', 'Selic, fim do ano (%)'],
                  ['ipca', 'IPCA, no ano (%)'],
                  ['cambio', 'Câmbio, fim do ano (R$/US$)'],
                ] as const
              ).map(([k, nome]) => (
                <tr key={k}>
                  <td><b>{nome}</b></td>
                  {c.trajetoria.map((t) => (
                    <td key={t.ano} className={t.ano > anoFocusMax ? 'ext' : ''}>
                      <input value={t[k]} readOnly={!editavel} aria-label={`${nome} ${t.ano}`} onChange={(x) => muda(t.ano, k, x.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {temErro(problemas, 'trajetoria') && <p className="erro-campo">Preencha Selic, IPCA e câmbio de todos os anos.</p>}
        <p className="nota">Fonte: Banco Central do Brasil, Focus de {dados.mercado.focus ? isoParaBR(dados.mercado.focus.data_coleta) : '—'} (mediana) e SGS. CDI = Selic menos {fmt2(dados.mercado.spread_cdi_selic)} p.p. (diferença média de 12 meses). * Depois do último ano do Focus, mantém o último valor projetado.</p>
      </div>
      <div className="bloco grid-2">
        <div className="card field">
          <label htmlFor="horiz" className="lbl">Horizonte da simulação</label>
          <div className="range-row">
            <input type="range" id="horiz" min={1} max={15} value={c.horizonte} onChange={(x) => mudaHorizonte(Number(x.target.value))} />
            <span className="range-val">{c.horizonte} {c.horizonte === 1 ? 'ano' : 'anos'} ({c.trajetoria[0]?.ano}–{c.trajetoria[c.trajetoria.length - 1]?.ano})</span>
          </div>
          <p className="ajuda">De 1 a 15 anos. No fim do horizonte, as aplicações são resgatadas para comparar as estratégias em pé de igualdade.</p>
        </div>
        <div className="card field">
          <span className="lbl">Moeda do resultado</span>
          <div className="seg" role="group" aria-label="Moeda do resultado" style={{ alignSelf: 'flex-start', marginTop: '.3rem' }}>
            {(['USD', 'BRL'] as const).map((m) => <button key={m} type="button" aria-pressed={e.moeda === m} onClick={() => set((s) => ({ ...s, moeda: m }))}>{m}</button>)}
          </div>
          <p className="ajuda" style={{ marginTop: '.4rem' }}>USD é o padrão, porque é a moeda em que você vive e declara. Dá para trocar também nos resultados.</p>
        </div>
      </div>
      <div className="bloco card">
        <div className="field">
          <span className="lbl">Necessidade de liquidez</span>
          <p className="ajuda">Quanto você vai precisar resgatar e quando. As estratégias alternativas só valem se entregarem esse valor na data. Se o seu plano não entregar, aparece um alerta.</p>
          {c.liquidez.map((x, i) => (
            <div className="grid-3" key={i}>
              <CampoValor prefixo="R$" valor={x.valor} rotulo="Valor necessário" inputMode="numeric" onChange={(v) => up({ liquidez: c.liquidez.map((y, j) => (j === i ? { ...y, valor: v } : y)) })} onBlur={() => up({ liquidez: c.liquidez.map((y, j) => (j === i ? { ...y, valor: milhar(y.valor) } : y)) })} />
              <CampoValor prefixo="Até" valor={x.data} rotulo="Data" inputMode="numeric" placeholder="dd/mm/aaaa" onChange={(v) => up({ liquidez: c.liquidez.map((y, j) => (j === i ? { ...y, data: mascaraData(v) } : y)) })} />
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => up({ liquidez: c.liquidez.filter((_, j) => j !== i) })}>Remover</button>
            </div>
          ))}
          <div><button className="btn btn--ghost btn--sm" type="button" onClick={() => up({ liquidez: [...c.liquidez, { valor: '', data: '' }] })}>+ Adicionar necessidade</button></div>
        </div>
      </div>
      <div className="bloco">
        <div className="bloco-t">Objetivo da comparação</div>
        <div className="opcoes opcoes--3">
          {(
            [
              ['patrimonio', 'Maior patrimônio final', 'Em USD, depois de todos os impostos. Padrão.'],
              ['carga', 'Menor carga total', 'Soma dos impostos no Brasil e nos EUA.'],
              ['credito_perdido', 'Menor crédito perdido', 'Aproveitar ao máximo o IR brasileiro.'],
            ] as const
          ).map(([v, t, d]) => (
            <label className="opcao" key={v}><input type="radio" name="obj" checked={c.objetivo === v} onChange={() => up({ objetivo: v })} /><span className="marca" /><b>{t}</b><small>{d}</small></label>
          ))}
        </div>
      </div>
      <details className="avancado bloco">
        <summary><Icone n="ajuste" />Avançado <small>reinvestimento e faixas americanas futuras</small></summary>
        <div className="avancado-corpo">
          <div className="field">
            <span className="lbl">Reinvestimento depois de um resgate <Selo tipo="prem">espaço reservado</Selo></span>
            <div style={{ border: '1.5px dashed var(--bege-escuro)', borderRadius: 'var(--r)', padding: '1rem 1.1rem', background: 'var(--fundo)' }}>
              <p style={{ fontSize: '.92rem' }}><b>Opções de reinvestimento: em definição pela Sacre.</b></p>
              <p className="ajuda" style={{ marginTop: '.3rem' }}>Enquanto isso, a premissa é: o valor resgatado, já líquido do IR no Brasil, é convertido em dólar na data do resgate e não rende até o fim do horizonte. Isso tende a favorecer manter as aplicações.</p>
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label htmlFor="infl">Corrigir as faixas americanas pela inflação dos EUA (% a.a.)</label><CampoValor id="infl" sufixo="%" valor={c.inflacao} placeholder={`vazio = faixas de ${dados.params.eua.ano}`} onChange={(v) => up({ inflacao: v })} /></div>
            <p className="ajuda" style={{ alignSelf: 'end' }}>O IRS publica as faixas reais a cada ano. Sem correção, o simulador usa as de {dados.params.eua.ano} em todos os anos.</p>
          </div>
        </div>
      </details>
    </section>
  );
}

export function PainelCenario({ e, dados }: { e: EstadoUI; dados: Dados }) {
  const t = e.cenario.trajetoria;
  const valores = t.map((x) => lerNumero(x.cambio));
  return (
    <>
      <div className="r-titulo"><h3>Premissas de mercado</h3><span className="ao-vivo">ao vivo</span></div>
      <div className="bn">
        <div className="bn-label">Câmbio projetado, R$ por US$</div>
        {valores.every((v) => v > 0) && t.length > 1 ? (
          <div style={{ marginTop: '.4rem' }}>
            <GraficoLinha x={t.map((x) => x.ano)} W={420} H={210} escuro tituloY="R$/US$" tituloX="FIM DO ANO" fmtY={fmt2} fmtDica={(v) => `R$ ${fmt2(v)}`} aria="Câmbio projetado por ano" series={[{ nome: 'Câmbio', cor: 'var(--bege)', dados: valores }]} />
          </div>
        ) : (
          <div className="bn-sub">Preencha o câmbio de todos os anos.</div>
        )}
      </div>
      <div className="r-sec">
        <h4>O que é premissa</h4>
        <ul className="r-lista">
          <li><Icone n="info" /><span>CDI = Selic menos a diferença média dos últimos 12 meses ({fmt2(dados.mercado.spread_cdi_selic)} p.p.).</span></li>
          <li><Icone n="info" /><span>Selic e IPCA constantes dentro de cada ano; câmbio em linha reta até o fim de cada ano.</span></li>
          <li><Icone n="info" /><span>Faixas americanas de {dados.params.eua.ano} em todos os anos, salvo correção informada.</span></li>
          <li><Icone n="info" /><span>Venda antes do vencimento pela curva contratada, sem marcação a mercado.</span></li>
          <li><Icone n="info" /><span>Sem reinvestimento depois do resgate.</span></li>
        </ul>
      </div>
      <div className="r-alerta"><Icone n="info" /><span>Fonte: <b>Banco Central do Brasil</b>, Focus de {dados.mercado.focus ? isoParaBR(dados.mercado.focus.data_coleta) : '—'} e SGS, dados de {isoParaBR(dados.mercado.hoje)}. Você pode editar qualquer premissa no cenário personalizado.</span></div>
    </>
  );
}

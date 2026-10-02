import { Component, useEffect, useId, useRef, type ReactNode } from 'react';
import type { Alerta } from '../motores/tipos';

const ICO = {
  info: (
    <>
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5M10 6.1v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  alerta: (
    <>
      <path d="M10 2.8 18.2 16.6H1.8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 8v4.2M10 14.4v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  check: <path d="M4 10.5 8 14.5 16 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  cadeado: (
    <>
      <rect x="4" y="9" width="12" height="8.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  seta: <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  ajuste: (
    <>
      <path d="M3 6h9M15 6h2M3 14h2M8 14h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13.5" cy="6" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6.5" cy="14" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
};
export type NomeIcone = keyof typeof ICO;

export const Icone = ({ n }: { n: NomeIcone }) => (
  <svg className="ico" viewBox="0 0 20 20" aria-hidden="true">
    {ICO[n]}
  </svg>
);

export function Callout({ tipo = 'alerta', icone = 'alerta', titulo, children, id }: { tipo?: 'alerta' | 'verde' | 'branco'; icone?: NomeIcone; titulo?: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div className={`callout${tipo === 'alerta' ? '' : ` callout--${tipo}`}`} id={id}>
      <Icone n={icone} />
      <div>
        {titulo && <h4>{titulo}</h4>}
        {children}
      </div>
    </div>
  );
}

export const Selo = ({ tipo, children }: { tipo: 'ok' | 'pend' | 'aprox' | 'prem' | 'fato' | 'ex' | 'falta' | 'estado' | 'proto'; children: ReactNode }) => (
  <span className={`selo selo--${tipo}`}>{children}</span>
);

export function AlertaPainel({ a }: { a: Alerta }) {
  const marca =
    a.nivel === 'alto' ? (
      <span className="risco risco--alto">▲ Alto</span>
    ) : a.nivel === 'medio' ? (
      <span className="risco risco--medio">◆ Médio</span>
    ) : a.nivel === 'baixo' ? (
      <span className="risco risco--baixo">● Baixo</span>
    ) : a.nivel === 'pendente' ? (
      <span className="selo selo--pend">Pendente</span>
    ) : (
      <Icone n="info" />
    );
  return (
    <div className="r-alerta">
      {marca}
      <span>{a.texto}</span>
    </div>
  );
}

export function CampoValor({ id, prefixo, sufixo, valor, onChange, placeholder, invalido, onBlur, rotulo, inputMode = 'decimal' }: {
  id?: string;
  prefixo?: string;
  sufixo?: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalido?: boolean;
  onBlur?: () => void;
  rotulo?: string;
  inputMode?: 'decimal' | 'numeric';
}) {
  return (
    <div className="iw" data-invalido={invalido || undefined}>
      {prefixo && <span>{prefixo}</span>}
      <input id={id} value={valor} placeholder={placeholder} inputMode={inputMode} aria-label={rotulo} aria-invalid={invalido || undefined} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      {sufixo && <span>{sufixo}</span>}
    </div>
  );
}

/** Diálogo nativo (<dialog>) aberto como modal enquanto `aberto` for verdadeiro. */
export function Dialogo({ aberto, fechar, titulo, eyebrow, children, largura }: { aberto: boolean; fechar: () => void; titulo: ReactNode; eyebrow?: string; children: ReactNode; largura?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  const id = useId();
  return (
    <dialog ref={ref} aria-labelledby={id} onClose={fechar} onClick={(e) => e.target === ref.current && fechar()} style={largura ? { width: largura } : undefined}>
      {aberto && (
        <>
          <div className="dlg-head">
            <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h3 id={id}>{titulo}</h3></div>
            <button className="dlg-x" type="button" aria-label="Fechar" onClick={fechar}>✕</button>
          </div>
          <div className="dlg-body">{children}</div>
        </>
      )}
    </dialog>
  );
}

/** Se uma parte da tela falhar, mostra um aviso no lugar dela em vez de apagar a página inteira. */
export class Protecao extends Component<{ children: ReactNode; chave: string }, { erro: string | null; chave: string }> {
  state = { erro: null as string | null, chave: this.props.chave };
  static getDerivedStateFromError(e: unknown) {
    return { erro: e instanceof Error ? e.message : String(e) };
  }
  static getDerivedStateFromProps(p: { chave: string }, s: { erro: string | null; chave: string }) {
    return p.chave !== s.chave ? { erro: null, chave: p.chave } : null;
  }
  render() {
    if (this.state.erro)
      return (
        <div className="vazio" role="alert">
          Esta parte da tela não pôde ser exibida. Altere um dado ou volte uma etapa e tente de novo.
          <br />
          <small>{this.state.erro}</small>
        </div>
      );
    return this.props.children;
  }
}

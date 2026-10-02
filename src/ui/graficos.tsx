// Gráficos em SVG próprio: linhas (patrimônio, câmbio) e barras + linha (crédito).
import { useState, type ReactNode } from 'react';
import { fmt0, fmt1, fmt2 } from './formato';

function passo(range: number, n: number) {
  const raw = range / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
function marcas(lo: number, hi: number, n = 5) {
  const st = passo(hi - lo || Math.abs(hi) || 1, n);
  const a = Math.floor(lo / st) * st;
  const b = Math.ceil(hi / st) * st;
  const out: number[] = [];
  for (let v = a; v <= b + st / 2; v += st) out.push(+v.toFixed(6));
  return out.length > 1 ? out : [a, a + st];
}

export interface Serie {
  nome: string;
  cor: string;
  tracejado?: string;
  dados: number[];
}

function Dica({ x, y, W, H, i, n, children }: { x: number; y: number; W: number; H: number; i: number; n: number; children: ReactNode }) {
  const tr = i === 0 ? 'translate(-8%,-112%)' : i === n - 1 ? 'translate(-92%,-112%)' : 'translate(-50%,-112%)';
  return (
    <div className="tip" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: tr, opacity: 1 }}>
      {children}
    </div>
  );
}

export function GraficoLinha(p: {
  x: (number | string)[];
  series: Serie[];
  tituloY: string;
  tituloX: string;
  fmtY?: (v: number) => string;
  fmtDica?: (v: number) => string;
  W?: number;
  H?: number;
  escuro?: boolean;
  aria: string;
  yMin?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = p.W ?? 720;
  const H = p.H ?? 290;
  const m = { l: 60, r: 18, t: 30, b: 42 };
  const vals = p.series.flatMap((s) => s.dados).filter((v) => isFinite(v));
  if (!vals.length || p.x.length < 2) return <div className="vazio">Sem dados para o gráfico.</div>;
  const tk = marcas(p.yMin ?? Math.min(...vals), Math.max(...vals), 5);
  const lo = tk[0];
  const hi = tk[tk.length - 1];
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const n = p.x.length;
  const sx = (i: number) => m.l + (i * iw) / (n - 1);
  const sy = (v: number) => m.t + ((hi - v) / (hi - lo || 1)) * ih;
  const fy = p.fmtY ?? fmt0;
  const fd = p.fmtDica ?? fmt1;
  return (
    <div className={`chart${p.escuro ? ' chart--escuro' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={p.aria} onMouseLeave={() => setHover(null)}>
        {tk.map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} />
            <text x={m.l - 9} y={sy(t)} dy=".32em" textAnchor="end">{fy(t)}</text>
          </g>
        ))}
        <line className="axis" x1={m.l} x2={W - m.r} y1={m.t + ih} y2={m.t + ih} />
        {p.x.map((x, i) => (
          <text key={String(x)} x={sx(i)} y={m.t + ih + 19} textAnchor="middle">{x}</text>
        ))}
        <text className="axis-title" x={0} y={12}>{p.tituloY}</text>
        <text className="axis-title" x={W - m.r} y={H - 3} textAnchor="end">{p.tituloX}</text>
        {hover !== null && <line className="hover-line" x1={sx(hover)} x2={sx(hover)} y1={m.t} y2={m.t + ih} />}
        {p.series.map((s) => (
          <g key={s.nome}>
            <path
              className="serie"
              style={{ stroke: s.cor, strokeDasharray: s.tracejado }}
              d={s.dados.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('')}
            />
            {s.dados.map((v, i) => (
              <circle key={i} className="pt" style={{ fill: s.cor }} cx={sx(i)} cy={sy(v)} r={3.6} />
            ))}
          </g>
        ))}
        {p.x.map((x, i) => (
          <rect key={`h${x}`} x={sx(i) - iw / (n - 1) / 2} y={m.t} width={iw / (n - 1)} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <Dica x={sx(hover)} y={Math.min(...p.series.map((s) => sy(s.dados[hover])))} W={W} H={H} i={hover} n={n}>
          <b>{p.x[hover]}</b>
          {p.series.map((s) => (
            <div key={s.nome}>
              <span className="sw" style={{ background: s.cor }} />
              {s.nome}: <b>{fd(s.dados[hover])}</b>
            </div>
          ))}
        </Dica>
      )}
    </div>
  );
}

export function GraficoCredito(p: { anos: number[]; teto: number[]; irbr: number[]; usado: number[]; saldo: number[]; tituloY: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 300;
  const m = { l: 52, r: 26, t: 30, b: 42 };
  const tk = marcas(0, Math.max(1e-9, ...p.irbr, ...p.teto, ...p.saldo, ...p.usado), 4);
  const hi = tk[tk.length - 1];
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const n = p.anos.length;
  const gw = iw / n;
  const cx = (i: number) => m.l + gw * (i + 0.5);
  const sy = (v: number) => m.t + ((hi - v) / hi) * ih;
  const bw = Math.min(22, gw * 0.22);
  const barra = (i: number, k: number, v: number, cls: string) => (
    <rect className={cls} x={cx(i) + (k - 1.5) * (bw + 3)} y={sy(v)} width={bw} height={Math.max(0, m.t + ih - sy(v))} rx={2} />
  );
  const xs = (i: number) => cx(i) + 1.5 * (bw + 3);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Teto, imposto retido no Brasil, crédito usado e saldo por ano" onMouseLeave={() => setHover(null)}>
        {tk.map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} />
            <text x={m.l - 9} y={sy(t)} dy=".32em" textAnchor="end">{fmt1(t)}</text>
          </g>
        ))}
        <line className="axis" x1={m.l} x2={W - m.r} y1={m.t + ih} y2={m.t + ih} />
        <text className="axis-title" x={0} y={12}>{p.tituloY}</text>
        <text className="axis-title" x={W - m.r} y={H - 3} textAnchor="end">ANO DA DECLARAÇÃO</text>
        {hover !== null && <line className="hover-line" x1={cx(hover)} x2={cx(hover)} y1={m.t} y2={m.t + ih} />}
        {p.anos.map((a, i) => (
          <g key={a}>
            {barra(i, 0, p.teto[i], 'b-teto')}
            {barra(i, 1, p.irbr[i], 'b-irbr')}
            {barra(i, 2, p.usado[i], 'b-usado')}
            <text x={cx(i)} y={m.t + ih + 19} textAnchor="middle">{a}</text>
          </g>
        ))}
        <path className="s-saldo" d={p.saldo.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${sy(v).toFixed(1)}`).join('')} />
        {p.saldo.map((v, i) => (
          <circle key={i} className="pt s-saldo" cx={xs(i)} cy={sy(v)} r={3.6} />
        ))}
        {p.anos.map((a, i) => (
          <rect key={`h${a}`} x={cx(i) - gw / 2} y={m.t} width={gw} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <Dica x={cx(hover)} y={Math.min(sy(p.irbr[hover]), sy(p.teto[hover]), sy(p.saldo[hover]))} W={W} H={H} i={hover} n={n}>
          <b>{p.anos[hover]}</b>
          <div><span className="sw" style={{ background: 'var(--verde-tint)', border: '1px solid var(--verde)' }} />Teto: <b>{fmt2(p.teto[hover])}</b></div>
          <div><span className="sw" style={{ background: 'var(--bege)' }} />IR retido no Brasil: <b>{fmt2(p.irbr[hover])}</b></div>
          <div><span className="sw" style={{ background: 'var(--verde)' }} />Crédito usado: <b>{fmt2(p.usado[hover])}</b></div>
          <div><span className="sw" style={{ background: 'var(--alerta)' }} />Saldo no fim do ano: <b>{fmt2(p.saldo[hover])}</b></div>
        </Dica>
      )}
    </div>
  );
}

export function Decomposicao({ itens, total, fmt }: { itens: [string, number][]; total: number; fmt: (v: number) => string }) {
  const max = Math.max(1e-9, ...itens.map(([, v]) => Math.abs(v)));
  return (
    <div className="decomp">
      {itens.map(([n, v]) => {
        const w = (Math.abs(v) / max) * 50;
        return (
          <div className="dc-row" key={n}>
            <span>{n}</span>
            <div className="dc-track">
              <div className={`dc-bar ${v >= 0 ? 'pos' : 'neg'}`} style={{ left: `${v >= 0 ? 50 : 50 - w}%`, width: `${w}%` }} />
            </div>
            <span className={`dc-v ${v > 0.5 ? 'dif-pos' : v < -0.5 ? 'dif-neg' : ''}`}>{fmt(v)}</span>
          </div>
        );
      })}
      <div className="dc-row dc-total">
        <span>Diferença total</span>
        <span />
        <span className={`dc-v ${total >= 0 ? 'dif-pos' : 'dif-neg'}`}>{fmt(total)}</span>
      </div>
    </div>
  );
}

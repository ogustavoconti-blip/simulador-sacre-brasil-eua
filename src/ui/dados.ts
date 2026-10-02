// Carrega os arquivos estáticos do próprio site (só leitura) e conversa com o Web Worker.
import { useEffect, useRef, useState } from 'react';
import type { Execucao } from '../motores';
import type { DadosMercado } from '../motores/mercado';
import { carregaParametros } from '../motores/parametros';
import type { Parametros, Simulacao } from '../motores/tipos';

import { ARQUIVO_FEDERAL, ESTADOS_MODO_A } from './arquivos-parametros';

async function json(caminho: string): Promise<unknown> {
  const r = await fetch(caminho, { cache: 'no-cache', credentials: 'omit' });
  if (!r.ok) throw new Error(`Não foi possível carregar ${caminho}.`);
  return r.json();
}

export interface Dados {
  params: Parametros;
  brutos: { brasil: unknown; eua: unknown; estados: unknown[] };
  mercado: DadosMercado;
}

export async function carregaDados(): Promise<Dados> {
  const [brasil, eua, mercado, ...estados] = await Promise.all([
    json('./parametros/brasil.json'),
    json(`./parametros/${ARQUIVO_FEDERAL}`),
    json('./dados/mercado.json'),
    ...ESTADOS_MODO_A.map((uf) => json(`./parametros/estados/${uf}.json`)),
  ]);
  const brutos = { brasil, eua, estados };
  return { params: carregaParametros(brutos), brutos, mercado: mercado as DadosMercado };
}

export type EstadoCalculo =
  | { fase: 'ocioso' }
  | { fase: 'calculando'; anterior: Execucao | null }
  | { fase: 'pronto'; execucao: Execucao }
  | { fase: 'erro'; mensagem: string };

/** Roda a simulação no Worker, com espera curta depois da última alteração. */
export function useSimulacao(sim: Simulacao | null, dados: Dados): EstadoCalculo {
  const [estado, setEstado] = useState<EstadoCalculo>({ fase: 'ocioso' });
  const worker = useRef<Worker | null>(null);
  const pedido = useRef(0);
  const ultima = useRef<Execucao | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('../worker/simulador.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = (e: MessageEvent<Execucao & { id: number }>) => {
      if (e.data.id !== pedido.current) return; // resposta de um pedido antigo
      ultima.current = e.data;
      setEstado({ fase: 'pronto', execucao: e.data });
    };
    w.onerror = (e) => setEstado({ fase: 'erro', mensagem: e.message || 'Erro no cálculo.' });
    return () => w.terminate();
  }, []);

  const chave = sim ? JSON.stringify(sim) : '';
  useEffect(() => {
    if (!sim || !worker.current) {
      setEstado({ fase: 'ocioso' });
      return;
    }
    const id = ++pedido.current;
    setEstado({ fase: 'calculando', anterior: ultima.current });
    const t = setTimeout(() => worker.current?.postMessage({ id, sim, params: dados.params, dados: dados.mercado }), 350);
    return () => clearTimeout(t);
    // a chave serializada representa a simulação inteira
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, dados]);

  return estado;
}

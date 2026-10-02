// Web Worker: roda os motores fora da linha principal, para a tela não travar.
// Recebe a simulação, os parâmetros e os dados de mercado; devolve o resultado. Não guarda nada.
import { executaSimulacao } from '../motores';
import type { DadosMercado } from '../motores/mercado';
import type { Parametros, Simulacao } from '../motores/tipos';

interface Pedido {
  id: number;
  sim: Simulacao;
  params: Parametros;
  dados: DadosMercado;
}

const escopo = self as unknown as {
  onmessage: (e: MessageEvent<Pedido>) => void;
  postMessage: (m: unknown) => void;
};

escopo.onmessage = (e) => {
  const { id, sim, params, dados } = e.data;
  try {
    escopo.postMessage({ id, ...executaSimulacao(sim, params, dados) });
  } catch (err) {
    escopo.postMessage({ id, ok: false, problemas: [{ campo: 'interno', texto: err instanceof Error ? err.message : String(err) }] });
  }
};

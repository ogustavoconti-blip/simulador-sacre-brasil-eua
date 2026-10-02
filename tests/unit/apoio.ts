// Apoio aos testes: parâmetros do repositório, mercado sintético e simulação base.
import brasil from '../../public/parametros/brasil.json';
import eua from '../../public/parametros/eua_federal_2026.json';
import { dia } from '../../src/motores/calendario';
import { criaMercado, trajetoriaAnual } from '../../src/motores/mercado';
import { carregaParametros } from '../../src/motores/parametros';
import type { Posicao, Simulacao } from '../../src/motores/tipos';

export { ESTADOS_MODO_A } from '../../src/ui/arquivos-parametros';
/** Todos os arquivos de estado da pasta de parâmetros. */
export const arquivosEstados = import.meta.glob('../../public/parametros/estados/*.json', { eager: true, import: 'default' });
export const brutos = { brasil, eua, estados: Object.values(arquivosEstados) };
export const params = carregaParametros(brutos);

/** Mercado sintético com taxas constantes e sem histórico. */
export function mercadoConstante(o: { hoje?: string; cdi?: number; selic?: number; ipca?: number; cambio?: number; cambioFim?: (ano: number) => number } = {}) {
  const pontos = [];
  for (let ano = 2015; ano <= 2045; ano++) {
    pontos.push({ ano, selic_fim: o.selic ?? 10, ipca: o.ipca ?? 4, cambio_fim: o.cambioFim ? o.cambioFim(ano) : (o.cambio ?? 5), cdi: o.cdi ?? 10 });
  }
  const anos = trajetoriaAnual(pontos, o.selic ?? 10, 0.1, 2015, 2045, 'usuario');
  return criaMercado({ hoje: o.hoje ?? '2026-10-01', cambio_hoje: o.cambio ?? 5, historico: {} }, anos, dia('2015-01-01'), dia('2046-12-31'));
}

export function posicao(p: Partial<Posicao> & Pick<Posicao, 'id' | 'produto' | 'data_compra' | 'data_vencimento'>): Posicao {
  return {
    valor_aplicado_brl: 100_000,
    indexador: 'cdi',
    taxa: 100,
    pagamento: { tipo: 'vencimento' },
    liquidez: { tipo: 'diaria' },
    plano: { tipo: 'vencimento' },
    ...p,
  };
}

export function simulacao(posicoes: Posicao[], o: Partial<Simulacao['perfil']> & { conta?: Simulacao['conta']; horizonte?: number; liquidez?: Simulacao['cenario']['liquidez'] } = {}): Simulacao {
  return {
    perfil: {
      estado: o.estado ?? 'FL',
      filing: o.filing ?? 'single',
      renda_tributavel_usd: o.renda_tributavel_usd ?? 120_000,
      aliquota_estadual_estimada: o.aliquota_estadual_estimada ?? null,
      avancado: o.avancado,
    },
    conta: o.conta ?? 'light',
    posicoes,
    cenario: {
      tipo: 'personalizado',
      trajetoria: [],
      horizonte_anos: o.horizonte ?? 4,
      moeda: 'USD',
      liquidez: o.liquidez ?? [],
      objetivo: 'patrimonio',
      reinvestimento: { tipo: 'nenhum' },
      inflacao_eua_faixas: null,
    },
  };
}

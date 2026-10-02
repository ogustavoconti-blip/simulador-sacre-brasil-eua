// Foreign Tax Credit: uso no próprio ano, volta de 1 ano, até 10 anos à frente e expiração.
// Ordem obrigatória (26 CFR §1.904-2): imposto do próprio ano até o teto; o excedente vai ao ano
// anterior; o que sobrar segue para os anos seguintes, do saldo mais antigo para o mais novo.
// Em ano de dedução, o espaço do teto consome o saldo sem gerar crédito (§1.904-2(c)(3)(ii)).

export interface AnoCredito {
  ano: number;
  teto: number;
  imposto: number; // imposto estrangeiro creditável pago no ano (categoria passiva)
  modo: 'credito' | 'deducao';
}

export interface EntradaCredito {
  anos: AnoCredito[]; // anos consecutivos, em ordem
  saldos_iniciais?: { ano_origem: number; valor: number }[];
  teto_livre_ano_anterior?: number; // espaço do teto no ano anterior ao primeiro ano simulado
  carryback: number;
  carryforward: number;
}

export interface ResultadoAnoCredito {
  ano: number;
  teto: number;
  imposto: number;
  modo: 'credito' | 'deducao';
  usado_proprio: number;
  carryforward_recebido: number;
  carryback_recebido: number;
  consumido_sem_credito: number;
  credito_total: number; // crédito que reduz o imposto deste ano (inclusive por retificação)
  folga_final: number;
  excedente_gerado: number;
}

export interface OrigemCredito {
  ano_origem: number;
  inicial: boolean; // saldo informado pelo usuário
  gerado: number;
  usado_proprio: number;
  enviado_anterior: { ano: number; valor: number }[];
  usado_seguintes: { ano: number; valor: number; com_credito: boolean }[];
  expirado: number;
  ano_expiracao: number;
  saldo_final: number;
}

export interface ResultadoCredito {
  anos: ResultadoAnoCredito[];
  origens: OrigemCredito[];
  ano_anterior: { ano: number; recebido: number }; // retificação do ano anterior à simulação
}

export function calculaCredito(e: EntradaCredito): ResultadoCredito {
  const { carryback: cb, carryforward: cf } = e;
  if (!e.anos.length) return { anos: [], origens: [], ano_anterior: { ano: 0, recebido: 0 } };
  const primeiro = e.anos[0].ano;
  const folga = new Map<number, number>([[primeiro - 1, Math.max(0, e.teto_livre_ano_anterior ?? 0)]]);
  const modo = new Map<number, 'credito' | 'deducao'>([[primeiro - 1, 'credito']]);
  const res = new Map<number, ResultadoAnoCredito>();
  const origens = new Map<number, OrigemCredito>();
  const saldos: { origem: number; valor: number }[] = [];
  const anterior = { ano: primeiro - 1, recebido: 0 };

  const novaOrigem = (ano: number, gerado: number, inicial: boolean): OrigemCredito => ({
    ano_origem: ano,
    inicial,
    gerado,
    usado_proprio: 0,
    enviado_anterior: [],
    usado_seguintes: [],
    expirado: 0,
    ano_expiracao: ano + cf,
    saldo_final: 0,
  });

  for (const s of e.saldos_iniciais ?? []) {
    if (s.valor <= 0) continue;
    origens.set(s.ano_origem, novaOrigem(s.ano_origem, s.valor, true));
    saldos.push({ origem: s.ano_origem, valor: s.valor });
  }

  for (const a of e.anos) {
    const r: ResultadoAnoCredito = {
      ano: a.ano,
      teto: a.teto,
      imposto: a.imposto,
      modo: a.modo,
      usado_proprio: 0,
      carryforward_recebido: 0,
      carryback_recebido: 0,
      consumido_sem_credito: 0,
      credito_total: 0,
      folga_final: 0,
      excedente_gerado: 0,
    };
    let excedente = 0;
    let f: number;
    if (a.modo === 'credito') {
      r.usado_proprio = Math.min(a.imposto, a.teto);
      excedente = a.imposto - r.usado_proprio;
      f = a.teto - r.usado_proprio;
    } else {
      // imposto do ano deduzido: não vira saldo; o teto livre é medido como se houvesse crédito
      f = Math.max(0, a.teto - a.imposto);
    }
    r.excedente_gerado = excedente;

    // 1) saldos de anos anteriores, do mais antigo para o mais novo
    saldos.sort((x, y) => x.origem - y.origem);
    for (const s of saldos) {
      if (s.valor <= 0 || s.origem >= a.ano || a.ano > s.origem + cf) continue;
      const u = Math.min(s.valor, f);
      if (u <= 0) continue;
      s.valor -= u;
      f -= u;
      const comCredito = a.modo === 'credito';
      if (comCredito) r.carryforward_recebido += u;
      else r.consumido_sem_credito += u;
      origens.get(s.origem)!.usado_seguintes.push({ ano: a.ano, valor: u, com_credito: comCredito });
    }
    folga.set(a.ano, f);
    modo.set(a.ano, a.modo);
    res.set(a.ano, r);

    // 2) excedente do ano: volta ao(s) ano(s) anterior(es), do mais antigo para o mais novo
    if (a.modo === 'credito' && a.imposto > 0) {
      const o = novaOrigem(a.ano, a.imposto, false);
      o.usado_proprio = r.usado_proprio;
      origens.set(a.ano, o);
      for (let k = cb; k >= 1 && excedente > 0; k--) {
        const y = a.ano - k;
        const fy = folga.get(y) ?? 0;
        const u = Math.min(excedente, fy);
        if (u <= 0) continue;
        folga.set(y, fy - u);
        excedente -= u;
        o.enviado_anterior.push({ ano: y, valor: u });
        const ry = res.get(y);
        if (y === anterior.ano) anterior.recebido += u;
        else if (ry && modo.get(y) === 'credito') ry.carryback_recebido += u;
        else if (ry) ry.consumido_sem_credito += u;
      }
      // 3) o que sobrou segue para os anos seguintes
      if (excedente > 0) saldos.push({ origem: a.ano, valor: excedente });
    }

    // 4) expiração no fim do último ano permitido
    for (const s of saldos) {
      if (s.valor > 0 && a.ano >= s.origem + cf) {
        origens.get(s.origem)!.expirado += s.valor;
        s.valor = 0;
      }
    }
  }

  for (const s of saldos) origens.get(s.origem)!.saldo_final += s.valor;
  const anos = e.anos.map((a) => {
    const r = res.get(a.ano)!;
    r.folga_final = folga.get(a.ano) ?? 0;
    r.credito_total = r.modo === 'credito' ? r.usado_proprio + r.carryforward_recebido + r.carryback_recebido : 0;
    return r;
  });
  return { anos, origens: [...origens.values()].sort((x, y) => x.ano_origem - y.ano_origem), ano_anterior: anterior };
}

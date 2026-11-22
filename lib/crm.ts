/**
 * Reglas del CRM de venta. Vienen del CRM VENIUM de URP (Apps Script) y se generalizaron para cualquier
 * negocio. Aquí no hay base de datos ni pantallas: solo decisiones, para poder probarlas.
 * Todas las fechas van en milisegundos (Date.getTime()).
 */
/** Nivel de interés que pone el bot (columna leads.nivel en Supabase). */
export const NIVELES = ['sin_calificar', 'evaluando', 'interesado', 'superinteresado', 'pre_inscrito', 'matriculado', 'no_interes'] as const;
export type Nivel = (typeof NIVELES)[number];

export const ETAPAS = [
  { id: 'nuevo', nombre: 'Nuevo', ayuda: 'Llegó y nadie conversó con él todavía', color: '#64748B', orden: 1 },
  { id: 'conversando', nombre: 'Conversando', ayuda: 'Respondió al bot o al equipo', color: '#7C5CFA', orden: 2 },
  { id: 'sin_respuesta', nombre: 'Sin respuesta', ayuda: 'Dejó de responder; el bot le envía recordatorios', color: '#F2A33A', orden: 3 },
  { id: 'por_llamar', nombre: 'Por llamar', ayuda: 'El bot terminó sus recordatorios: toca llamarlo', color: '#E04420', orden: 4 },
  { id: 'quiere_comprar', nombre: 'Quiere comprar', ayuda: 'Dijo que quiere comprar o inscribirse', color: '#FF5B3A', orden: 5 },
  { id: 'en_cierre', nombre: 'En cierre', ayuda: 'Reservó, se inscribió o está pagando', color: '#0EA5E9', orden: 6 },
  { id: 'cliente', nombre: 'Cliente', ayuda: 'Ya compró', color: '#12A57B', orden: 7 },
  { id: 'proximo', nombre: 'Más adelante', ayuda: 'Le interesa, pero para otra fecha', color: '#94A3B8', orden: 8 },
  { id: 'cerrado', nombre: 'Cerrado', ayuda: 'No le interesa o el número está errado', color: '#CBD5E1', orden: 9 },
] as const;
export type Etapa = (typeof ETAPAS)[number]['id'];
export const ETAPAS_ACTIVAS: Etapa[] = ['nuevo', 'conversando', 'sin_respuesta', 'por_llamar', 'quiere_comprar', 'en_cierre'];

export type Temperatura = 'super' | 'caliente' | 'tibio' | 'frio' | '';
export const TEMPERATURAS: Record<Exclude<Temperatura, ''>, { nombre: string; color: string }> = {
  super: { nombre: 'Super caliente', color: '#E04420' },
  caliente: { nombre: 'Caliente', color: '#F2A33A' },
  tibio: { nombre: 'Tibio', color: '#7C5CFA' },
  frio: { nombre: 'Frío', color: '#64748B' },
};

/** Lo mínimo que el CRM necesita saber de un lead para decidir. */
export interface LeadCrm {
  id: string;
  nombre: string;
  telefono: string;             // wa_id: solo dígitos, con código de país
  etapa: Etapa;
  nivel: Nivel;
  visto: boolean;
  esPrueba: boolean;
  /** El bot pasó el chat a una persona y nadie lo ha retomado */
  pidePersona: boolean;
  resumen: string;
  motivoNoInteres: string;
  origen: string;
  proximaAccion: string;
  proximoSeguimiento: number | null;
  ultimaAtencion: number | null;
  ultimaLlamada: number | null;
  llamadas: number;
  ultimoIngreso: number | null;
  creado: number;
}

const DIA = 86_400_000;

/** Nombre de la etapa, con el que el negocio haya elegido si lo cambió. */
export function nombreEtapa(etapa: Etapa, propios: Partial<Record<Etapa, string>> = {}): string {
  return propios[etapa]?.trim() || ETAPAS.find((e) => e.id === etapa)!.nombre;
}

export function temperatura(l: Pick<LeadCrm, 'etapa' | 'nivel'>): Temperatura {
  if (l.etapa === 'cliente' || l.etapa === 'cerrado' || l.etapa === 'en_cierre') return '';
  if (l.nivel === 'superinteresado' || l.etapa === 'quiere_comprar') return 'super';
  if (l.nivel === 'interesado') return 'caliente';
  if (l.nivel === 'evaluando') return 'tibio';
  return 'frio';
}

/**
 * Etapa después de que el bot responde. Solo avanza; las etapas que pone una persona
 * (en cierre, cliente, más adelante) no las toca el bot.
 */
export function etapaTrasBot(actual: Etapa, nivel: Nivel): Etapa {
  if (actual === 'en_cierre' || actual === 'cliente' || actual === 'proximo') return actual;
  if (nivel === 'no_interes') return 'cerrado';
  if (nivel === 'pre_inscrito') return 'en_cierre';
  if (nivel === 'matriculado') return 'cliente';
  if (nivel === 'superinteresado') return 'quiere_comprar';
  if (actual === 'quiere_comprar') return actual;
  return 'conversando';
}

/** Medianoche de hoy en Lima (UTC-5, sin horario de verano). */
export function inicioDelDia(ahora: number, zonaHoras = -5): number {
  const local = ahora + zonaHoras * 3_600_000;
  return local - (local % DIA) - zonaHoras * 3_600_000;
}

const pospuesto = (l: LeadCrm, ahora: number) => l.proximoSeguimiento !== null && l.proximoSeguimiento > ahora;
const vencido = (l: LeadCrm, ahora: number) => l.proximoSeguimiento !== null && l.proximoSeguimiento <= ahora;
/** Volvió a registrarse después de la última vez que lo atendimos. */
export const reingresoPendiente = (l: LeadCrm) =>
  l.ultimoIngreso !== null && l.ultimoIngreso > l.creado + 60_000 && (l.ultimaAtencion ?? 0) < l.ultimoIngreso;

/* ---------------- Por atender: la cola del equipo ---------------- */

/** Rango en la cola: 1 se atiende primero. */
export function rangoAtencion(l: LeadCrm): number {
  if (l.etapa === 'en_cierre') return 1;
  return { super: 2, caliente: 3, tibio: 4, frio: 5, '': 5 }[temperatura(l)];
}

export function enCola(l: LeadCrm, ahora: number): boolean {
  if (l.esPrueba) return false;
  if (reingresoPendiente(l)) return l.etapa !== 'cliente';
  if (!ETAPAS_ACTIVAS.includes(l.etapa)) return false;
  if (pospuesto(l, ahora)) return false;
  return l.pidePersona || !l.visto || vencido(l, ahora) || rangoAtencion(l) <= 4;
}

export function porQueAtender(l: LeadCrm, ahora: number): string {
  if (reingresoPendiente(l)) return '🔁 Volvió a registrarse';
  if (l.pidePersona) return 'El bot lo pasó a una persona';
  if (vencido(l, ahora)) {
    const cuando = l.proximoSeguimiento! < inicioDelDia(ahora) ? 'vencido' : 'de hoy';
    return `Seguimiento ${cuando}${l.proximaAccion ? `: ${l.proximaAccion}` : ''}`;
  }
  if (!l.visto) return 'Nuevo, nadie lo ha abierto';
  return l.resumen || nombreEtapa(l.etapa);
}

/** Primero los de más interés y, dentro de cada nivel, el que llegó antes. */
export function colaAtencion(leads: LeadCrm[], ahora: number): LeadCrm[] {
  const llegada = (l: LeadCrm) => Math.max(l.creado, l.ultimoIngreso ?? 0);
  return leads.filter((l) => enCola(l, ahora))
    .sort((a, b) => rangoAtencion(a) - rangoAtencion(b) || llegada(a) - llegada(b));
}

/* ---------------- Llamadas ---------------- */

export const GRUPOS_LLAMADA = {
  1: { nombre: 'Quiere comprar', ayuda: 'falta cerrar', color: '#E04420' },
  2: { nombre: 'Interesado', ayuda: 'falta el sí', color: '#F2A33A' },
  3: { nombre: 'No respondió el WhatsApp', ayuda: 'llamada obligatoria', color: '#7C5CFA' },
  4: { nombre: 'Nuevo sin contactar', ayuda: 'nadie lo ha llamado', color: '#12A57B' },
  5: { nombre: 'Frío que conversó', ayuda: 'confirmar si sigue interesado', color: '#94A3B8' },
} as const;
export type GrupoLlamada = 0 | keyof typeof GRUPOS_LLAMADA;

export function grupoLlamada(l: LeadCrm, ahora: number): GrupoLlamada {
  if (!l.telefono.replace(/\D/g, '') || l.esPrueba) return 0;
  if (!ETAPAS_ACTIVAS.includes(l.etapa) || l.etapa === 'en_cierre') return 0;
  const t = temperatura(l);
  if (t === 'super') return 1;
  if (l.etapa === 'por_llamar' || l.etapa === 'sin_respuesta') return 3;
  if (t === 'caliente' || ahora - l.creado < 2 * DIA) return 2;
  if (l.etapa === 'nuevo' && l.llamadas === 0) return 4;
  if (l.etapa === 'conversando') return 5;
  return 0;
}

export function porLlamarAhora(l: LeadCrm, ahora: number): boolean {
  if (!grupoLlamada(l, ahora)) return false;
  return l.proximoSeguimiento !== null ? l.proximoSeguimiento <= ahora : l.ultimaLlamada === null;
}

export function colaLlamadas(leads: LeadCrm[], ahora: number): LeadCrm[] {
  return leads.filter((l) => porLlamarAhora(l, ahora))
    .sort((a, b) => grupoLlamada(a, ahora) - grupoLlamada(b, ahora) || b.creado - a.creado);
}

export const RESULTADOS_LLAMADA = {
  interesado: { nombre: 'Contestó: interesado', etapa: 'conversando', dias: 2 },
  quiere_comprar: { nombre: 'Contestó: quiere comprar', etapa: 'quiere_comprar', dias: 1 },
  pensando: { nombre: 'Contestó: lo va a pensar', etapa: 'conversando', dias: 3 },
  mas_adelante: { nombre: 'Contestó: más adelante', etapa: 'proximo', dias: null },
  no_interesa: { nombre: 'Contestó: no le interesa', etapa: 'cerrado', dias: null },
  no_contesto: { nombre: 'No contestó', etapa: null, dias: 1 },
  numero_errado: { nombre: 'Número errado', etapa: 'cerrado', dias: null },
} as const satisfies Record<string, { nombre: string; etapa: Etapa | null; dias: number | null }>;
export type ResultadoLlamada = keyof typeof RESULTADOS_LLAMADA;

/** Qué cambia en el lead después de registrar una llamada. */
export function trasLlamada(l: Pick<LeadCrm, 'etapa'>, resultado: ResultadoLlamada, ahora: number) {
  const r = RESULTADOS_LLAMADA[resultado];
  return {
    etapa: (r.etapa ?? l.etapa) as Etapa,
    proximoSeguimiento: r.dias === null ? null : ahora + r.dias * DIA,
    proximaAccion: r.dias === null ? '' : resultado === 'no_contesto' ? 'Volver a llamar' : 'Llamar de nuevo',
    motivoNoInteres: resultado === 'numero_errado' ? 'Número errado' : resultado === 'no_interesa' ? 'No le interesa' : null,
  };
}

/* ---------------- Tablero ---------------- */

export interface Tablero {
  porEtapa: Record<Etapa, number>;
  porTemperatura: Record<Exclude<Temperatura, ''>, number>;
  ingresaronHoy: number;
  porAtender: number;
  porLlamar: number;
  /** Por qué no les interesa, de mayor a menor */
  motivos: { motivo: string; cantidad: number }[];
  /** Embudo: cuántos llegaron a cada paso (acumulado hacia atrás) */
  embudo: { paso: string; cantidad: number }[];
}

export function tablero(leads: LeadCrm[], ahora: number): Tablero {
  const reales = leads.filter((l) => !l.esPrueba);
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e.id, 0])) as Record<Etapa, number>;
  const porTemperatura = { super: 0, caliente: 0, tibio: 0, frio: 0 };
  const motivos = new Map<string, number>();
  const hoy0 = inicioDelDia(ahora);
  for (const l of reales) {
    porEtapa[l.etapa]++;
    const t = temperatura(l);
    if (t && ETAPAS_ACTIVAS.includes(l.etapa)) porTemperatura[t]++;
    if (l.etapa === 'cerrado') {
      const m = l.motivoNoInteres.trim() || 'No indicó';
      motivos.set(m, (motivos.get(m) ?? 0) + 1);
    }
  }
  const n = (...e: Etapa[]) => e.reduce((s, x) => s + porEtapa[x], 0);
  return {
    porEtapa,
    porTemperatura,
    ingresaronHoy: reales.filter((l) => Math.max(l.creado, l.ultimoIngreso ?? 0) >= hoy0).length,
    porAtender: reales.filter((l) => enCola(l, ahora)).length,
    porLlamar: reales.filter((l) => porLlamarAhora(l, ahora)).length,
    motivos: [...motivos].map(([motivo, cantidad]) => ({ motivo, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
    embudo: [
      { paso: 'Llegaron', cantidad: reales.length },
      { paso: 'Conversaron', cantidad: reales.length - porEtapa.nuevo },
      { paso: 'Quieren comprar', cantidad: n('quiere_comprar', 'en_cierre', 'cliente') },
      { paso: 'En cierre', cantidad: n('en_cierre', 'cliente') },
      { paso: 'Clientes', cantidad: porEtapa.cliente },
    ],
  };
}

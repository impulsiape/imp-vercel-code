/**
 * Modo demo: un negocio ficticio con leads inventados, guardado en la memoria del servidor.
 * Sirve para ver y probar el CRM sin Supabase. Los cambios se pierden al reiniciar.
 */
import { trasLlamada, RESULTADOS_LLAMADA, type Etapa, type LeadCrm } from '@/lib/crm';
import type { Nivel } from '@/lib/crm';
import type { Actividad, LeadDetalle, Mensaje, Negocio, Repo } from './tipos';

const NEGOCIO: Negocio = { id: 'demo', nombre: 'Escuela de Cocina Sabores (demo)', nombresEtapas: { en_cierre: 'Inscrito', cliente: 'Matriculado' } };

const NOMBRES = ['María Quispe', 'José Huamán', 'Lucía Flores', 'Carlos Mendoza', 'Rosa Torres', 'Jorge Ramos', 'Ana Castillo',
  'Luis Vargas', 'Carmen Rojas', 'Miguel Chávez', 'Sofía Gutiérrez', 'Diego Paredes', 'Valeria Ríos', 'Andrés Salazar',
  'Gabriela Medina', 'Fernando Cruz', 'Patricia León', 'Ricardo Silva', 'Daniela Ortiz', 'Renzo Aguilar', 'Milagros Vega',
  'Kevin Romero', 'Fiorella Cárdenas', 'Bruno Espinoza', 'Camila Navarro', 'Óscar Delgado', 'Jimena Campos', 'Raúl Herrera',
  'Elena Sánchez', 'Mateo Villanueva', 'Pamela Cabrera', 'Hugo Palacios', 'Natalia Núñez', 'César Bustamante', 'Diana Peña',
  'Adrián Lozano', 'Karla Benites', 'Iván Zapata', 'Lorena Arias', 'Sebastián Soto', 'Paola Ibarra', 'Gustavo Rivas'];
const RESUMENES: Record<string, string> = {
  nuevo: 'Escribió por la publicidad de Facebook; todavía no responde.',
  conversando: 'Pregunta por horarios del curso de pastelería; trabaja de día.',
  sin_respuesta: 'Pidió precios del curso de cocina peruana y dejó de responder.',
  por_llamar: 'No respondió a los 4 recordatorios del bot.',
  quiere_comprar: 'Quiere inscribirse al curso de enero; pide cómo pagar.',
  en_cierre: 'Envió su DNI y reservó vacante; falta el primer pago.',
  cliente: 'Matriculado en el curso de pastelería de enero.',
  proximo: 'Le interesa para marzo; ahora no tiene tiempo.',
  cerrado: 'Dijo que el precio no le alcanza.',
};
const MOTIVOS = ['Precio', 'Precio', 'Tiempo', 'Horario', 'Otro curso', 'No indicó'];
const NIVEL_DE: Record<Etapa, Nivel[]> = {
  nuevo: ['sin_calificar'], conversando: ['evaluando', 'interesado', 'sin_calificar'], sin_respuesta: ['evaluando', 'interesado'],
  por_llamar: ['sin_calificar', 'evaluando'], quiere_comprar: ['superinteresado'], en_cierre: ['pre_inscrito'],
  cliente: ['matriculado'], proximo: ['interesado'], cerrado: ['no_interes'],
};
const REPARTO: Etapa[] = ['nuevo', 'nuevo', 'nuevo', 'conversando', 'conversando', 'conversando', 'conversando', 'sin_respuesta',
  'sin_respuesta', 'por_llamar', 'por_llamar', 'quiere_comprar', 'quiere_comprar', 'en_cierre', 'cliente', 'proximo', 'cerrado', 'cerrado'];

interface Fila { lead: LeadCrm; correo: string; datos: string; actividades: Actividad[]; mensajes: Mensaje[] }
const H = 3_600_000, D = 24 * H;

function sembrar(): Map<string, Fila> {
  let s = 7;
  const azar = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const elegir = <T,>(a: readonly T[]) => a[Math.floor(azar() * a.length)]!;
  const ahora = Date.now();
  const m = new Map<string, Fila>();
  for (let i = 0; i < 64; i++) {
    const etapa = i < 4 ? 'nuevo' : elegir(REPARTO);
    const nivel = elegir(NIVEL_DE[etapa]);
    const creado = i < 4 ? ahora - azar() * 6 * H : ahora - (1 + azar() * 25) * D;
    const nombre = NOMBRES[i % NOMBRES.length]!;
    const id = `demo-${i + 1}`;
    const visto = !(etapa === 'nuevo' && azar() < 0.7);
    const llamado = ['sin_respuesta', 'en_cierre', 'cliente', 'cerrado'].includes(etapa) && azar() < 0.5;
    const pos = etapa === 'proximo' ? ahora + 40 * D : azar() < 0.25 ? ahora + (azar() * 4 - 1.5) * D : null;
    const lead: LeadCrm = {
      id, nombre, telefono: `519${String(10000000 + Math.floor(azar() * 89999999))}`, etapa, nivel, visto,
      esPrueba: i === 63, pidePersona: etapa === 'quiere_comprar' && azar() < 0.5,
      resumen: RESUMENES[etapa]!, motivoNoInteres: etapa === 'cerrado' ? elegir(MOTIVOS) : '',
      origen: elegir(['whatsapp', 'whatsapp', 'formulario', 'facebook']),
      proximaAccion: pos ? (etapa === 'proximo' ? 'Escribirle para el inicio de marzo' : 'Confirmar si se inscribe') : '',
      proximoSeguimiento: pos, ultimaAtencion: etapa === 'nuevo' ? null : creado + H,
      ultimaLlamada: llamado ? creado + 2 * D : null, llamadas: llamado ? 1 : 0,
      ultimoIngreso: i === 5 ? ahora - 2 * H : null, creado,
    };
    const primer = nombre.split(' ')[0];
    const mensajes: Mensaje[] = [
      { id: `${id}-m1`, autor: 'lead', texto: 'Hola, quisiera información del curso 👋', creado: creado },
      ...(etapa === 'nuevo' ? [] : [
        { id: `${id}-m2`, autor: 'bot' as const, texto: `¡Hola ${primer}! 😊 Qué bueno que te animes a cocinar con nosotros. ¿Qué curso te interesa más: cocina peruana o pastelería?`, creado: creado + 60_000 },
        { id: `${id}-m3`, autor: 'lead' as const, texto: etapa === 'cerrado' ? 'Está muy caro para mí, gracias' : 'Pastelería. ¿Qué horarios tienen? Trabajo de día', creado: creado + 30 * 60_000 },
        { id: `${id}-m4`, autor: 'bot' as const, texto: 'Te entiendo, muchos de nuestros alumnos también trabajan 💪 Tenemos turno noche de 7 a 10 pm, lunes y miércoles.', creado: creado + 31 * 60_000 },
      ]),
    ];
    const actividades: Actividad[] = [
      { id: `${id}-a1`, tipo: 'lead_nuevo', origen: 'sistema', autor: 'Sistema', detalle: { origen: lead.origen }, creado },
      ...(nivel !== 'sin_calificar' ? [{ id: `${id}-a2`, tipo: 'cambio_nivel', origen: 'bot' as const, autor: 'Bot', detalle: { despues: nivel }, creado: creado + 31 * 60_000 }] : []),
    ];
    m.set(id, { lead, correo: azar() < 0.5 ? `${primer!.toLowerCase()}@correo.pe` : '', datos: '', actividades, mensajes });
  }
  return m;
}

// Se guarda en globalThis para sobrevivir a la recarga en caliente del modo desarrollo.
const g = globalThis as unknown as { __demoCrm?: Map<string, Fila> };
const datos = () => (g.__demoCrm ??= sembrar());
const fila = (id: string) => { const f = datos().get(id); if (!f) throw new Error('Lead no encontrado'); return f; };
const anotar = (f: Fila, tipo: string, detalle: Record<string, unknown>) =>
  f.actividades.push({ id: crypto.randomUUID(), tipo, origen: 'persona', autor: 'Tú (demo)', detalle, creado: Date.now() });

export const repoDemo: Repo = {
  modo: 'demo',
  async usuario() { return { email: 'demo@impulsia.pe' }; },
  async negocios() { return [NEGOCIO]; },
  async leads() { return [...datos().values()].map((f) => f.lead); },
  async detalle(_n, id) {
    const f = datos().get(id);
    return f ? { ...f, actividades: [...f.actividades].sort((a, b) => b.creado - a.creado) } satisfies LeadDetalle : null;
  },
  async marcarVisto(_n, id) { fila(id).lead.visto = true; },
  async moverEtapa(_n, id, etapa, motivo) {
    const f = fila(id);
    anotar(f, 'cambio_etapa', { antes: f.lead.etapa, despues: etapa, motivo });
    f.lead.etapa = etapa;
    f.lead.ultimaAtencion = Date.now();
    if (etapa === 'cerrado' && motivo) f.lead.motivoNoInteres = motivo;
    if (etapa === 'cerrado' || etapa === 'cliente') { f.lead.proximoSeguimiento = null; f.lead.proximaAccion = ''; }
  },
  async nota(_n, id, texto) { const f = fila(id); anotar(f, 'nota', { texto }); f.lead.ultimaAtencion = Date.now(); },
  async posponer(_n, id, cuando, accion) {
    const f = fila(id);
    f.lead.proximoSeguimiento = cuando; f.lead.proximaAccion = cuando ? accion : ''; f.lead.ultimaAtencion = Date.now();
    anotar(f, 'seguimiento', { cuando, accion });
  },
  async registrarLlamada(_n, id, resultado, nota) {
    const f = fila(id), ahora = Date.now(), c = trasLlamada(f.lead, resultado, ahora);
    anotar(f, 'llamada', { resultado: RESULTADOS_LLAMADA[resultado].nombre, nota });
    Object.assign(f.lead, { etapa: c.etapa, proximoSeguimiento: c.proximoSeguimiento, proximaAccion: c.proximaAccion,
      ultimaLlamada: ahora, ultimaAtencion: ahora, llamadas: f.lead.llamadas + 1, visto: true });
    if (c.motivoNoInteres) f.lead.motivoNoInteres = c.motivoNoInteres;
  },
  async nuevoLead(_n, d) {
    const id = `demo-${datos().size + 1}-${Date.now()}`;
    datos().set(id, {
      lead: { id, nombre: d.nombre, telefono: d.telefono.replace(/\D/g, ''), etapa: 'nuevo', nivel: 'sin_calificar', visto: true,
        esPrueba: false, pidePersona: false, resumen: '', motivoNoInteres: '', origen: d.origen, proximaAccion: '',
        proximoSeguimiento: null, ultimaAtencion: null, ultimaLlamada: null, llamadas: 0, ultimoIngreso: null, creado: Date.now() },
      correo: d.correo, datos: '', mensajes: [],
      actividades: [{ id: crypto.randomUUID(), tipo: 'lead_nuevo', origen: 'persona', autor: 'Tú (demo)', detalle: { origen: d.origen }, creado: Date.now() }],
    });
    return id;
  },
};

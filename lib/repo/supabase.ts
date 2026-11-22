/** Datos reales: Supabase con la sesión del usuario. RLS impide ver otros negocios. */
import { trasLlamada, RESULTADOS_LLAMADA, type Etapa, type LeadCrm, type Nivel } from '@/lib/crm';
import { supabaseServidor } from '@/lib/supabase';
import type { Actividad, Mensaje, Repo } from './tipos';

const ms = (x: string | null) => (x ? new Date(x).getTime() : null);
const iso = (x: number | null) => (x === null ? null : new Date(x).toISOString());

const CAMPOS = `id, etapa, nivel, visto, es_prueba, resumen, motivo_no_interes, origen, proxima_accion, proximo_seguimiento,
  ultima_atencion, ultima_llamada, llamadas, ultimo_ingreso, creado_en, datos,
  contactos(nombre, wa_id, correo), conversaciones(id, atiende)`;

type FilaLead = {
  id: string; etapa: Etapa; nivel: Nivel; visto: boolean; es_prueba: boolean; resumen: string; motivo_no_interes: string | null;
  origen: string; proxima_accion: string; proximo_seguimiento: string | null; ultima_atencion: string | null;
  ultima_llamada: string | null; llamadas: number; ultimo_ingreso: string | null; creado_en: string; datos: string;
  contactos: { nombre: string; wa_id: string | null; correo: string | null } | null;
  conversaciones: { id: string; atiende: string }[];
};

const aLead = (r: FilaLead): LeadCrm => ({
  id: r.id, nombre: r.contactos?.nombre ?? '', telefono: r.contactos?.wa_id ?? '', etapa: r.etapa, nivel: r.nivel,
  visto: r.visto, esPrueba: r.es_prueba, pidePersona: r.conversaciones.some((c) => c.atiende === 'persona'),
  resumen: r.resumen, motivoNoInteres: r.motivo_no_interes ?? '', origen: r.origen, proximaAccion: r.proxima_accion,
  proximoSeguimiento: ms(r.proximo_seguimiento), ultimaAtencion: ms(r.ultima_atencion), ultimaLlamada: ms(r.ultima_llamada),
  llamadas: r.llamadas, ultimoIngreso: ms(r.ultimo_ingreso), creado: ms(r.creado_en)!,
});

function comprobar<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

async function actividad(negocioId: string, leadId: string, tipo: string, detalle: Record<string, unknown>) {
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  comprobar(await sb.from('actividades').insert({ negocio_id: negocioId, lead_id: leadId, usuario_id: data.user?.id, origen: 'persona', tipo, detalle }));
}

async function actualizar(negocioId: string, leadId: string, cambios: Record<string, unknown>) {
  const sb = await supabaseServidor();
  comprobar(await sb.from('leads').update(cambios).eq('negocio_id', negocioId).eq('id', leadId));
}

export const repoSupabase: Repo = {
  modo: 'supabase',
  async usuario() {
    const { data } = await (await supabaseServidor()).auth.getUser();
    return data.user ? { email: data.user.email ?? '' } : null;
  },
  async negocios() {
    const sb = await supabaseServidor();
    const filas = comprobar(await sb.from('negocios').select('id, nombre, fichas(nombres_etapas)').order('nombre'));
    return (filas as unknown as { id: string; nombre: string; fichas: { nombres_etapas: Record<string, string> } | null }[])
      .map((n) => ({ id: n.id, nombre: n.nombre, nombresEtapas: n.fichas?.nombres_etapas ?? {} }));
  },
  async leads(negocioId) {
    const sb = await supabaseServidor();
    const filas = comprobar(await sb.from('leads').select(CAMPOS).eq('negocio_id', negocioId).order('creado_en', { ascending: false }).limit(5000));
    return (filas as unknown as FilaLead[]).map(aLead);
  },
  async detalle(negocioId, leadId) {
    const sb = await supabaseServidor();
    const r = comprobar(await sb.from('leads').select(CAMPOS).eq('negocio_id', negocioId).eq('id', leadId).maybeSingle()) as unknown as FilaLead | null;
    if (!r) return null;
    const acts = comprobar(await sb.from('actividades').select('id, tipo, origen, detalle, creado_en, usuario_id')
      .eq('lead_id', leadId).order('creado_en', { ascending: false }).limit(200)) as { id: string; tipo: string; origen: Actividad['origen']; detalle: Record<string, unknown>; creado_en: string }[];
    const convId = r.conversaciones[0]?.id;
    const msgs = convId
      ? comprobar(await sb.from('mensajes').select('id, autor, texto, creado_en').eq('conversacion_id', convId)
          .neq('direccion', 'interna').order('creado_en').limit(300)) as { id: string; autor: Mensaje['autor']; texto: string; creado_en: string }[]
      : [];
    return {
      lead: aLead(r), correo: r.contactos?.correo ?? '', datos: r.datos,
      actividades: acts.map((a) => ({ id: a.id, tipo: a.tipo, origen: a.origen, autor: a.origen === 'bot' ? 'Bot' : a.origen === 'sistema' ? 'Sistema' : 'Equipo', detalle: a.detalle, creado: ms(a.creado_en)! })),
      mensajes: msgs.map((m) => ({ id: m.id, autor: m.autor, texto: m.texto, creado: ms(m.creado_en)! })),
    };
  },
  async marcarVisto(negocioId, leadId) { await actualizar(negocioId, leadId, { visto: true }); },
  async moverEtapa(negocioId, leadId, etapa, motivo) {
    const sb = await supabaseServidor();
    const antes = comprobar(await sb.from('leads').select('etapa').eq('id', leadId).single()) as { etapa: Etapa };
    const fin = etapa === 'cerrado' || etapa === 'cliente';
    await actualizar(negocioId, leadId, {
      etapa, ultima_atencion: new Date().toISOString(),
      ...(etapa === 'cerrado' && motivo ? { motivo_no_interes: motivo } : {}),
      ...(fin ? { proximo_seguimiento: null, proxima_accion: '' } : {}),
    });
    await actividad(negocioId, leadId, 'cambio_etapa', { antes: antes.etapa, despues: etapa, motivo });
  },
  async nota(negocioId, leadId, texto) {
    await actividad(negocioId, leadId, 'nota', { texto });
    await actualizar(negocioId, leadId, { ultima_atencion: new Date().toISOString() });
  },
  async posponer(negocioId, leadId, cuando, accion) {
    await actualizar(negocioId, leadId, { proximo_seguimiento: iso(cuando), proxima_accion: cuando ? accion : '', ultima_atencion: new Date().toISOString() });
    await actividad(negocioId, leadId, 'seguimiento', { cuando: iso(cuando), accion });
  },
  async registrarLlamada(negocioId, leadId, resultado, nota) {
    const sb = await supabaseServidor();
    const l = comprobar(await sb.from('leads').select('etapa, llamadas').eq('id', leadId).single()) as { etapa: Etapa; llamadas: number };
    const ahora = Date.now(), c = trasLlamada(l, resultado, ahora);
    await actualizar(negocioId, leadId, {
      etapa: c.etapa, proximo_seguimiento: iso(c.proximoSeguimiento), proxima_accion: c.proximaAccion, visto: true,
      ultima_llamada: iso(ahora), ultima_atencion: iso(ahora), llamadas: l.llamadas + 1,
      ...(c.motivoNoInteres ? { motivo_no_interes: c.motivoNoInteres } : {}),
    });
    await actividad(negocioId, leadId, 'llamada', { resultado: RESULTADOS_LLAMADA[resultado].nombre, nota });
  },
  async nuevoLead(negocioId, d) {
    const sb = await supabaseServidor();
    const wa = d.telefono.replace(/\D/g, '') || null;
    const contacto = comprobar(await sb.from('contactos')
      .upsert({ negocio_id: negocioId, wa_id: wa, nombre: d.nombre, correo: d.correo || null }, { onConflict: 'negocio_id,wa_id' })
      .select('id').single()) as { id: string };
    const lead = comprobar(await sb.from('leads').insert({ negocio_id: negocioId, contacto_id: contacto.id, origen: d.origen, visto: true })
      .select('id').single()) as { id: string };
    await actividad(negocioId, lead.id, 'lead_nuevo', { origen: d.origen });
    return lead.id;
  },
};

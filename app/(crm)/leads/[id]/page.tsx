import Link from 'next/link';
import { notFound } from 'next/navigation';
import { agendar, agregarNota, moverEtapa, registrarLlamada } from '@/app/acciones';
import { PillEtapa, PillTemp } from '@/app/componentes';
import { ETAPAS, RESULTADOS_LLAMADA, nombreEtapa, porQueAtender, type Etapa } from '@/lib/crm';
import { ORIGENES, aInputLima, cuando, telefono } from '@/lib/formato';
import { contexto } from '@/lib/repo';
import type { Actividad } from '@/lib/repo/tipos';

function textoActividad(a: Actividad, nombres: Partial<Record<Etapa, string>>): string {
  const d = a.detalle as Record<string, string | null>;
  switch (a.tipo) {
    case 'nota': return `📝 ${d.texto}`;
    case 'llamada': return `📞 ${d.resultado}${d.nota ? ` — ${d.nota}` : ''}`;
    case 'cambio_etapa': return `➡️ Pasó de ${nombreEtapa(d.antes as Etapa, nombres)} a ${nombreEtapa(d.despues as Etapa, nombres)}${d.motivo ? ` (${d.motivo})` : ''}`;
    case 'cambio_nivel': return `🤖 El bot lo calificó como ${String(d.despues).replace('_', ' ')}`;
    case 'seguimiento': return d.cuando ? `⏱ Seguimiento agendado: ${d.accion}` : '⏱ Quitó el seguimiento';
    case 'lead_nuevo': return `✨ Llegó por ${ORIGENES[String(d.origen)] ?? d.origen}`;
    case 'pasar_a_persona': return `🙋 El bot pasó el chat a una persona${d.motivo ? `: ${d.motivo}` : ''}`;
    default: return a.tipo;
  }
}

export default async function FichaLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo, negocio } = await contexto();
  const d = await repo.detalle(negocio.id, id);
  if (!d) notFound();
  if (!d.lead.visto) await repo.marcarVisto(negocio.id, id);
  const l = d.lead, ahora = Date.now();
  const n = negocio.nombresEtapas;
  const wa = l.telefono.replace(/\D/g, '');

  return (
    <>
      <header className="cabecera">
        <div>
          <Link href="/leads" className="enlace">← Leads</Link>
          <h1>{l.nombre || '(sin nombre)'}</h1>
          <p className="fila-pills"><PillEtapa etapa={l.etapa} nombres={n} /><PillTemp lead={l} />{l.esPrueba && <span className="pill gris">Prueba</span>}</p>
        </div>
        <div className="acciones">
          {wa && <a className="boton" href={`tel:+${wa}`}>📞 Llamar</a>}
          {wa && <a className="boton" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>}
        </div>
      </header>

      <div className="rejilla ficha">
        <div className="pila">
          <section className="tarjeta">
            <h2>Datos</h2>
            <dl className="datos">
              <dt>Celular</dt><dd>{telefono(l.telefono)}</dd>
              <dt>Correo</dt><dd>{d.correo || '—'}</dd>
              <dt>Canal</dt><dd>{ORIGENES[l.origen] ?? l.origen}</dd>
              <dt>Llegó</dt><dd>{cuando(l.creado, ahora)}</dd>
              <dt>Llamadas</dt><dd>{l.llamadas ? `${l.llamadas} · última ${cuando(l.ultimaLlamada, ahora)}` : 'Ninguna'}</dd>
              {l.motivoNoInteres && <><dt>No le interesa por</dt><dd>{l.motivoNoInteres}</dd></>}
            </dl>
            {l.resumen && <p className="resumen"><b>Resumen del bot:</b> {l.resumen}</p>}
            {d.datos && <p className="resumen"><b>Lo que contó:</b> {d.datos}</p>}
          </section>

          <section className="tarjeta">
            <h2>Etapa</h2>
            <p className="ayuda">{ETAPAS.find((e) => e.id === l.etapa)!.ayuda}. Ahora: {porQueAtender(l, ahora).replace(/\.$/, '')}.</p>
            <form action={moverEtapa} className="en-linea">
              <input type="hidden" name="lead" value={l.id} />
              <select name="etapa" className="campo" defaultValue={l.etapa}>
                {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.orden <= 7 ? `${e.orden}. ` : ''}{nombreEtapa(e.id, n)}</option>)}
              </select>
              <input name="motivo" className="campo" placeholder="Motivo (si lo cierras)" />
              <button className="boton primario">Mover</button>
            </form>
          </section>

          <section className="tarjeta">
            <h2>Próximo seguimiento</h2>
            <p className="ayuda">{l.proximoSeguimiento ? <>Agendado para <b>{cuando(l.proximoSeguimiento, ahora)}</b>: {l.proximaAccion}</> : 'Sin seguimiento agendado.'}</p>
            <form action={agendar} className="pila">
              <input type="hidden" name="lead" value={l.id} />
              <input name="accion" className="campo" placeholder="¿Qué hay que hacer? Ej.: confirmar el pago" defaultValue={l.proximaAccion} />
              <div className="en-linea">
                <button className="boton chico" name="dias" value="1">Mañana</button>
                <button className="boton chico" name="dias" value="3">En 3 días</button>
                <button className="boton chico" name="dias" value="7">En 1 semana</button>
                <input type="datetime-local" name="cuando" className="campo" defaultValue={aInputLima(l.proximoSeguimiento ?? ahora + 86_400_000)} />
                <button className="boton chico primario">Agendar</button>
                {l.proximoSeguimiento && <button className="boton chico" name="quitar" value="1">Quitar</button>}
              </div>
            </form>
          </section>

          <section className="tarjeta">
            <h2>Registrar llamada</h2>
            <form action={registrarLlamada} className="pila">
              <input type="hidden" name="lead" value={l.id} />
              <textarea name="nota" className="campo" rows={2} placeholder="¿Qué te dijo? (opcional)" />
              <div className="resultados">
                {Object.entries(RESULTADOS_LLAMADA).map(([k, r]) => <button key={k} className="boton chico" name="resultado" value={k}>{r.nombre}</button>)}
              </div>
            </form>
          </section>

          <section className="tarjeta">
            <h2>Historial</h2>
            <form action={agregarNota} className="pila">
              <input type="hidden" name="lead" value={l.id} />
              <textarea name="texto" className="campo" rows={2} placeholder="Escribe una nota para el equipo" required />
              <button className="boton chico primario derecha">Guardar nota</button>
            </form>
            <ul className="historial">
              {d.actividades.map((a) => (
                <li key={a.id}><span>{textoActividad(a, n)}</span><small>{a.autor} · {cuando(a.creado, ahora)}</small></li>
              ))}
            </ul>
          </section>
        </div>

        <section className="tarjeta chat">
          <h2>Conversación</h2>
          {d.mensajes.length ? (
            <div className="burbujas">
              {d.mensajes.map((m) => (
                <div key={m.id} className={`burbuja ${m.autor}`}>
                  <small>{m.autor === 'lead' ? l.nombre.split(' ')[0] || 'Lead' : m.autor === 'bot' ? '🤖 Bot' : m.autor === 'persona' ? 'Equipo' : 'Sistema'} · {cuando(m.creado, ahora)}</small>
                  <p>{m.texto}</p>
                </div>
              ))}
            </div>
          ) : <p className="ayuda">Todavía no hay mensajes de WhatsApp con este lead.</p>}
          <p className="ayuda pie-chat">La bandeja para responder desde aquí llega en la siguiente fase.</p>
        </section>
      </div>
    </>
  );
}

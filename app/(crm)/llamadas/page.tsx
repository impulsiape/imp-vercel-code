import Link from 'next/link';
import { registrarLlamada } from '@/app/acciones';
import { Chips, NombreLead, PillGrupo, Vacio } from '@/app/componentes';
import { GRUPOS_LLAMADA, RESULTADOS_LLAMADA, colaLlamadas, grupoLlamada, inicioDelDia, type LeadCrm } from '@/lib/crm';
import { cuando, telefono } from '@/lib/formato';
import { contexto, leadsDe } from '@/lib/repo';

export default async function Llamadas({ searchParams }: { searchParams: Promise<{ lista?: string; g?: string }> }) {
  const { lista = 'ahora', g = '' } = await searchParams;
  const { negocio } = await contexto();
  const ahora = Date.now(), hoy0 = inicioDelDia(ahora);
  const leads = (await leadsDe(negocio.id)).filter((l) => !l.esPrueba);
  const listas: Record<string, LeadCrm[]> = {
    ahora: colaLlamadas(leads, ahora),
    prog: leads.filter((l) => grupoLlamada(l, ahora) && (l.proximoSeguimiento ?? 0) > ahora).sort((a, b) => a.proximoSeguimiento! - b.proximoSeguimiento!),
    hoy: leads.filter((l) => (l.ultimaLlamada ?? 0) >= hoy0).sort((a, b) => b.ultimaLlamada! - a.ultimaLlamada!),
  };
  const base = listas[lista] ?? listas.ahora!;
  const filas = g ? base.filter((l) => String(grupoLlamada(l, ahora)) === g) : base;
  const siguiente = lista === 'ahora' ? filas[0] : undefined;

  return (
    <>
      <header className="cabecera"><div><h1>Llamadas</h1><p>Primero los que quieren comprar, luego interesados, los que no respondieron el WhatsApp y los nuevos. Al registrar la llamada, el lead sale de la cola hasta su próxima fecha.</p></div></header>

      {siguiente && (
        <section className="tarjeta llamada-actual">
          <div className="quien">
            <small>Siguiente llamada</small>
            <h2><Link href={`/leads/${siguiente.id}`}>{siguiente.nombre || '(sin nombre)'}</Link></h2>
            <a className="numero" href={`tel:+${siguiente.telefono}`}>{telefono(siguiente.telefono)}</a>
            <p><PillGrupo grupo={grupoLlamada(siguiente, ahora)} /></p>
            {siguiente.resumen && <p className="ayuda">{siguiente.resumen}</p>}
          </div>
          <form action={registrarLlamada} className="pila">
            <input type="hidden" name="lead" value={siguiente.id} />
            <input type="hidden" name="volver" value="/llamadas" />
            <textarea name="nota" className="campo" rows={2} placeholder="¿Qué te dijo? (opcional)" />
            <div className="resultados">
              {Object.entries(RESULTADOS_LLAMADA).map(([k, r]) => <button key={k} className="boton chico" name="resultado" value={k}>{r.nombre}</button>)}
            </div>
          </form>
        </section>
      )}

      <div className="barra-herramientas">
        <Chips base="/llamadas" param="lista" valor={lista} otros={{ g }} opciones={[
          { v: 'ahora', t: 'Por llamar ahora', n: listas.ahora!.length }, { v: 'prog', t: 'Programadas', n: listas.prog!.length }, { v: 'hoy', t: 'Llamadas de hoy', n: listas.hoy!.length },
        ]} />
      </div>
      <div className="barra-herramientas">
        <Chips base="/llamadas" param="g" valor={g} otros={{ lista }} opciones={[
          { v: '', t: 'Todos los grupos' },
          ...Object.entries(GRUPOS_LLAMADA).map(([k, x]) => ({ v: k, t: `${k}. ${x.nombre}`, c: x.color, n: base.filter((l) => String(grupoLlamada(l, ahora)) === k).length })),
        ]} />
      </div>
      <div className="tarjeta tabla-caja">
        {filas.length ? (
          <table className="tabla">
            <thead><tr><th>#</th><th>Lead</th><th className="m">Grupo</th><th className="m">Llamadas</th><th className="m">Próxima</th></tr></thead>
            <tbody>
              {filas.slice(0, 300).map((l, i) => (
                <tr key={l.id}>
                  <td className="tenue">{i + 1}</td>
                  <td><NombreLead lead={l} /></td>
                  <td className="m"><PillGrupo grupo={grupoLlamada(l, ahora)} /></td>
                  <td className="m">{l.llamadas ? <>{l.llamadas} <small className="tenue">· {cuando(l.ultimaLlamada, ahora)}</small></> : <span className="tenue">Ninguna</span>}</td>
                  <td className="m">{l.proximoSeguimiento ? <>{cuando(l.proximoSeguimiento, ahora)}<small className="tenue bloque">{l.proximaAccion}</small></> : <span className="tenue">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vacio>{lista === 'ahora' ? '¡Listo! No hay llamadas pendientes por ahora.' : 'No hay leads en esta lista.'}</Vacio>}
      </div>
    </>
  );
}

import { crearLead } from '@/app/acciones';
import { Chips, NombreLead, PillEtapa, PillTemp, Vacio } from '@/app/componentes';
import { inicioDelDia, reingresoPendiente } from '@/lib/crm';
import { ORIGENES, cuando, hace } from '@/lib/formato';
import { contexto, leadsDe } from '@/lib/repo';

const DIA = 86_400_000;

export default async function IngresaronHoy({ searchParams }: { searchParams: Promise<{ per?: string; error?: string }> }) {
  const { per = 'hoy', error } = await searchParams;
  const { negocio } = await contexto();
  const ahora = Date.now(), hoy0 = inicioDelDia(ahora);
  const [desde, hasta] = per === 'ayer' ? [hoy0 - DIA, hoy0] : per === '7d' ? [hoy0 - 6 * DIA, Infinity] : [hoy0, Infinity];
  const llegada = (l: { creado: number; ultimoIngreso: number | null }) => Math.max(l.creado, l.ultimoIngreso ?? 0);
  const lista = (await leadsDe(negocio.id)).filter((l) => !l.esPrueba && llegada(l) >= desde && llegada(l) < hasta)
    .sort((a, b) => llegada(b) - llegada(a));

  return (
    <>
      <header className="cabecera"><div><h1>Ingresaron hoy</h1><p>Los leads que llegaron, por cualquier canal.</p></div></header>
      <div className="barra-herramientas">
        <Chips base="/hoy" param="per" valor={per} opciones={[{ v: 'hoy', t: 'Hoy' }, { v: 'ayer', t: 'Ayer' }, { v: '7d', t: 'Últimos 7 días' }]} />
        <details className="desplegable">
          <summary className="boton primario">+ Registrar lead</summary>
          <form action={crearLead} className="tarjeta formulario">
            {error && <p className="aviso-error">Falta el nombre o el celular (9 dígitos).</p>}
            <label>Nombre<input className="campo" name="nombre" required /></label>
            <label>Celular<input className="campo" name="telefono" required inputMode="tel" placeholder="987 654 321" /></label>
            <label>Correo (opcional)<input className="campo" name="correo" type="email" /></label>
            <label>¿Por dónde llegó?
              <select className="campo" name="origen" defaultValue="manual">
                {Object.entries(ORIGENES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <button className="boton primario">Guardar y abrir ficha</button>
          </form>
        </details>
      </div>
      <div className="tarjeta tabla-caja">
        {lista.length ? (
          <table className="tabla">
            <thead><tr><th>Llegó</th><th>Lead</th><th className="m">Canal</th><th>Interés</th><th className="m">Etapa</th></tr></thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id} className={l.visto ? '' : 'resalta'}>
                  <td className="nowrap">{cuando(llegada(l), ahora)}<small className="tenue bloque">{hace(llegada(l), ahora)}</small></td>
                  <td><NombreLead lead={l} extra={reingresoPendiente(l) ? <> · 🔁 Volvió</> : null} /></td>
                  <td className="m">{ORIGENES[l.origen] ?? l.origen}</td>
                  <td><PillTemp lead={l} /></td>
                  <td className="m"><PillEtapa etapa={l.etapa} nombres={negocio.nombresEtapas} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vacio>No ingresaron leads {per === 'hoy' ? 'hoy' : per === 'ayer' ? 'ayer' : 'en los últimos 7 días'}.</Vacio>}
      </div>
    </>
  );
}

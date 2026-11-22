import Link from 'next/link';
import { Chips, NombreLead, PillEtapa, PillTemp, Vacio } from '@/app/componentes';
import { ETAPAS, TEMPERATURAS, nombreEtapa, temperatura } from '@/lib/crm';
import { ORIGENES, cuando } from '@/lib/formato';
import { contexto, leadsDe } from '@/lib/repo';

const POR_PAGINA = 50;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default async function Leads({ searchParams }: { searchParams: Promise<{ etapa?: string; temp?: string; ver?: string; q?: string; p?: string }> }) {
  const { etapa = '', temp = '', ver = '', q = '', p = '0' } = await searchParams;
  const { negocio } = await contexto();
  const ahora = Date.now();
  const todos = await leadsDe(negocio.id);
  const busca = norm(q.trim()), dig = q.replace(/\D/g, '');
  const lista = todos.filter((l) =>
    (!etapa || l.etapa === etapa) && (!temp || temperatura(l) === temp) &&
    (ver !== 'nuevos' || !l.visto) && (ver !== 'pospuestos' || (l.proximoSeguimiento ?? 0) > ahora) &&
    (ver === 'pruebas' ? l.esPrueba : !l.esPrueba) &&
    (!busca || norm(l.nombre).includes(busca) || (dig.length >= 3 && l.telefono.includes(dig))));
  const pag = Math.max(0, Number(p) || 0);
  const otros = { etapa, temp, ver, q };
  const enlace = (n: number) => `/leads?${new URLSearchParams(Object.entries({ ...otros, p: String(n) }).filter(([, v]) => v)).toString()}`;

  return (
    <>
      <header className="cabecera"><div><h1>Leads</h1><p>{lista.length} de {todos.filter((l) => !l.esPrueba).length} leads.</p></div></header>
      <form className="barra-herramientas" action="/leads">
        <input className="campo busca" name="q" defaultValue={q} placeholder="Buscar por nombre o celular" />
        <select className="campo" name="etapa" defaultValue={etapa}>
          <option value="">Todas las etapas</option>
          {ETAPAS.map((e) => <option key={e.id} value={e.id}>{nombreEtapa(e.id, negocio.nombresEtapas)}</option>)}
        </select>
        <select className="campo" name="temp" defaultValue={temp}>
          <option value="">Toda temperatura</option>
          {Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
        </select>
        {ver && <input type="hidden" name="ver" value={ver} />}
        <button className="boton">Filtrar</button>
        {(etapa || temp || q || ver) && <Link href="/leads" className="enlace">Limpiar</Link>}
      </form>
      <div className="barra-herramientas">
        <Chips base="/leads" param="ver" valor={ver} otros={{ etapa, temp, q }} opciones={[
          { v: '', t: 'Todos' }, { v: 'nuevos', t: 'Nuevos sin abrir' }, { v: 'pospuestos', t: 'Con seguimiento agendado' }, { v: 'pruebas', t: 'Pruebas' },
        ]} />
      </div>
      <div className="tarjeta tabla-caja">
        {lista.length ? (
          <table className="tabla">
            <thead><tr><th>Lead</th><th>Etapa</th><th className="m">Interés</th><th className="m">Canal</th><th className="m">Próximo seguimiento</th><th className="m">Llegó</th></tr></thead>
            <tbody>
              {lista.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA).map((l) => (
                <tr key={l.id} className={l.visto ? '' : 'resalta'}>
                  <td><NombreLead lead={l} /></td>
                  <td><PillEtapa etapa={l.etapa} nombres={negocio.nombresEtapas} /></td>
                  <td className="m"><PillTemp lead={l} /></td>
                  <td className="m">{ORIGENES[l.origen] ?? l.origen}</td>
                  <td className="m">{l.proximoSeguimiento ? <>{cuando(l.proximoSeguimiento, ahora)}<small className="tenue bloque">{l.proximaAccion}</small></> : <span className="tenue">—</span>}</td>
                  <td className="m nowrap">{cuando(l.creado, ahora)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vacio>No hay leads con estos filtros.</Vacio>}
        {lista.length > POR_PAGINA && (
          <div className="paginas">
            {pag > 0 ? <Link href={enlace(pag - 1)} className="boton chico">← Anteriores</Link> : <span />}
            <span className="tenue">{pag * POR_PAGINA + 1}–{Math.min(lista.length, (pag + 1) * POR_PAGINA)} de {lista.length}</span>
            {(pag + 1) * POR_PAGINA < lista.length ? <Link href={enlace(pag + 1)} className="boton chico">Siguientes →</Link> : <span />}
          </div>
        )}
      </div>
    </>
  );
}

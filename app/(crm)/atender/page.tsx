import Link from 'next/link';
import { Chips, NombreLead, PillTemp, Vacio } from '@/app/componentes';
import { TEMPERATURAS, colaAtencion, porQueAtender, rangoAtencion } from '@/lib/crm';
import { cuando, hace } from '@/lib/formato';
import { contexto, leadsDe } from '@/lib/repo';

const RANGOS = [
  { v: '1', t: 'En cierre', c: '#0EA5E9' },
  { v: '2', t: TEMPERATURAS.super.nombre, c: TEMPERATURAS.super.color },
  { v: '3', t: TEMPERATURAS.caliente.nombre, c: TEMPERATURAS.caliente.color },
  { v: '4', t: TEMPERATURAS.tibio.nombre, c: TEMPERATURAS.tibio.color },
  { v: '5', t: TEMPERATURAS.frio.nombre, c: TEMPERATURAS.frio.color },
];

export default async function PorAtender({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g = '' } = await searchParams;
  const { negocio } = await contexto();
  const ahora = Date.now();
  const cola = colaAtencion(await leadsDe(negocio.id), ahora);
  const lista = g ? cola.filter((l) => String(rangoAtencion(l)) === g) : cola;
  const n = (v: string) => cola.filter((l) => String(rangoAtencion(l)) === v).length;

  return (
    <>
      <header className="cabecera"><div><h1>Por atender</h1><p>Atiende de arriba hacia abajo: primero los de más interés y, en cada nivel, el que llegó antes. Al terminar, agéndale el próximo seguimiento y sale de la cola hasta esa fecha.</p></div></header>
      <div className="barra-herramientas">
        <Chips base="/atender" param="g" valor={g} opciones={[{ v: '', t: 'Todos', n: cola.length }, ...RANGOS.filter((r) => n(r.v)).map((r) => ({ ...r, n: n(r.v) }))]} />
      </div>
      <div className="tarjeta tabla-caja">
        {lista.length ? (
          <table className="tabla">
            <thead><tr><th>#</th><th>Lead</th><th>Interés</th><th className="m">Llegó</th><th className="m">Por qué atenderlo</th><th /></tr></thead>
            <tbody>
              {lista.slice(0, 300).map((l, i) => (
                <tr key={l.id} className={l.visto ? '' : 'resalta'}>
                  <td className="tenue">{i + 1}</td>
                  <td><NombreLead lead={l} /></td>
                  <td><PillTemp lead={l} /></td>
                  <td className="m nowrap">{cuando(Math.max(l.creado, l.ultimoIngreso ?? 0), ahora)}<small className="tenue bloque">{hace(l.creado, ahora)}</small></td>
                  <td className="m porque">{porQueAtender(l, ahora)}</td>
                  <td><Link className="boton chico primario" href={`/leads/${l.id}`}>Atender</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vacio>🎉 No hay leads por atender ahora.</Vacio>}
      </div>
    </>
  );
}

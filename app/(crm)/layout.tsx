import { colaAtencion, colaLlamadas, inicioDelDia } from '@/lib/crm';
import { elegirNegocio, salir } from '@/app/acciones';
import { Logo } from '@/app/componentes';
import { Menu } from '@/app/menu';
import { contexto, leadsDe } from '@/lib/repo';

export default async function LayoutCrm({ children }: { children: React.ReactNode }) {
  const { repo, negocio, negocios, email } = await contexto();
  const leads = (await leadsDe(negocio.id)).filter((l) => !l.esPrueba);
  const ahora = Date.now(), hoy0 = inicioDelDia(ahora);
  const cuentas = {
    hoy: leads.filter((l) => Math.max(l.creado, l.ultimoIngreso ?? 0) >= hoy0).length,
    atender: colaAtencion(leads, ahora).length,
    leads: leads.filter((l) => !l.visto).length,
    llamadas: colaLlamadas(leads, ahora).length,
  };
  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca"><Logo claro /></div>
        {negocios.length > 1 ? (
          <form action={elegirNegocio} className="negocio">
            <select name="negocio" defaultValue={negocio.id} className="campo oscuro">
              {negocios.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
            <button className="boton chico">Cambiar</button>
          </form>
        ) : <div className="negocio solo">{negocio.nombre}</div>}
        <Menu cuentas={cuentas} />
        <div className="pie">
          <small>Conectado como</small><b>{email}</b>
          {repo.modo === 'supabase' && <form action={salir}><button className="enlace">Salir</button></form>}
        </div>
      </aside>
      <div className="principal">
        {repo.modo === 'demo' && (
          <div className="banda-demo">Modo demo: datos de un negocio ficticio. Los cambios se borran al reiniciar el servidor.</div>
        )}
        {children}
      </div>
    </div>
  );
}

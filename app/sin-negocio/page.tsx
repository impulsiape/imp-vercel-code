import { salir } from '@/app/acciones';
import { Logo } from '@/app/componentes';

export default function SinNegocio() {
  return (
    <main className="acceso">
      <div className="tarjeta acceso-caja">
        <Logo />
        <h1>Aún no tienes un negocio asignado</h1>
        <p>Pide a la persona dueña del negocio en Impulsia que te agregue a su equipo. Luego vuelve a entrar.</p>
        <form action={salir}><button className="boton">Salir</button></form>
      </div>
    </main>
  );
}

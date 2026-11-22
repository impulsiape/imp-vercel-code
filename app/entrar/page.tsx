import { redirect } from 'next/navigation';
import { entrar } from '@/app/acciones';
import { Logo } from '@/app/componentes';
import { supabaseConfigurado } from '@/lib/supabase';

export const metadata = { title: 'Entrar · Impulsia' };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ enviado?: string; error?: string }> }) {
  if (!supabaseConfigurado()) redirect('/');
  const { enviado, error } = await searchParams;
  return (
    <main className="acceso">
      <div className="tarjeta acceso-caja">
        <Logo />
        {enviado ? (
          <>
            <h1>Revisa tu correo 📬</h1>
            <p>Te enviamos un enlace a <b>{enviado}</b>. Ábrelo desde este mismo navegador para entrar.</p>
          </>
        ) : (
          <>
            <h1>Entra a tu CRM</h1>
            <p>Escribe tu correo y te enviamos un enlace para entrar, sin contraseña.</p>
            {error && <p className="aviso-error">{error === 'enlace' ? 'El enlace venció o ya se usó. Pide otro.' : 'No pudimos enviar el enlace. ¿Tu correo está registrado en el equipo?'}</p>}
            <form action={entrar} className="pila">
              <input className="campo" type="email" name="correo" required placeholder="tu@correo.com" autoComplete="email" />
              <button className="boton primario grande">Enviarme el enlace</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const supabaseConfigurado = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Cliente de Supabase con la sesión del usuario (RLS decide qué puede ver). */
export async function supabaseServidor() {
  const almacen = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try { lista.forEach(({ name, value, options }) => almacen.set(name, value, options)); }
        catch { /* en un Server Component no se pueden escribir cookies; el proxy ya refrescó la sesión */ }
      },
    },
  });
}

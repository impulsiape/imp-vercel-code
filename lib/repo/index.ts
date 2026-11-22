import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseConfigurado } from '@/lib/supabase';
import { repoDemo } from './demo';
import { repoSupabase } from './supabase';
import type { Negocio, Repo } from './tipos';

export type { Repo, Negocio } from './tipos';

/** Sin variables de Supabase el CRM abre en modo demo. */
export const obtenerRepo = (): Repo => (supabaseConfigurado() ? repoSupabase : repoDemo);

/** El negocio con el que se está trabajando (cookie "negocio"); si no hay, el primero del usuario. */
export const contexto = cache(async (): Promise<{ repo: Repo; negocio: Negocio; negocios: Negocio[]; email: string }> => {
  const repo = obtenerRepo();
  const usuario = await repo.usuario();
  if (!usuario) redirect('/entrar');
  const negocios = await repo.negocios();
  if (!negocios.length) redirect('/sin-negocio');
  const elegido = (await cookies()).get('negocio')?.value;
  const negocio = negocios.find((n) => n.id === elegido) ?? negocios[0]!;
  return { repo, negocio, negocios, email: usuario.email };
});

/** Los leads del negocio, leídos una sola vez por página aunque los pidan el menú y la pantalla. */
export const leadsDe = cache((negocioId: string) => obtenerRepo().leads(negocioId));

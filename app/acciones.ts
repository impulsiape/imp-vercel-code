'use server';
/** Lo que el equipo hace desde el CRM. Cada acción guarda y refresca las pantallas. */
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ETAPAS, RESULTADOS_LLAMADA, type Etapa, type ResultadoLlamada } from '@/lib/crm';
import { deInputLima } from '@/lib/formato';
import { contexto } from '@/lib/repo';
import { supabaseConfigurado, supabaseServidor } from '@/lib/supabase';

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const listo = () => revalidatePath('/', 'layout');

export async function elegirNegocio(f: FormData) {
  (await cookies()).set('negocio', txt(f, 'negocio'), { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  listo();
  redirect('/');
}

export async function moverEtapa(f: FormData) {
  const { repo, negocio } = await contexto();
  const etapa = txt(f, 'etapa') as Etapa;
  if (!ETAPAS.some((e) => e.id === etapa)) throw new Error('Etapa no válida');
  await repo.moverEtapa(negocio.id, txt(f, 'lead'), etapa, txt(f, 'motivo'));
  listo();
}

export async function agregarNota(f: FormData) {
  const texto = txt(f, 'texto');
  if (!texto) return;
  const { repo, negocio } = await contexto();
  await repo.nota(negocio.id, txt(f, 'lead'), texto.slice(0, 2000));
  listo();
}

export async function agendar(f: FormData) {
  const { repo, negocio } = await contexto();
  const dias = Number(txt(f, 'dias'));
  const cuando = txt(f, 'quitar') ? null : dias > 0 ? Date.now() + dias * 86_400_000 : deInputLima(txt(f, 'cuando'));
  if (cuando === null && !txt(f, 'quitar')) return;
  await repo.posponer(negocio.id, txt(f, 'lead'), cuando, txt(f, 'accion') || 'Hacer seguimiento');
  listo();
}

export async function registrarLlamada(f: FormData) {
  const { repo, negocio } = await contexto();
  const resultado = txt(f, 'resultado') as ResultadoLlamada;
  if (!(resultado in RESULTADOS_LLAMADA)) throw new Error('Resultado no válido');
  await repo.registrarLlamada(negocio.id, txt(f, 'lead'), resultado, txt(f, 'nota').slice(0, 2000));
  listo();
  if (txt(f, 'volver')) redirect(txt(f, 'volver'));
}

export async function crearLead(f: FormData) {
  const nombre = txt(f, 'nombre'), telefono = txt(f, 'telefono');
  if (!nombre || telefono.replace(/\D/g, '').length < 9) redirect('/hoy?error=datos');
  const { repo, negocio } = await contexto();
  const tel = telefono.replace(/\D/g, '');
  const id = await repo.nuevoLead(negocio.id, {
    nombre, telefono: tel.length === 9 ? `51${tel}` : tel, correo: txt(f, 'correo'), origen: txt(f, 'origen') || 'manual',
  });
  listo();
  redirect(`/leads/${id}`);
}

export async function entrar(f: FormData) {
  if (!supabaseConfigurado()) redirect('/');
  const correo = txt(f, 'correo');
  const h = await headers();
  const origen = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const sb = await supabaseServidor();
  const { error } = await sb.auth.signInWithOtp({
    email: correo, options: { shouldCreateUser: false, emailRedirectTo: `${origen}/auth/confirmar` },
  });
  redirect(error ? '/entrar?error=1' : `/entrar?enviado=${encodeURIComponent(correo)}`);
}

export async function salir() {
  if (supabaseConfigurado()) await (await supabaseServidor()).auth.signOut();
  redirect('/entrar');
}

import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServidor } from '@/lib/supabase';

/** El enlace del correo de acceso llega aquí: cambia el código por una sesión y entra al CRM. */
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get('code');
  const destino = request.nextUrl.clone();
  destino.search = '';
  if (codigo) {
    const { error } = await (await supabaseServidor()).auth.exchangeCodeForSession(codigo);
    destino.pathname = error ? '/entrar' : '/';
    if (error) destino.searchParams.set('error', 'enlace');
  } else {
    destino.pathname = '/entrar';
  }
  return NextResponse.redirect(destino);
}

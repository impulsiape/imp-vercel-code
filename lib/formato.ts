import { inicioDelDia } from './crm';

const ZONA = 'America/Lima';
const DIA = 86_400_000;

export const hora = (t: number) => new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' }).format(t);
export const fechaCorta = (t: number) => new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, day: 'numeric', month: 'short' }).format(t);

/** "Hoy 10:30", "Ayer 18:05" o "12 nov 09:00" */
export function cuando(t: number | null, ahora = Date.now()): string {
  if (t === null) return '—';
  const hoy0 = inicioDelDia(ahora);
  if (t >= hoy0 && t < hoy0 + DIA) return `Hoy ${hora(t)}`;
  if (t >= hoy0 - DIA && t < hoy0) return `Ayer ${hora(t)}`;
  if (t >= hoy0 + DIA && t < hoy0 + 2 * DIA) return `Mañana ${hora(t)}`;
  return `${fechaCorta(t)} ${hora(t)}`;
}

export function hace(t: number | null, ahora = Date.now()): string {
  if (t === null) return '';
  const min = Math.round((ahora - t) / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} d`;
}

/** 51987654321 → +51 987 654 321 */
export function telefono(t: string): string {
  const d = t.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('51')) return `+51 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return d ? `+${d}` : 'Sin número';
}

/** Valor para <input type="datetime-local"> en hora de Lima. */
export function aInputLima(t: number): string {
  return new Date(t - 5 * 3_600_000).toISOString().slice(0, 16);
}
/** Lo contrario: lo que escribe el usuario (hora de Lima) a milisegundos. */
export function deInputLima(v: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  return new Date(`${v}:00-05:00`).getTime();
}

export const ORIGENES: Record<string, string> = {
  whatsapp: 'WhatsApp', formulario: 'Formulario', facebook: 'Facebook', instagram: 'Instagram', referido: 'Referido', manual: 'Manual',
};

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICONOS: Record<string, string> = {
  tablero: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z',
  hoy: 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8',
  atender: 'M3 6h18M3 12h12M3 18h6M16 16l2 2 4-4',
  leads: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  llamadas: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
};

export function Menu({ cuentas }: { cuentas: Record<string, number> }) {
  const ruta = usePathname();
  const items = [
    ['/', 'tablero', 'Tablero'], ['/hoy', 'hoy', 'Ingresaron hoy'], ['/atender', 'atender', 'Por atender'],
    ['/leads', 'leads', 'Leads'], ['/llamadas', 'llamadas', 'Llamadas'],
  ] as const;
  return (
    <nav className="menu">
      {items.map(([href, k, t]) => {
        const on = href === '/' ? ruta === '/' : ruta.startsWith(href);
        return (
          <Link key={k} href={href} className={on ? 'on' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONOS[k]} /></svg>
            <span>{t}</span>
            {!!cuentas[k] && <em className={k === 'hoy' ? 'azul' : ''}>{cuentas[k]}</em>}
          </Link>
        );
      })}
    </nav>
  );
}

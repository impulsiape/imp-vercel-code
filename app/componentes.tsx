import Link from 'next/link';
import { ETAPAS, GRUPOS_LLAMADA, TEMPERATURAS, nombreEtapa, temperatura, type Etapa, type GrupoLlamada, type LeadCrm } from '@/lib/crm';
import { telefono } from '@/lib/formato';

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <svg className="logo" viewBox="0 0 330 80" role="img" aria-label="Impulsia">
      <g transform="translate(0,6)">
        <rect width="64" height="64" rx="18" fill="#FF5B3A" />
        <path d="M20 44 L32 30 L44 44" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 30 L32 16 L44 30" stroke="#fff" strokeOpacity=".55" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="80" y="55" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="48" fill={claro ? '#fff' : '#1A1238'} letterSpacing="-1.5">
        impuls<tspan fill="#FF5B3A">ia</tspan>
      </text>
    </svg>
  );
}

export function PillEtapa({ etapa, nombres }: { etapa: Etapa; nombres?: Partial<Record<Etapa, string>> }) {
  const e = ETAPAS.find((x) => x.id === etapa)!;
  return <span className="pill" style={{ ['--c' as string]: e.color }}><i />{nombreEtapa(etapa, nombres)}</span>;
}

export function PillTemp({ lead }: { lead: Pick<LeadCrm, 'etapa' | 'nivel'> }) {
  const t = temperatura(lead);
  if (!t) return <span className="tenue">—</span>;
  return <span className="pill" style={{ ['--c' as string]: TEMPERATURAS[t].color }}><i />{TEMPERATURAS[t].nombre}</span>;
}

export function PillGrupo({ grupo }: { grupo: GrupoLlamada }) {
  if (!grupo) return null;
  const g = GRUPOS_LLAMADA[grupo];
  return <span className="pill" style={{ ['--c' as string]: g.color }}><i />{grupo}. {g.nombre}</span>;
}

export function NombreLead({ lead, extra }: { lead: LeadCrm; extra?: React.ReactNode }) {
  return (
    <Link href={`/leads/${lead.id}`} className="nombre">
      <b>{lead.nombre || '(sin nombre)'}{!lead.visto && <span className="pill nuevo">Nuevo</span>}{lead.esPrueba && <span className="pill gris">Prueba</span>}</b>
      <small>{telefono(lead.telefono)}{extra}</small>
    </Link>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <div className="vacio">{children}</div>;
}

/** Chips que filtran con un parámetro de la URL. */
export function Chips({ base, param, valor, opciones, otros = {} }: {
  base: string; param: string; valor: string; otros?: Record<string, string | undefined>;
  opciones: { v: string; t: string; n?: number; c?: string }[];
}) {
  const href = (v: string) => {
    const q = new URLSearchParams(Object.entries({ ...otros, [param]: v }).filter(([, x]) => x) as [string, string][]);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="chips">
      {opciones.map((o) => (
        <Link key={o.v} href={href(o.v)} className={`chip${valor === o.v ? ' on' : ''}`} scroll={false}>
          {o.c && <i style={{ background: o.c }} />}{o.t}{o.n !== undefined && <em>{o.n}</em>}
        </Link>
      ))}
    </div>
  );
}

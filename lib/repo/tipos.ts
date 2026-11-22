import type { Etapa, LeadCrm, ResultadoLlamada } from '@/lib/crm';

export interface Negocio {
  id: string;
  nombre: string;
  /** Nombres propios de las etapas, ej. { en_cierre: 'Inscrito a la entrevista' } */
  nombresEtapas: Partial<Record<Etapa, string>>;
}

export interface Actividad {
  id: string;
  tipo: string;          // nota | llamada | cambio_etapa | cambio_nivel | seguimiento | lead_nuevo | …
  origen: 'bot' | 'persona' | 'sistema';
  autor: string;
  detalle: Record<string, unknown>;
  creado: number;
}

export interface Mensaje {
  id: string;
  autor: 'lead' | 'bot' | 'persona' | 'sistema';
  texto: string;
  creado: number;
}

export interface LeadDetalle {
  lead: LeadCrm;
  correo: string;
  datos: string;
  actividades: Actividad[];
  mensajes: Mensaje[];
}

export interface NuevoLead {
  nombre: string;
  telefono: string;
  correo: string;
  origen: string;
}

/**
 * De dónde salen los datos. Hay dos: Supabase (el real, con usuarios y RLS)
 * y Demo (en memoria, con un negocio ficticio, para mostrar el CRM sin conectar nada).
 */
export interface Repo {
  modo: 'supabase' | 'demo';
  usuario(): Promise<{ email: string } | null>;
  negocios(): Promise<Negocio[]>;
  leads(negocioId: string): Promise<LeadCrm[]>;
  detalle(negocioId: string, leadId: string): Promise<LeadDetalle | null>;
  marcarVisto(negocioId: string, leadId: string): Promise<void>;
  moverEtapa(negocioId: string, leadId: string, etapa: Etapa, motivo: string): Promise<void>;
  nota(negocioId: string, leadId: string, texto: string): Promise<void>;
  posponer(negocioId: string, leadId: string, cuando: number | null, accion: string): Promise<void>;
  registrarLlamada(negocioId: string, leadId: string, resultado: ResultadoLlamada, nota: string): Promise<void>;
  nuevoLead(negocioId: string, datos: NuevoLead): Promise<string>;
}

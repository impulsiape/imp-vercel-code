-- ============================================================================
-- CRM de venta (Fase 1): lo que el CRM VENIUM de URP hacía en Sheets, ahora para cualquier negocio.
-- Una sola etapa por lead (se mueve sola con el bot y la mueve el equipo), seguimiento agendado,
-- llamadas y nombres de etapa propios de cada negocio.
-- ============================================================================

alter table leads
  add column etapa text not null default 'nuevo' check (etapa in (
    'nuevo',            -- 1. llegó y nadie conversó todavía
    'conversando',      -- 2. respondió al bot o al equipo
    'sin_respuesta',    -- 3. dejó de responder; el bot le manda recordatorios
    'por_llamar',       -- 4. el bot terminó sus recordatorios: toca llamarlo
    'quiere_comprar',   -- 5. dijo que quiere comprar / inscribirse
    'en_cierre',        -- 6. reservó, se inscribió o está pagando
    'cliente',          -- 7. compró / se matriculó
    'proximo',          -- aparte: le interesa, pero más adelante
    'cerrado'           -- aparte: no le interesa, número errado, etc.
  )),
  add column visto           boolean not null default false,   -- alguien del equipo ya abrió su ficha
  add column proxima_accion  text not null default '',          -- qué hay que hacer en proximo_seguimiento
  add column llamadas        int not null default 0,
  add column ultima_llamada  timestamptz,
  add column ultimo_ingreso  timestamptz;                       -- volvió a registrarse (formulario o WhatsApp)

create index on leads (negocio_id, etapa);
create index on leads (negocio_id, proximo_seguimiento);

-- Cada negocio puede renombrar las etapas a su idioma: {"en_cierre": "Inscrito a la entrevista", "cliente": "Matriculado"}
alter table fichas add column nombres_etapas jsonb not null default '{}';

-- Los leads que ya existen toman la etapa que corresponde a su nivel.
update leads set etapa = case
  when nivel = 'matriculado'     then 'cliente'
  when nivel = 'pre_inscrito'    then 'en_cierre'
  when nivel = 'no_interes'      then 'cerrado'
  when nivel = 'superinteresado' then 'quiere_comprar'
  when contesto                  then 'conversando'
  else 'nuevo' end;

-- Las notas, llamadas y movimientos de etapa van a "actividades" (ya tiene negocio_id y RLS).
create index on actividades (lead_id, creado_en desc);

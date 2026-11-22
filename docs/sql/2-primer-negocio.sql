-- Crea tu primer negocio y te hace dueño. Córrelo UNA vez en Supabase > SQL Editor,
-- DESPUÉS de invitarte en Authentication > Users (así tu usuario ya existe).
-- Cambia los dos textos marcados con <<< >>>.
with n as (
  insert into negocios (nombre, slug, estado)
  values ('<<<Nombre del negocio>>>', '<<<nombre-corto-sin-espacios>>>', 'piloto')
  returning id
), f as (
  insert into fichas (negocio_id) select id from n
)
insert into miembros (negocio_id, usuario_id, rol)
select n.id, u.id, 'dueno' from n, auth.users u where u.email = '<<<tu-correo@ejemplo.com>>>';

-- Para sumar a alguien del equipo (primero invítalo en Authentication > Users):
-- insert into miembros (negocio_id, usuario_id, rol)
-- select n.id, u.id, 'asesora' from negocios n, auth.users u
--  where n.slug = 'nombre-corto' and u.email = 'correo@del-equipo.com';

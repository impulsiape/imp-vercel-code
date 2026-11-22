# Instrucciones para asistentes de IA en este repositorio

- Idioma: código, comentarios y textos de pantalla en **español** (equipo y clientes en Perú). Hora de Lima.
- Marca Impulsia: coral `#FF5B3A`, tinta `#1A1238`, letra Plus Jakarta Sans. Los colores están en `app/globals.css`.
- Las reglas del CRM (etapas, temperatura, colas de atención y llamadas) viven en `lib/crm.ts` y tienen pruebas en `test/`.
  Si cambias una regla, cambia o agrega su prueba.
- Los datos pasan por `lib/repo`: `supabase.ts` (real, con RLS) y `demo.ts` (negocio ficticio en memoria).
  Toda función nueva va en los dos, con la misma interfaz `Repo` de `lib/repo/tipos.ts`.
- La base de datos es la misma que usa el bot (repositorio `Impulsia-pe/plataforma`). Las tablas se crean allá;
  aquí solo se copian los scripts en `docs/sql/` para correrlos a mano. Toda tabla con datos de clientes lleva `negocio_id` y RLS.
- Ningún secreto en el código: solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas, protegidas por RLS).
  Nunca uses la clave `service_role` en esta app.
- Antes de proponer un cambio: `pnpm typecheck && pnpm test && pnpm build`.

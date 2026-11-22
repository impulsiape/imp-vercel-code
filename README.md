# Impulsia · CRM de venta

El CRM que nació en URP (CRM VENIUM en Apps Script), ahora en **Next.js** para publicarlo en **Vercel**
y servir a cualquier negocio. Los datos están en **Supabase**, la misma base que usa el bot de WhatsApp.

## Pantallas

| Pantalla | Para qué |
|---|---|
| **Tablero** | Ingresaron hoy, por atender, por llamar, etapas, temperatura, embudo y por qué no les interesa. |
| **Ingresaron hoy** | Los leads que llegaron hoy, ayer o en 7 días. Botón para registrar un lead a mano. |
| **Por atender** | La cola del equipo: primero los de más interés y, en cada nivel, el que llegó antes. |
| **Leads** | Todos los leads, con búsqueda y filtros por etapa y temperatura. |
| **Ficha del lead** | Datos, etapa, próximo seguimiento, registrar llamada, notas, historial y la conversación con el bot. |
| **Llamadas** | Cola de llamadas por grupos, con la "siguiente llamada" y botones de resultado. |

**Etapas** (una sola por lead): 1 Nuevo · 2 Conversando · 3 Sin respuesta · 4 Por llamar · 5 Quiere comprar ·
6 En cierre · 7 Cliente, y aparte Más adelante y Cerrado. Cada negocio puede renombrarlas (ej. "Inscrito", "Matriculado").

## Modo demo

Si no hay variables de Supabase, el CRM abre en **modo demo** con un negocio ficticio
(Escuela de Cocina Sabores). Sirve para mostrarlo a clientes sin conectar nada.

## Probarlo en tu computadora

Necesitas Node 22 y pnpm (`npm i -g pnpm`).

```
pnpm install
pnpm dev          # abre http://localhost:3000 (modo demo)
pnpm test         # pruebas de las reglas del CRM
```

## Publicarlo en Vercel

1. En Vercel: **Add New… > Project**, importa `Impulsia-pe/imp-vercel-code` y dale **Deploy**. Sin variables abre en modo demo.
2. Para usar datos reales, en Supabase corre en **SQL Editor** `docs/sql/1-crm.sql` (una sola vez).
3. En Supabase > **Authentication > Users > Invite user**, invítate con tu correo. Luego corre `docs/sql/2-primer-negocio.sql`
   cambiando el nombre del negocio y tu correo.
4. En Supabase > **Authentication > URL Configuration**: *Site URL* = la dirección de Vercel (ej. `https://imp-vercel-code.vercel.app`)
   y en *Redirect URLs* agrega `https://imp-vercel-code.vercel.app/auth/confirmar`.
5. En Vercel > **Settings > Environment Variables** pega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Supabase > Project Settings > API). Luego **Deployments > Redeploy**.
6. Entra con tu correo: te llega un enlace y listo, sin contraseña.

## Lo que sigue

- Bandeja de chats en tiempo real para responder desde el CRM (reemplaza Whaticket).
- Campañas de correo y la configuración de la Ficha del bot por negocio.

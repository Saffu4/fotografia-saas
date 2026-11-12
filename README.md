# Panel de Administración — versión Supabase

Réplica funcional del panel (Clientes, Pedidos, Agenda, Buzón Interno) conectada
a una base de datos real en **Supabase**, con autenticación y seguridad por fila
(RLS) para que sea multi-usuario/multi-negocio si lo necesitas.

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea un proyecto (o usa uno existente).
2. Ve a **SQL Editor** → pega todo el contenido de `supabase/schema.sql` → **Run**.
   Esto crea las tablas `clients`, `orders`, `order_observations`, `payments`,
   `sessions`, `company_suggestions`, sus índices, un trigger que recalcula
   automáticamente el saldo del pedido cuando registras un abono, y las
   políticas de RLS (cada usuario solo ve sus propios clientes/pedidos).
3. Ve a **Authentication → Providers** y confirma que "Email" esté activo.
4. Crea al menos un usuario en **Authentication → Users → Add user** (o activa
   el registro público si prefieres que la gente se registre sola).
5. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public` key

## 2. Configurar el proyecto local

```bash
cp .env.example .env
```

Abre `.env` y pega tus credenciales:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

En Vercel, añade las mismas variables en **Project Settings → Environment
Variables** y selecciona al menos el entorno **Production**. Después de
guardarlas, vuelve a desplegar el proyecto para que Vite las incluya en el
build.

## 3. Instalar y correr

```bash
npm install
npm run dev
```

Abre http://localhost:5173 — te pedirá iniciar sesión con el usuario que
creaste en el paso 1.4.

## 4. Compilar para producción

```bash
npm run build
```

Esto genera la carpeta `dist/`, lista para subir a Vercel, Netlify, o
cualquier hosting estático.

## Estructura

```
src/
  lib/
    supabaseClient.js   → cliente de Supabase (lee las variables VITE_*)
    useAuth.js           → hook de sesión
    useStats.js          → hook de los contadores del dashboard
  components/
    Sidebar.jsx, StatCard.jsx, Modal.jsx, Layout.jsx
    PedidoFormModal.jsx, PedidoDetalleModal.jsx, SesionFormModal.jsx
  pages/
    Login.jsx, Clientes.jsx, Pedidos.jsx, Agenda.jsx, BuzonInterno.jsx
supabase/
  schema.sql            → todo el esquema + RLS + trigger de saldo
```

## Qué hace cada módulo

- **Clientes**: listar, buscar, crear, editar y eliminar (tabla `clients`).
- **Pedidos**: listar con filtro por estado y búsqueda, crear/editar (número
  autoincremental, cliente, total, abono, saldo calculado, responsable,
  estado, tipo de trabajo, observaciones), ver detalle con pestañas
  (Detalles Generales / Abonos-Pagos / Observaciones), registrar abonos
  (actualiza el saldo automáticamente vía trigger de base de datos),
  agregar notas, e imprimir un recibo en una ventana nueva.
- **Agenda**: calendario mensual de `sessions`, click en un día para agendar.
- **Buzón Interno**: notas/sugerencias compartidas (`company_suggestions`),
  visibles para cualquier usuario autenticado.

## Notas de seguridad

- Todas las tablas tienen RLS activado: un usuario solo puede leer/editar
  sus propios clientes, pedidos, pagos y sesiones (columna `user_id`).
- `company_suggestions` es compartida entre todos los usuarios autenticados
  (buzón interno de equipo). Si prefieres que también sea privada por
  usuario, agrégale una columna `user_id` y cambia sus políticas para que
  sigan el mismo patrón que las demás tablas.
- Nunca subas tu archivo `.env` a un repositorio público (ya está en
  `.gitignore`).

## Pruebas

```bash
npm test
```

## Migraciones aplicadas en producción

Correr en Supabase → SQL Editor, en este orden (ambas se pueden repetir sin
duplicar datos):

1. `supabase/migracion_2026-11_abonos.sql` — convierte abonos escritos a mano en pagos.
2. `supabase/migracion_2026-11_seguridad.sql` — reglas del Buzón, categorías
   unificadas, número de pedido único e índices.

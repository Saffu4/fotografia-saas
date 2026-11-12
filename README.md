# Panel de Administración — versión Supabase

Réplica funcional del panel (Clientes, Pedidos, Agenda, Buzón Interno) conectada
a una base de datos real en **Supabase**, con autenticación y seguridad por fila
(RLS) para que sea multi-usuario/multi-negocio si lo necesitas.

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea un proyecto (o usa uno existente).
2. Ve a **SQL Editor** → pega todo el contenido de `supabase/schema.sql` → **Run**.
   Esto crea las tablas `clients`, `orders`, `order_observations`, `payments`,
   `sessions`, `company_suggestions`, sus índices y las
   reglas de acceso (RLS).
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
    useAuth.js          → sesión del usuario
    admin.js            → quién puede ver Reportes (correo del dueño)
    constantes.js       → estados, categorías con color y responsables
    pedidos.js          → saldo, número de pedido, eliminar abono
    datos.js            → traer muchas filas, búsqueda de clientes sin tildes
    utilidades.js       → dinero ("50.000"), WhatsApp, CSV, búsqueda
  components/
    Layout, Sidebar, Modal, Avisos (avisos y confirmaciones), CampoDinero,
    ClientePicker, ClienteHistorialModal, PedidoFormModal,
    PedidoDetalleModal, SesionFormModal, ComprobanteCitaModal
  pages/
    Login, Restablecer, Clientes, Pedidos, Agenda, Reportes, BuzonInterno
supabase/
  schema.sql            → esquema completo igual a producción
  migracion_*.sql       → cambios aplicados a la base real (ver abajo)
```

Para cambiar categorías, colores, estados o responsables, edita solo
`src/lib/constantes.js`.

## Qué hace cada módulo

- **Clientes**: buscar (sin importar tildes), crear, editar, eliminar e
  historial de cada cliente (pedidos, saldo y citas). Avisa si el cliente ya
  existe.
- **Pedidos**: filtros por estado y tipo, número automático, abono inicial,
  abonos y eliminación de abonos (el saldo lo recalcula la aplicación),
  estado que se guarda al elegirlo, observaciones e impresión del recibo.
- **Agenda**: calendario mensual con color por categoría, aviso de cita doble
  o en fecha pasada, comprobante de la cita y envío por WhatsApp.
- **Reportes** (solo el dueño): cartera, ventas por mes y por tipo,
  recordatorio de cobro por WhatsApp y respaldo CSV de todas las tablas.
- **Buzón Interno**: notas compartidas del equipo.

## Notas de seguridad

- Clientes y pedidos son de cada usuario; agenda, abonos, observaciones y
  buzón los comparten todos los usuarios con sesión iniciada.
- Reportes solo aparece para el correo configurado en `src/lib/admin.js`.
- Para que funcione "Olvidé mi contraseña", agrega
  `https://<tu-dominio>/restablecer` en Supabase → Authentication →
  URL Configuration → Redirect URLs.

## Pruebas

```bash
npm test
```

## Migraciones aplicadas en producción

Correr en Supabase → SQL Editor, en este orden (todas se pueden repetir sin
duplicar datos):

1. `supabase/migracion_2026-11_abonos.sql` — convierte abonos escritos a mano en pagos.
2. `supabase/migracion_2026-11_seguridad.sql` — reglas del Buzón, categorías
   unificadas, número de pedido único e índices.
3. `supabase/migracion_2026-11_busqueda.sql` — búsqueda de clientes sin tildes.

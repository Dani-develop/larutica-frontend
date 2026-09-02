# Configuración de Supabase para LaRutica

## Desarrollo para colaboradores

Un clon nuevo solo necesita `npm ci` y `npm run dev`. No requiere Docker ni un
archivo `.env.local`. La configuración pública de `.env.development` hace que
las rutas `/api` locales se comuniquen con el backend desplegado de LaRutica.

La cookie de sesión queda en `localhost` como `HttpOnly`; el proxy local la
envía al backend, que valida su hash, el usuario, el estado y el rol antes de
acceder a Supabase. Las claves de Supabase nunca llegan al clon ni al navegador.

## Proyecto remoto compartido

1. Crea o selecciona el proyecto de Supabase.
2. Inicia sesión con la CLI, vincula este repositorio y aplica las migraciones:

   ```bash
   npx supabase login
   npx supabase link --project-ref ID_DEL_PROYECTO
   npx supabase db push
   ```

3. Configura `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y
   `SUPABASE_SECRET_KEY` como variables del alojamiento. La secret key es
   exclusivamente del servidor, nunca debe comenzar por `NEXT_PUBLIC_` ni
   guardarse en Git. La variable heredada
   `SUPABASE_SERVICE_ROLE_KEY` también funciona durante la transición.
4. Registra la primera cuenta desde `/register`.
5. En SQL Editor, convierte esa cuenta en administradora:

   ```sql
   update public.profiles
   set role = 'Admin'
   where email = 'tu-correo@ejemplo.com';
   ```

6. En **Authentication > URL Configuration**, configura la URL local
   `http://localhost:3000` y la URL desplegada. Agrega ambas a Redirect URLs,
   incluyendo `/api/auth/callback` para confirmación y recuperación PKCE.

## Modelo de sesión

1. El navegador envía las credenciales exclusivamente a `/api/auth/login`.
2. El servidor las valida con Supabase Auth y recibe temporalmente su JWT y
   refresh token.
3. El servidor crea 32 bytes aleatorios, devuelve ese valor en una cookie
   `HttpOnly`, `SameSite=Strict` y `Secure` en producción, y guarda solamente
   su hash SHA-256 en `public.app_sessions`.
4. Los tokens de Supabase se revocan y descartan; nunca se envían al navegador.
5. Cada API busca el hash de la cookie, comprueba expiración, usuario, estado y
rol actual antes de usar la clave service-role del servidor.

Las tablas `app_sessions` y `auth_pkce_flows` tienen RLS, no conceden permisos
a `anon` ni `authenticated`, y solo son administradas con `service_role`. La
sesión absoluta dura 8 horas, expira tras 30 minutos de inactividad y una nueva
autenticación invalida las sesiones anteriores de la misma cuenta.

Supabase almacena únicamente el hash bcrypt salado de la contraseña; la
aplicación no recibe ni guarda ese hash. La recuperación de contraseña usa PKCE:
el verificador permanece temporalmente en el servidor y el navegador vuelve a
recibir solo la cookie opaca.

## Qué se puede versionar

- Sí: migraciones, `.env.example` con marcadores y `.env.development` con la URL
  pública del backend.
- No: `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, contraseñas de base de
  datos, tokens personales de la CLI ni archivos `.env.local`.

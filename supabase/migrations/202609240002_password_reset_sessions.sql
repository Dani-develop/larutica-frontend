-- LaRutica: una sesión creada desde el enlace de recuperación puede cambiar la
-- contraseña sin la actual, solo durante una ventana corta. Cualquier otra
-- sesión debe confirmar la contraseña actual.

alter table public.app_sessions
  add column if not exists password_reset_until timestamptz;

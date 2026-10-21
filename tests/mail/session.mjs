import { ApiError } from '../../lib/api/errors.ts';
export async function requireAppSession(request) {
  const id = request.headers.get('x-test-user');
  const role = globalThis.mailTestActors[id];
  if (!role) throw new ApiError('No hay una sesión activa.', 401);
  return { session: { userId: id }, profile: { role } };
}

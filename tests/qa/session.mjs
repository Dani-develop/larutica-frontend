import {ApiError} from '../../lib/api/errors.ts';
export async function requireAppSession(request){const id=request.headers.get('x-test-user');const actor=globalThis.qaActors[id];if(!actor || !actor.active)throw new ApiError('No hay una sesión activa.',401);return {session:{userId:id},profile:{role:actor.role}};}

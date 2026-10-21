import {ApiError} from '../../lib/api/errors.ts';
export async function requireAppSession(){
  if(globalThis.mapTestRole===null)throw new ApiError('Inicia sesión.',401);
  return {profile:{role:globalThis.mapTestRole??'Agencia'}};
}

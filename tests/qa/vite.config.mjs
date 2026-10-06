import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('./',import.meta.url));
const root=fileURLToPath(new URL('../../',import.meta.url));
export default defineConfig({root:dir,envDir:false,plugins:[react()],resolve:{alias:[{find:'@/modules/auth/context/AuthContext',replacement:dir+'ui-auth.jsx'},{find:'next/navigation',replacement:dir+'ui-next.jsx'},{find:'@',replacement:root}]},server:{host:'127.0.0.1',port:4179,strictPort:true,fs:{allow:[root]}}});

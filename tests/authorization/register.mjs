import { register } from 'node:module';

register('../mail/module-loader.mjs', import.meta.url, { data: { useRealSession: true } });

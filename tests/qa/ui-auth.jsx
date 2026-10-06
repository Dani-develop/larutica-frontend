import {useSyncExternalStore} from 'react';
export function useAuth(){return useSyncExternalStore(window.qa.subscribe,window.qa.snapshot);}

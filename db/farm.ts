import {env} from 'cloudflare:workers';
export function farmDb(){if(!env.DB)throw new Error('Brak bazy gospodarstwa');return env.DB;}

import { D1Database } from '@cloudflare/workers-types/experimental';
import { Env } from './common';

declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {}
}

export {};

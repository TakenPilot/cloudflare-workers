import { type Env } from './common';

declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {}
}

export {};

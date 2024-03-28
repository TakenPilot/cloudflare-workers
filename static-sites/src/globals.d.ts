import { Env } from './index';

declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {}
}

export {};

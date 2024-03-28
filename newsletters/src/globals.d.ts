import { type Env } from './common';

declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {}
}

declare global {
	/**
	 * We import html as a raw string for faster serving, so we declare it as a module to TypeScript
	 * knows it is a string.
	 */
	declare module '*.html' {
		const value: string;
		export default value;
	}
}

export {};

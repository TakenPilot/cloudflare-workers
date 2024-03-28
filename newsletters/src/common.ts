import { D1Database } from '@cloudflare/workers-types/experimental';

export interface Env {
	NewslettersD1: D1Database;
	ENVIRONMENT?: string;
}

export type Subset<T extends U, U> = U;

const HOUR_MS = 1000 * 60 * 60;
export const TOKEN_EXPIRES_IN = HOUR_MS * 2;
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNonNullObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
export const isTimeExpired = (expiresAt: number) => expiresAt < Date.now();
export const isErrorWithMessage = <T>(value: unknown): value is T & { name: string; message: string } =>
	isNonNullObject(value) && isString(value.name) && isString(value.message);

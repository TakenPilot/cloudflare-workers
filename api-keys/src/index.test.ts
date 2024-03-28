import worker, { isOrigin, isValidKey, getAllowedOrigins } from './index';
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';

describe('GET', () => {
	it('is missing /api-keys/', async () => {
		const response = await worker.fetch(
			new Request('https://api-keys.example.com/a', {
				method: 'GET',
			}),
			env,
		);
		const value = await response.text();

		// Check GET returned the correct value
		expect(value).toBe('Not found');
	});

	it('should return the value 2', async () => {
		env.ALLOWED_ORIGINS = 'https://example.com';
		env.ALLOWED_AUTH_KEYS = 'key1';
		await env.API_KEYS.put('aaaaaaaaaaa', '3');

		// Perform the GET
		const response = await worker.fetch(
			new Request('https://localhost/api-keys/aaaaaaaaaaa', {
				method: 'GET',
			}),
			env,
		);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('3');
	});
});

describe('PUT', () => {
	it('is missing origin', async () => {
		// Perform the PUT
		const response = await worker.fetch(
			new Request('https://api-keys.example.com/a', {
				method: 'PUT',
				body: JSON.stringify({ value: '3' }),
			}),
			env,
		);
		expect(await response.text()).toBe('Invalid origin');
	});

	it('is missing auth key', async () => {
		env.ALLOWED_ORIGINS = 'https://api-keys.example.com';
		// Perform the PUT
		const response = await worker.fetch(
			new Request('https://api-keys.example.com/a', {
				method: 'PUT',
				headers: {
					Origin: 'https://api-keys.example.com',
				},
				body: JSON.stringify({ value: '3' }),
			}),
			env,
		);
		expect(await response.text()).toBe('Invalid auth key');
	});

	it('is missing /api-keys/', async () => {
		env.ALLOWED_ORIGINS = 'https://api-keys.example.com';
		env.ALLOWED_AUTH_KEYS = 'key1';
		const response = await worker.fetch(
			new Request('https://api-keys.example.com/a', {
				method: 'PUT',
				headers: {
					Origin: 'https://api-keys.example.com',
					Authorization: 'key1',
				},
				body: JSON.stringify({ value: '3' }),
			}),
			env,
		);
		expect(await response.text()).toBe('Not found');
	});

	it('is invalid content type', async () => {
		env.ALLOWED_ORIGINS = 'https://api-keys.example.com';
		env.ALLOWED_AUTH_KEYS = 'key1';
		// Seed the KV namespace
		await env.API_KEYS.put('aaaaaaaaaaa', '3');
		// Perform the PUT
		const response = await worker.fetch(
			new Request('https://api-keys.example.com/api-keys/aaaaaaaaaaa', {
				method: 'PUT',
				headers: {
					Origin: 'https://api-keys.example.com',
					Authorization: 'key1',
				},
				body: JSON.stringify({ value: '3' }),
			}),
			env,
		);
		expect(await response.text()).toBe('Invalid content type');
	});

	it('is invalid ApiKeyInfo', async () => {
		env.ALLOWED_ORIGINS = 'https://api-keys.example.com';
		env.ALLOWED_AUTH_KEYS = 'key1';
		// Seed the KV namespace
		await env.API_KEYS.put('aaaaaaaaaaa', '3');
		// Perform the PUT
		const response = await worker.fetch(
			new Request('https://api-keys.example.com/api-keys/aaaaaaaaaaa', {
				method: 'PUT',
				headers: {
					Origin: 'https://api-keys.example.com',
					Authorization: 'key1',
					'Content-type': 'application/json',
				},
				body: JSON.stringify({ value: '3' }),
			}),
			env,
		);
		expect(await response.text()).toBe('Invalid ApiKeyInfo');
	});

	it('is ok', async () => {
		env.ALLOWED_ORIGINS = 'https://api-keys.example.com';
		env.ALLOWED_AUTH_KEYS = 'key1';
		await env.API_KEYS.put('aaaaaaaaaaa', '3');
		const response = await worker.fetch(
			new Request('https://api-keys.example.com/api-keys/aaaaaaaaaaa', {
				method: 'PUT',
				headers: {
					Origin: 'https://api-keys.example.com',
					Authorization: 'key1',
					'Content-type': 'application/json',
				},
				body: JSON.stringify({ expires: 0, tenantId: 'bbbbbbbbbbb', policies: [] }),
			}),
			env,
		);
		expect(await response.text()).toBe('OK');
	});
});

describe('isOrigin', () => {
	it('works', () => {
		expect(isOrigin('http://example')).toBe(true);
		expect(isOrigin('https://example')).toBe(true);
		expect(isOrigin('example')).toBe(false);
		expect(isOrigin('example.com')).toBe(false);
		expect(isOrigin('https://example.com')).toBe(true);
		expect(isOrigin('https://example.com/')).toBe(false);
		expect(isOrigin('https://example.com/a')).toBe(false);
		expect(isOrigin('https://example.com/a/')).toBe(false);
	});
});

describe('getAllowedOrigins', () => {
	it('works', () => {
		expect(getAllowedOrigins({ ...env, ALLOWED_ORIGINS: 'https://example.com' })).toEqual(['https://example.com']);
		expect(getAllowedOrigins({ ...env, ALLOWED_ORIGINS: 'https://api-key.example.com' })).toEqual(['https://api-key.example.com']);
		expect(getAllowedOrigins({ ...env, ALLOWED_ORIGINS: 'https://example.com,https://example2.com' })).toEqual([
			'https://example.com',
			'https://example2.com',
		]);
		expect(getAllowedOrigins({ ...env, ALLOWED_ORIGINS: 'example.com' })).toEqual([]);
		const env2 = { ...env };
		delete env2.ALLOWED_ORIGINS;
		expect(getAllowedOrigins(env2)).toEqual([]);
	});
});

describe('isValidKey', () => {
	it('works', () => {
		expect(isValidKey('a'.repeat(10))).toBe(true);
		expect(isValidKey('a'.repeat(9))).toBe(false);
		expect(isValidKey('a'.repeat(500))).toBe(true);
		expect(isValidKey('a'.repeat(501))).toBe(false);
		expect(isValidKey('a'.repeat(20) + '_')).toBe(false);
		expect(isValidKey('a'.repeat(20) + '/')).toBe(false);
		expect(isValidKey('a'.repeat(20) + '.')).toBe(false);
	});
});

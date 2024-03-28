import { vi, describe, it, expect } from 'vitest';
import worker from './index';
import { Env } from './common';
import { env } from 'cloudflare:test';

describe('GET', () => {
	it('gets a file', async () => {
		const e = env as unknown as Env;
		const response = await worker.fetch(new Request('https://example.com/a'), e, {
			waitUntil: vi.fn(),
			passThroughOnException: vi.fn(),
			abort: vi.fn(),
		});
	});
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAuthToken, consumeAuthToken } from './subscription-tokens';
import * as cryptoModule from '../lib/crypto';
import * as Lib from '../db/subscription-token-records';
import { SubscriptionTokenType } from '../db/subscription-token-records';
import { Err, OK } from '../lib/results';
import { env } from 'cloudflare:test';
import { TOKEN_EXPIRES_IN } from '../common';

// Mocking the imported modules
vi.mock('../lib/crypto', () => ({
	generateId: vi.fn(),
}));

vi.mock('../db/subscription-token-records', async (importOriginal) => {
	const actual = (await importOriginal()) as typeof Lib;
	return {
		...actual,
		deleteSubscriptionTokenRecordByToken: vi.fn().mockResolvedValue(undefined),
		getSubscriptionTokenRecordBySubscriptionId: vi.fn(),
		getSubscriptionTokenRecordByToken: vi.fn().mockResolvedValue(null),
		insertSubscriptionTokenRecord: vi.fn().mockResolvedValue(undefined),
	};
});

const createMock = <T>(x: unknown): T => {
	return x as unknown as T;
};

beforeEach(() => {
	// Reset all mocks before each test
	vi.resetAllMocks();
});

describe('generateAuthToken', () => {
	it('generates a new token if no existing token is found', async () => {
		vi.mocked(Lib.getSubscriptionTokenRecordBySubscriptionId).mockResolvedValue(createMock({ success: true, results: [] }));
		vi.mocked(cryptoModule.generateId).mockReturnValue('newTokenId');
		const result = await generateAuthToken(env, SubscriptionTokenType.VerifyEmail, 'subId');

		expect(result).toEqual(OK('newTokenId'));
		expect(Lib.insertSubscriptionTokenRecord).toHaveBeenCalledWith(
			expect.objectContaining({}),
			expect.objectContaining({
				id: 'newTokenId',
				expires_at: expect.any(BigInt),
				token_type: SubscriptionTokenType.VerifyEmail,
				subscription_id: 'subId',
			}),
		);
	});

	it('returns error if an existing unexpired token is found', async () => {
		const mockTokenRecord = {
			id: 'existingToken',
			expires_at: BigInt(new Date().getTime() + TOKEN_EXPIRES_IN),
		};
		vi.mocked(Lib.getSubscriptionTokenRecordBySubscriptionId).mockResolvedValue(createMock({ success: true, results: [mockTokenRecord] }));

		const result = await generateAuthToken(env, SubscriptionTokenType.VerifyEmail, 'subId');

		expect(result).toEqual(Err('EXISTING_UNEXPIRED_TOKEN'));
		expect(Lib.deleteSubscriptionTokenRecordByToken).not.toHaveBeenCalled();
		expect(Lib.insertSubscriptionTokenRecord).not.toHaveBeenCalled();
	});

	it('deletes expired tokens and generates a new one', async () => {
		const mockExpiredTokenRecord = {
			id: 'expiredToken',
			expires_at: BigInt(new Date().getTime() - TOKEN_EXPIRES_IN),
		};
		vi.mocked(Lib.getSubscriptionTokenRecordBySubscriptionId).mockResolvedValue(
			createMock({ success: true, results: [mockExpiredTokenRecord] }),
		);
		vi.mocked(cryptoModule.generateId).mockReturnValue('newTokenId');

		const result = await generateAuthToken(env, SubscriptionTokenType.VerifyEmail, 'subId');

		expect(result).toEqual(OK('newTokenId'));
		expect(Lib.deleteSubscriptionTokenRecordByToken).toHaveBeenCalledWith(env.NewslettersD1, 'expiredToken');
		expect(Lib.insertSubscriptionTokenRecord).toHaveBeenCalledWith(
			expect.objectContaining({}),
			expect.objectContaining({
				id: 'newTokenId',
				expires_at: expect.any(BigInt),
				token_type: SubscriptionTokenType.VerifyEmail,
				subscription_id: 'subId',
			}),
		);
	});
});

describe('consumeAuthToken', () => {
	it('returns error if token is not found', async () => {
		vi.mocked(Lib.getSubscriptionTokenRecordByToken).mockResolvedValue(null);

		const result = await consumeAuthToken(env, 'nonexistentToken');

		expect(result).toEqual(Err('TOKEN_NOT_FOUND'));
		expect(Lib.deleteSubscriptionTokenRecordByToken).not.toHaveBeenCalled();
	});

	it('returns error if token has expired', async () => {
		const mockExpiredToken = {
			id: 'expiredTokenId',
			expires_at: BigInt(Date.now() - 100000), // Token expired timestamp
		};
		vi.mocked(Lib.getSubscriptionTokenRecordByToken).mockResolvedValue(createMock(mockExpiredToken));
		vi.mocked(Lib.deleteSubscriptionTokenRecordByToken).mockResolvedValue(undefined);

		const result = await consumeAuthToken(env, 'expiredTokenId');

		expect(result).toEqual(Err('TOKEN_EXPIRED'));
		// Ensure the token is still deleted even if expired
		expect(Lib.deleteSubscriptionTokenRecordByToken).toHaveBeenCalledWith(env.NewslettersD1, 'expiredTokenId');
	});

	it('returns token record if valid and deletes it', async () => {
		const mockValidToken = {
			id: 'validTokenId',
			expires_at: BigInt(Date.now() + 100000), // Token valid timestamp
		};
		vi.mocked(Lib.getSubscriptionTokenRecordByToken).mockResolvedValue(createMock(mockValidToken));
		vi.mocked(Lib.deleteSubscriptionTokenRecordByToken).mockResolvedValue(undefined);

		const result = await consumeAuthToken(env, 'validTokenId');

		expect(result).toEqual(OK(mockValidToken));
		expect(Lib.deleteSubscriptionTokenRecordByToken).toHaveBeenCalledWith(env.NewslettersD1, 'validTokenId');
	});
});

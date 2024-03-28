import { describe, it, expect } from 'vitest';
import { generateId, toHex, fromHex, PBKDF2 } from './crypto';

describe('generateId', () => {
	it('generates a string of the correct length', () => {
		const length = 10;
		const id = generateId(length);
		expect(id).toHaveLength(length);
	});

	it('generates a string using only specified characters', () => {
		const length = 20;
		const id = generateId(length);
		// Regular expression to match against the allowed character set
		const allowedCharactersRegex = /^[a-z0-9]+$/;
		expect(id).toMatch(allowedCharactersRegex);
	});
});

describe('Hexadecimal Conversion', () => {
	it('converts between Uint8Array and hexadecimal string correctly (round trip)', () => {
		const original = new Uint8Array([0, 1, 2, 254, 255]);
		const hex = toHex(original);
		const result = fromHex(hex);
		expect(result).toEqual(original);
	});

	it('correctly converts Uint8Array to hexadecimal string', () => {
		const buffer = new Uint8Array([0, 15, 16, 255]);
		const expectedHex = '000f10ff';
		const hex = toHex(buffer);
		expect(hex).toBe(expectedHex);
	});

	it('correctly parses hexadecimal string to Uint8Array', () => {
		const hex = '000f10ff';
		const expectedBuffer = new Uint8Array([0, 15, 16, 255]);
		const buffer = fromHex(hex);
		expect(buffer).toEqual(expectedBuffer);
	});
});

describe('PBKDF2', () => {
	it('generates a hash with the correct format', async () => {
		const pbkdf2 = new PBKDF2();
		const password = 'testPassword';
		const hash = await pbkdf2.hash(password);

		// Example: "salt$derivedKey", where both salt and derivedKey are hexadecimal strings
		expect(hash).toMatch(/[0-9a-f]{32}\$[0-9a-f]+/);
	});

	it('verifies a password against its hash correctly', async () => {
		const pbkdf2 = new PBKDF2();
		const password = 'testPassword';
		const hash = await pbkdf2.hash(password);

		const isMatch = await pbkdf2.verify(hash, password);
		expect(isMatch).toBe(true);
	});

	it('fails to verify a password when it does not match the hash', async () => {
		const pbkdf2 = new PBKDF2();
		const password = 'testPassword';
		const hash = await pbkdf2.hash(password);

		const isMatch = await pbkdf2.verify(hash, 'wrongPassword');
		expect(isMatch).toBe(false);
	});
});

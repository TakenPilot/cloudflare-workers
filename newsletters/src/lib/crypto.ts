import { Crypto } from "@cloudflare/workers-types/experimental";

declare global {
	// Only refer to `crypto` in this file. Everywhere else with should refer
	// to methods in this file. This is to ensure that we don't accidentally
	// use the native crypto object, which is not available in the Cloudflare
	// Workers runtime.
	// @ts-ignore override of the "Window" global `crypto` object until CF bugfix.
	const crypto: Crypto;
}

/**
 * Generates a random string of the given length.
 */
export const generateId = (length: number) => {
	const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	const characterCount = characters.length;
	const randomValues = new Uint8Array(length);

	crypto.getRandomValues(randomValues);

	for (let i = 0; i < length; i++) {
		result += characters.charAt(randomValues[i] % characterCount);
	}

	return result;
}

const toHex = (buffer: Uint8Array): string => Array.from(new Uint8Array(buffer))
	.map(b => ('00' + b.toString(16)).slice(-2))
	.join('');

const fromHex = (hex: string): Uint8Array => {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

/**
 * It's silly that the keyLength is configurable since there is only one optimal
 * key length for each algorithm.
 */
const knownPBKDF2Algorithms = {
	"SHA-1": { keyLength: 160 },
	"SHA-256": { keyLength: 256 },
	"SHA-384": { keyLength: 384 },
	"SHA-512": { keyLength: 512 },
}

export class PBKDF2 {
	constructor(options: Partial<PBKDF2> = {}) {
		this.algorithm = options.algorithm || "SHA-256";
		this.iterations = options.iterations || 100000;
		this.delimiter = options.delimiter || "$";
		this.keyLength = options.keyLength || knownPBKDF2Algorithms[this.algorithm].keyLength;
	}
	algorithm: string & keyof typeof knownPBKDF2Algorithms;
	iterations: number;
	delimiter: string;
	keyLength: number;

	async hash(password: string): Promise<string> {
		const name = "PBKDF2";
		const key = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(password.normalize("NFKC")),
			{ name },
			false,
			["deriveBits", "deriveKey"]
		);

		const salt = crypto.getRandomValues(new Uint8Array(16));
		const derivedKey = await crypto.subtle.deriveBits(
			{
				name,
				salt,
				iterations: this.iterations,
				hash: this.algorithm
			},
			key,
			this.keyLength
		);

		const saltHex = toHex(salt);
		const derivedKeyHex = toHex(new Uint8Array(derivedKey));
		return `${saltHex}${this.delimiter}${derivedKeyHex}`;
	}

	async verify(hashedPassword: string, password: string): Promise<boolean> {
		const [saltHex, hashedKeyHex] = hashedPassword.split(this.delimiter);
		const salt = fromHex(saltHex);
		const hashedKey = fromHex(hashedKeyHex);
		const name = "PBKDF2";

		const key = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(password.normalize("NFKC")),
			{ name },
			false,
			["deriveBits", "deriveKey"]
		);

		const derivedKeyBuffer = await crypto.subtle.deriveBits(
			{
				name,
				salt,
				iterations: this.iterations,
				hash: this.algorithm
			},
			key,
			this.keyLength
		);

		const derivedKey = new Uint8Array(derivedKeyBuffer);

		// If they calculated the key with a different algorithm, we can't compare
		// them since they'll be different lengths, so we'll just say it's false.
		if (hashedKey.byteLength !== derivedKey.byteLength) {
			return false;
		}

		return crypto.subtle.timingSafeEqual(hashedKey, derivedKey);
	}
}

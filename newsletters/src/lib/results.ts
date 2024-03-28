export type Result<T, E> = OK<T> | Err<E>;
export type OK<T> = { ok: true; value: T };
export const OK = <T>(value: T): OK<T> => ({ ok: true, value });
export type Err<E> = { ok: false; error: E };
export const Err = <E>(error: E): Err<E> => ({ ok: false, error });
export class Unreachable extends Error {
	constructor(val: never) {
		super(`Unreachable: ${JSON.stringify(val)}`);
	}
}
export class NotImplemented extends Error {
	constructor() {
		super(`Not implemented`);
	}
}

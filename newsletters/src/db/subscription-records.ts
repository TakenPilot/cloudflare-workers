import { D1Database } from '@cloudflare/workers-types/experimental';
import { Subset } from '../common';

export type SubscriptionRecord = {
	id: string;
	email: string;
	hostname: string;
	/** Use empty string instead of null because NULL does not enforce uniqueness. */
	list_name: string;
	person_name: string | null;
	created_at: Date | null;
	email_confirmed_at: Date | null;
	unsubscribed_at: Date | null;
};

export type InsertSubscriptionOptions = Subset<
	SubscriptionRecord,
	{
		id: string;
		email: string;
		hostname: string;
		list_name: string;
		person_name?: string | null;
	}
>;

export const getSubscriptionRecordById = async (db: D1Database, id: string): Promise<SubscriptionRecord | null> => {
	return db.prepare('SELECT * FROM subscription WHERE id = ?').bind(id).first();
};

export const insertSubscriptionRecord = async (db: D1Database, options: InsertSubscriptionOptions): Promise<void> => {
	await db
		.prepare('INSERT INTO subscription (id, email, hostname, list_name, person_name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(options.id, options.email, options.hostname, options.list_name, options.person_name || null, new Date().getTime())
		.run();
};

export const deleteSubscriptionRecordById = async (db: D1Database, id: string): Promise<void> => {
	await db.prepare('DELETE FROM subscription WHERE id = ?').bind(id).run();
};

export type SubscriptionRecordUniqueValues = Subset<
	SubscriptionRecord,
	{
		email: string;
		hostname: string;
		list_name: string;
	}
>;

export const getSubscriptionRecordByUniqueValues = async (
	db: D1Database,
	options: SubscriptionRecordUniqueValues,
): Promise<SubscriptionRecord | null> => {
	return db
		.prepare('SELECT * FROM subscription WHERE email = ? AND hostname = ? AND list_name = ?')
		.bind(options.email, options.hostname, options.list_name)
		.first();
};

export type SetUnsubscribedAtOptions = Subset<
	SubscriptionRecord,
	{
		id: string;
		unsubscribed_at: Date | null;
	}
>;

export const setSubscriptionRecordUnsubscribedAt = async (db: D1Database, options: SetUnsubscribedAtOptions) => {
	const unsubscribed_at = options.unsubscribed_at?.getTime() || null;
	await db.prepare('UPDATE subscription SET unsubscribed_at = ? WHERE id = ?').bind(unsubscribed_at, options.id).run();
};

export type SetEmailSubscriptionOptions = Subset<
	SubscriptionRecord,
	{
		id: string;
		email_confirmed_at: Date | null;
	}
>;

export const setSubscriptionRecordEmailConfirmedAt = async (db: D1Database, options: SetEmailSubscriptionOptions): Promise<void> => {
	const email_confirmed_at = options.email_confirmed_at?.getTime() || null;
	await db.prepare('UPDATE subscription SET email_confirmed_at = ? WHERE id = ?').bind(email_confirmed_at, options.id).run();
};

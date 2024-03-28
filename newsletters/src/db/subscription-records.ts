import { D1Database } from '@cloudflare/workers-types/experimental';
import { Subset } from '../common';

export type SubscriptionRecord = {
	id: string;
	email: string;
	hostname: string;
	list_name: string | null;
	person_name: string | null;
	email_confirmed_at: Date | null;
	unsubscribed_at: Date | null;
};

export type InsertSubscriptionOptions = Subset<
	SubscriptionRecord,
	{
		id: string;
		email: string;
		hostname: string;
		list_name?: string | null;
		person_name?: string | null;
	}
>;

export const insertSubscriptionRecord = async (db: D1Database, options: InsertSubscriptionOptions): Promise<void> => {
	await db
		.prepare('INSERT INTO subscription (id, email, hostname, list_name, person_name) VALUES (?, ?, ?, ?)')
		.bind(options.id, options.email, options.hostname, options.list_name || null, options.person_name || null)
		.run();
};

export type SubscriptionRecordUniqueValues = Subset<
	SubscriptionRecord,
	{
		email: string;
		hostname: string;
		list_name?: string | null;
	}
>;

export const getSubscriptionRecordByUniqueValues = async (
	db: D1Database,
	options: SubscriptionRecordUniqueValues,
): Promise<SubscriptionRecord | null> => {
	return db
		.prepare('SELECT * FROM subscription WHERE email = ? AND hostname = ? AND list_name = ?')
		.bind(options.email, options.hostname, options.list_name || null)
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
	await db.prepare('UPDATE subscription SET unsubscribed_at = ? WHERE id = ?').bind(options.unsubscribed_at, options.id).run();
};

export type SetEmailSubscriptionOptions = Subset<
	SubscriptionRecord,
	{
		id: string;
		email_confirmed_at: Date | null;
	}
>;

export const setSubscriptionRecordEmailConfirmedAt = async (db: D1Database, options: SetEmailSubscriptionOptions): Promise<void> => {
	await db.prepare('UPDATE subscription SET email_confirmed_at = ? WHERE id = ?').bind(options.email_confirmed_at, options.id).run();
};

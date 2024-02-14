import { D1Database, D1Result } from "@cloudflare/workers-types/experimental";

export const enum SubscriptionTokenType {
	VerifyEmail = "verify_email",
}

export type SubscriptionTokenRecord = {
	id: string;
	expires_at: bigint;
	subscription_id: string;
	token_type: SubscriptionTokenType;
}

export const insertSubscriptionTokenRecord = async (db: D1Database, record: SubscriptionTokenRecord): Promise<void> => {
	await db.prepare("INSERT INTO subscription_token (id, expires_at, token_type, subscription_id) VALUES (?,?,?,?)")
		.bind(record.id, record.expires_at, record.token_type, record.subscription_id)
		.run();
}

export const deleteSubscriptionTokenRecordByToken = async (db: D1Database, token: string): Promise<void> => {
	await db.prepare("DELETE FROM subscription_token WHERE id = ?")
		.bind(token)
		.run();
}

export const getSubscriptionTokenRecordByToken = async (db: D1Database, token: string): Promise<SubscriptionTokenRecord | null> => {
	return db.prepare("SELECT * FROM subscription_token WHERE id = ?")
		.bind(token)
		.first();
}

export const getSubscriptionTokenRecordBySubscriptionId = async (db: D1Database, token_type: SubscriptionTokenType, subscription_id: string): Promise<D1Result<SubscriptionTokenRecord>> => {
	return db.prepare("SELECT id, expires_at, subscription_id, token_type FROM subscription_token WHERE subscription_id = ? AND token_type = ?")
		.bind(subscription_id, token_type)
		.all();
}

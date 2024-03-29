import { D1Database } from '@cloudflare/workers-types/experimental';
import { Subset } from '../common';

export const enum EmailConfirm {
	Link = 'link',
	Code = 'code',
}

export type ListConfig = {
	id: string;
	hostname: string;
	list_name: string;
	email_confirm?: EmailConfirm;
};

export type ListConfigUniqueValues = Subset<
	ListConfig,
	{
		hostname: string;
		list_name?: string;
	}
>;

export const getListConfigRecordById = async (db: D1Database, id: string): Promise<ListConfig | null> => {
	return db.prepare('SELECT id, hostname, list_name, email_confirm FROM list_config WHERE id = ?').bind(id).first();
};

export const insertListConfigRecord = async (db: D1Database, data: ListConfig): Promise<void> => {
	await db
		.prepare('INSERT INTO list_config (id, hostname, list_name, email_confirm) VALUES (?, ?, ?, ?)')
		.bind(data.id, data.hostname, data.list_name, data.email_confirm)
		.run();
};

export const updateListConfigRecord = async (db: D1Database, data: ListConfig): Promise<void> => {
	await db.prepare('UPDATE list_config SET email_confirm = ? WHERE id = ?').bind(data.email_confirm, data.id).run();
};

export const deleteListConfigRecord = async (db: D1Database, id: string): Promise<void> => {
	await db.prepare('DELETE FROM list_config WHERE id = ?').bind(id).run();
};

export const getListConfigRecordByUniqueValues = async (db: D1Database, options: ListConfigUniqueValues): Promise<ListConfig | null> => {
	return db
		.prepare('SELECT id, hostname, list_name, email_confirm FROM list_config WHERE hostname = ? AND list_name = ?')
		.bind(options.hostname, options.list_name)
		.first();
};

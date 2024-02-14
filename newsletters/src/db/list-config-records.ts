import { D1Database } from "@cloudflare/workers-types/experimental";

export const enum EmailConfirm {
	Link = "link",
	Code = "code",
}

export type ListConfig = {
	id: string,
	hostname: string;
	list_name: string;
	email_confirm?: EmailConfirm;
}

export type ListConfigUniqueValues = {
	hostname: string;
	list_name?: string;
}
export const getListConfigRecordByUniqueValues = async (db: D1Database, options: ListConfigUniqueValues): Promise<ListConfig | null> => {
	return db.prepare("SELECT id, hostname, list_name, email_confirm FROM list_config WHERE hostname = ? AND list_name = ?")
		.bind(options.hostname, options.list_name)
		.first();
}

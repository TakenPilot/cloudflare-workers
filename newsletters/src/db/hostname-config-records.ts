import { D1Database } from '@cloudflare/workers-types/experimental';

/**
 * HostnameConfigs represent a known hostname that is allowed to use the service.
 *
 * Each is fetched before any modifying operation is allowed to be performed, and it
 * contains configuration for that particular hostname.
 */
export type HostnameConfig = {
	hostname: string;
	google_recaptcha_secret: string | null;
};

export const getHostnameConfigByHostname = async (db: D1Database, hostname: string): Promise<HostnameConfig | null> => {
	return db.prepare('SELECT hostname, google_recaptcha_secret FROM hostname_config WHERE hostname = ?').bind(hostname).first();
};

export const insertHostnameConfig = async (db: D1Database, data: HostnameConfig): Promise<void> => {
	db.prepare('INSERT INTO hostname_config (hostname, google_recaptcha_secret) VALUES (?, ?)')
		.bind(data.hostname, data.google_recaptcha_secret)
		.run();
};

export const updateHostnameConfig = async (db: D1Database, data: HostnameConfig): Promise<void> => {
	db.prepare('UPDATE hostname_config SET google_recaptcha_secret = ? WHERE hostname = ?')
		.bind(data.google_recaptcha_secret, data.hostname)
		.run();
};

export const deleteHostnameConfig = async (db: D1Database, hostname: string): Promise<void> => {
	db.prepare('DELETE FROM hostname_config WHERE hostname = ?').bind(hostname).run();
};

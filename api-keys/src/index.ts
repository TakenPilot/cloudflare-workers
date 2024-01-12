/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	API_KEYS: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

const KEY_MIN_SIZE = 10;
const KEY_MAX_SIZE = 100;
const VALUE_MAX_SIZE = 500;
const KEY_REGEX = /^[a-zA-Z0-9]+$/;
const ORIGIN_REGEX = /^https?:\/\/[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*(:[0-9]+)?$/;
const API_KEY_PATH = '/api-keys/';

const isString = (value: unknown): value is string => typeof value === 'string';
const isObject = (value: unknown): value is Record<string, any> => typeof value === 'object';
const isNonNullObject = (value: unknown): value is Record<string, any> => isObject(value) && value !== null;
const isAlphaNumeric = (value: string): boolean => KEY_REGEX.test(value);
const isOrigin = (value: string): boolean => ORIGIN_REGEX.test(value);

type ApiKeyPolicy = {
	name: string,
	config: object,
};

type ApiKeyInfo = {
	key: string,
	policies: ApiKeyPolicy[],
};

const isApiKeyPolicy = (value: unknown): value is ApiKeyPolicy => {
	return isNonNullObject(value) &&
		'name' in value && isString(value.name) &&
		'config' in value && isObject(value.config);
}

const isApiKeyInfo = (value: unknown): value is ApiKeyInfo => {
	return isNonNullObject(value) &&
		'key' in value && isString(value.key) &&
		'policies' in value && Array.isArray(value.policies) && value.policies.every(isApiKeyPolicy);
}

/// Get the list of allowed auth keys. This is a combination of the
/// ALLOWED_AUTH_KEYS environment variable and any environment variables
/// that start with "SECRET_AUTH_KEY_". The latter is used to allow
/// setting auth keys as secrets in production environments without exposing them
/// in the Cloudflare dashboard.
const getAuthKeys = (env: Env): string[] => {
	// If no auth keys allowed, block all requests.
	if (!('ALLOWED_AUTH_KEYS' in env) || !isString(env.ALLOWED_AUTH_KEYS)) {
		return [];
	}
	// The passthrough and test auth keys are plain-text comma separated values,
	// and won't be set in production environments.
	const authKeys = env.ALLOWED_AUTH_KEYS.split(',');

	// Get any environment variables that begin with "SECRET_AUTH_KEY_"
	// and add them to the list of allowed auth keys.
	for (const [name, value] of Object.entries(env)) {
		if (name.startsWith('SECRET_AUTH_KEY_')) {
			authKeys.push(value);
		}
	}

	return authKeys.filter(isAlphaNumeric);
}

const getAllowedOrigins = (env: Env): string[] => {
	if (!('ALLOWED_ORIGINS' in env) || !isString(env.ALLOWED_ORIGINS)) {
		return [];
	}

	return env.ALLOWED_ORIGINS.split(',').filter(isOrigin);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Handle CORS preflight requests. This is needed since the API keys are
		// accessed from other websites. This is only needed for PUT/POST/DELETE requests.
		// See https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#preflighted_requests
		// for more information. The Access-Control-Max-Age header is set to 1 day
		// to reduce the number of preflight requests, which is the maximum value allowed
		// by Cloudflare.
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': 'same-site',
					'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		if (['PUT', 'POST', 'DELETE'].includes(request.method)) {
			// Check that request comes from an allowed origin by checking the Origin header
			// against the ALLOWED_ORIGINS environment variable. This is to prevent
			// unauthorized access to the API from other websites. Only check for PUT/POST/DELETE requests
			// since browsers may not send the Origin header for GET requests.
			const allowedOrigins = getAllowedOrigins(env);
			const origin = request.headers.get('Origin');
			if (!origin || !allowedOrigins.includes(origin)) {
				return new Response('Invalid origin', { status: 400 });
			}

			// Check that the request has a valid auth key for methods that modify the API keys. An auth key
			// is only needed for PUT/POST/DELETE requests since they modify the API keys.
			const authKeys = getAuthKeys(env);
			const authorization = request.headers.get('Authorization');
			if (!authorization || !authKeys.includes(authorization)) {
				return new Response('Invalid auth key', { status: 400 });
			}
		}

		const url = new URL(request.url);
		const pathname = url.pathname;
		if (pathname.startsWith(API_KEY_PATH)) {
			const key = pathname.slice(API_KEY_PATH.length);

			// Limit the size of the key and reject non-alphanumeric characters.
			if (key.length > KEY_MIN_SIZE && key.length > KEY_MAX_SIZE && !isAlphaNumeric(key)) {
				return new Response('Invalid key', { status: 400 });
			}

			if (request.method === 'GET') {
				const value = await env.API_KEYS.get(key);
				return new Response(value);
			} else if (request.method === 'PUT') {
				// Check for a valid content type.
				const contentType = request.headers.get('content-type');
				if (contentType !== 'application/json') {
					return new Response('Invalid content type', { status: 400 });
				}

				const text = await request.text();

				// Limit the size of the request body.
				if (text.length > VALUE_MAX_SIZE) {
					return new Response('Request body too large', { status: 400 });
				}

				let value = null;
				try {
					value = JSON.parse(text);
				} catch (e) {
					return new Response('Invalid JSON', { status: 400 });
				}

				if (!isNonNullObject(value)) {
					return new Response('Invalid Object', { status: 400 });
				}
				// Add the key to the object, override if it already exists.
				// This is to ensure that the key is not set by the user.
				value.key = key;

				if (!isApiKeyInfo(value)) {
					return new Response('Invalid ApiKeyInfo', { status: 400 });
				}

				// It's okay to overwrite the value if it already exists.
				await env.API_KEYS.put(key, JSON.stringify(value));
				return new Response('OK');
			} else if (request.method === 'DELETE') {
				await env.API_KEYS.delete(key);
				return new Response('OK');
			} else {
				return new Response('Invalid method', { status: 405 });
			}
		}

		return new Response('Not found', { status: 404 });
	},
};

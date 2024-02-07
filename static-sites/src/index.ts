/**
 * A Cloudflare Worker that implements an API for managing API keys. API keys are stored
 * in the API_KEYS KV store. The API is protected by an auth key that is passed in the
 * Authorization header. The API is also protected by CORS by checking the Origin header
 * against the ALLOWED_ORIGINS environment variable. The API is meant to be used by
 * other websites, so it's important to restrict access to the API to prevent unauthorized
 * access.
 *
 * The API is NOT protected by rate limiting since it will contain the policies for rate-limiting
 * other services, therefore it's important to only use strong auth keys. Instead, we will rely on
 * Cloudflare's anti-DDoS protection to prevent brute force attacks. The API is also not
 * protected by a CSRF token since it's not meant to be used by forms.
 *
 * In non-production environments, the API has known auth keys that are used for testing, set in
 * plain text in the ALLOWED_AUTH_KEYS environment variable. In production environments, the
 * ALLOWED_AUTH_KEYS environment variable is empty and the auth keys are set as secrets in the
 * Cloudflare dashboard. The secret auth keys are set as secrets in Cloudflare that begin with
 * the prefix "SECRET_AUTH_KEY_" so they can be rotated easily, or have different auth keys for
 * different services, i.e., SECRET_AUTH_KEY_SERVICE_A, SECRET_AUTH_KEY_SERVICE_B, etc.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see worker in action
 * - Run `npm run deploy` to publish worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 *
 */

export interface Env {
	StaticSitesR2: R2Bucket;
	RedirectsKV: KVNamespace;
	PURGE_TOKEN?: string;
}

/**
 *
 * @example getExtension("index.html") // ".html"
 * @example getExtension("/") // ""
 * @example getExtension("") // ""
 * @example getExtension(".") // "."
 */
const getExtension = (path: string): string => {
	const dotIndex = path.indexOf(".");
	if (dotIndex === -1) {
		return "";
	}
	return path.slice(dotIndex);
}

const getNormalizedOrigin = (req: Request): string => {
	const url = new URL(req.url);

	// If cookie exists, use it.
	const cookie = req.headers.get("cookie");
	if (cookie) {
		const match = cookie.match(/__Host-hostname=([^;]+)/);
		if (match) {
			try {
				const decodedHostname = decodeURIComponent(match[1]);
				return new URL("https://" + decodedHostname).origin;
			} catch {
				// If cookie is malformed, ignore it.
			}
		}
	}

	return url.origin;
}

export const normalizePathname = (pathname: string): string => {
	// Assume always starts with "/"
	const indexName = "index.html";

	if (pathname === "") {
		return `/${indexName}`;
	}

	const hasLeadingSlash = pathname[0] === "/";
	const hasTrailingSlash = pathname.length > 0 && pathname[pathname.length - 1] === "/";
	const hasExtension = pathname.length > 0 && !hasTrailingSlash && getExtension(pathname) !== "";

	let tail = "";
	if (hasTrailingSlash) {
		tail = indexName;
	} else if (!hasExtension) {
		tail = `/${indexName}`;
	}

	return `${hasLeadingSlash ? "" : "/"}${pathname}${tail}`;
}

// HTML files are content, and anything else is an asset of content. Change this as needed.
const contentExts = ['.html'];
// Cache content for 1 hour.
const cacheContent = 3600;
// Cache assets for twice as long as content because content requests assets.
const cacheAssets = cacheContent * 2;

const cacheNotFound = 3600;

/**
 * Get the cache control header for a given pathname.
 */
const getCacheControl = (pathname: string): string => {
	const ext = getExtension(pathname);
	if (contentExts.includes(ext)) {
		return `public, max-age=${cacheContent} `;
	}
	return `public, max-age=${cacheAssets} `;
}

const getCacheKey = (url: URL): Request => {
	const origin = url.origin;
	const pathname = normalizePathname(url.pathname);
	return new Request(new URL(pathname, origin));
}

const getNotFoundResponse = (): Response => {
	const headers = new Headers();
	headers.set("Cache-Control", `public, max-age=${cacheNotFound} `);
	return new Response('Not found', { status: 404, headers });
}

const getObjectResponse = (pathname: string, obj: R2ObjectBody): Response => {
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set('etag', obj.httpEtag);
	headers.set("Cache-Control", getCacheControl(pathname));

	// TODO: hotlink protection of assets.

	// Return body stream so worker can finish faster (and cheaper).
	// https://developers.cloudflare.com/workers/runtime-apis/streaming#streaming-response-bodies
	return new Response(obj.body, {
		headers,
	});
}

const getRedirectResponse = (redirect: string): Response => {
	return new Response(null, {
		status: 301,
		headers: {
			"Location": redirect,
			"Cache-Control": getCacheControl(redirect)
		},
	});
}

const getMethodNotAllowedResponse = (): Response => {
	return new Response("Method not allowed", {
		status: 405,
	});
}

const handlePurge = async (cache: Cache, cacheKey: any): Promise<Response> => {
	cache.delete(cacheKey);
	return new Response("Purged", {
		status: 200,
	});
}

export default {
	async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
		const cache = caches.default;
		const url = new URL(request.url, getNormalizedOrigin(request));
		const cacheKey = getCacheKey(url);

		if (request.method === "PURGE") {
			if (env.PURGE_TOKEN && request.headers.get("Authorization") !== `Bearer ${env.PURGE_TOKEN} `) {
				return handlePurge(cache, cacheKey);
			}
		}

		if (request.method !== "GET") {
			return getMethodNotAllowedResponse();
		}

		let response = await cache.match(cacheKey);
		if (response) {
			return response;
		}

		const pathname = normalizePathname(url.pathname);
		const filepath = `${url.hostname}${pathname}`;

		const obj = await env.StaticSitesR2.get(filepath);
		if (obj) {
			response = getObjectResponse(pathname, obj);
		} else {
			const redirect = await env.RedirectsKV.get(filepath);
			if (redirect) {
				response = getRedirectResponse(redirect);
			} else {
				response = getNotFoundResponse();
			}
		}

		context.waitUntil(cache.put(cacheKey, response.clone()));
		return response;
	},
};

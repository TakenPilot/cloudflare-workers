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
 */

import { Env } from './common';
import htmlContent from './index.html';
import publicRoutes from './public-routes';

export type RouteHandler = (request: Request, env: Env) => Promise<Response>;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;

		if (publicRoutes[pathname]) {
			// Add rate-limiting here for public routes

			const route = publicRoutes[pathname];
			const method = request.method.toLowerCase();
			if (method in route) {
				return route[method as keyof typeof route](request, env);
			}

			return new Response('Method not allowed', { status: 405 });
		}

		if (request.method === 'GET') {
			// If they have the right API key, they may be able to download the list of subscribers.
			switch (pathname) {
				case '/':
					return new Response(htmlContent, {
						headers: {
							'Content-Type': 'text/html',
						},
					});
			}
		}

		return new Response('Not found', { status: 404 });
	},
};

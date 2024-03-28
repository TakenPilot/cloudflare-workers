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

import { string, object, email as validEmail, safeParseAsync, optional } from 'valibot';
import {
	insertSubscriptionRecord,
	getSubscriptionRecordByUniqueValues,
	setSubscriptionRecordUnsubscribedAt,
	setSubscriptionRecordEmailConfirmedAt,
} from './db/subscription-records';
import { EmailConfirm, getListConfigRecordByUniqueValues } from './db/list-config-records';
import { consumeAuthToken } from './domain/subscription-tokens';
import { generateId } from './lib/crypto';
import { Env, isErrorWithMessage } from './common';
import htmlContent from './index.html';
import { Result } from './lib/results';
import { isUniqueConstraintError } from './lib/d1';

const getNotFoundResponse = (): Response => {
	return new Response('Not found', { status: 404 });
};

const getInternalServerErrorResponse = (): Response => {
	return new Response('Internal server error', { status: 500 });
};

const getRequestData = async (request: Request): Promise<Result<Record<string, unknown>, 'INVALID_JSON' | 'INVALID_CONTENT_TYPE'>> => {
	if (request.headers.get('content-type') === 'application/json') {
		try {
			return { ok: true, value: await request.json() };
		} catch (e: unknown) {
			return { ok: false, error: 'INVALID_JSON' };
		}
	}

	if (request.headers.get('content-type') === 'application/x-www-form-urlencoded') {
		const formData = await request.formData();
		const data: Record<string, unknown> = {};

		for (const [key, value] of formData.entries()) {
			data[key] = value;
		}

		return { ok: true, value: data };
	}

	return { ok: false, error: 'INVALID_CONTENT_TYPE' };
};

const SubscribeSchema = object({
	email: string([validEmail()]),
	hostname: string(),
	list_name: string(),
	person_name: optional(string()),
});

const handleSubscribe = async (request: Request, env: Env): Promise<Response> => {
	const requestDataResult = await getRequestData(request);
	if (!requestDataResult.ok) {
		return new Response(requestDataResult.error, { status: 400 });
	}

	const parseResult = await safeParseAsync(SubscribeSchema, requestDataResult.value);
	if (parseResult.success === false) {
		return new Response('Bad request', { status: 400 });
	}
	const data = parseResult.output;

	try {
		await insertSubscriptionRecord(env.NewslettersD1, {
			id: generateId(15),
			...data,
		});
	} catch (e: unknown) {
		console.error('Error inserting subscription record', e);
		if (isErrorWithMessage(e)) {
			// If the user and hostname combination already exists, we can't subscribe them again.
			if (isUniqueConstraintError(e)) {
				// Get the existing record to see why.
				const record = await getSubscriptionRecordByUniqueValues(env.NewslettersD1, data);
				if (record === null) {
					// ??? This should never happen if we just got a conflict.
					return getInternalServerErrorResponse();
				}
				// If they were unsubscribed, allow them to subscribe again.
				if (record.unsubscribed_at !== null) {
					await setSubscriptionRecordUnsubscribedAt(env.NewslettersD1, {
						id: record.id,
						unsubscribed_at: null,
					});
					return new Response('Resubscribed', { status: 200 });
				}

				// Otherwise, they're already subscribed.
				return new Response('Already subscribed', { status: 400 });
			}

			// If there is a constraint violation on the hostname, they're not from a known source.
			if (e.message.includes('hostname')) {
				return new Response('Bad request', { status: 400 });
			}
		}
		throw e;
	}

	const listConfig = await getListConfigRecordByUniqueValues(env.NewslettersD1, {
		hostname: data.hostname,
		list_name: data.list_name,
	});

	if (listConfig !== null && listConfig.email_confirm === EmailConfirm.Link) {
		// TODO: Send the user an email with a link to confirm their email address.
	}

	return new Response('Subscribed', { status: 200 });
};

const UnsubscribeSchema = object({
	email: string([validEmail()]),
	hostname: string(),
	list_name: string(),
});
const handleUnsubscribe = async (request: Request, env: Env): Promise<Response> => {
	const requestDataResult = await getRequestData(request);
	if (!requestDataResult.ok) {
		return new Response(requestDataResult.error, { status: 400 });
	}

	console.log('requestDataResult', requestDataResult.value);

	const parseResult = await safeParseAsync(UnsubscribeSchema, requestDataResult.value);
	if (parseResult.success === false) {
		return new Response('Bad request', { status: 400 });
	}
	const data = parseResult.output;

	const record = await getSubscriptionRecordByUniqueValues(env.NewslettersD1, data);
	if (record === null) {
		return getNotFoundResponse();
	}

	// If they're already unsubscribed, we don't need to do anything.
	if (record.unsubscribed_at !== null) {
		return new Response('Already unsubscribed', { status: 200 });
	}

	await setSubscriptionRecordUnsubscribedAt(env.NewslettersD1, {
		id: record.id,
		unsubscribed_at: new Date(),
	});

	return new Response('Unsubscribed', { status: 200 });
};

const EmailConfirmSchema = object({
	token: string(),
});
const handleEmailConfirmation = async (request: Request, env: Env): Promise<Response> => {
	const requestDataResult = await getRequestData(request);
	if (!requestDataResult.ok) {
		return new Response(requestDataResult.error, { status: 400 });
	}

	const parseResult = await safeParseAsync(EmailConfirmSchema, requestDataResult.value);
	if (parseResult.success === false) {
		return new Response('Bad request', { status: 400 });
	}
	const data = parseResult.output;

	const tokenResult = await consumeAuthToken(env, data.token);
	if (!tokenResult.ok) {
		return new Response(tokenResult.error, { status: 400 });
	}
	const token = tokenResult.value;

	await setSubscriptionRecordEmailConfirmedAt(env.NewslettersD1, {
		id: token.subscription_id,
		email_confirmed_at: new Date(),
	});

	return new Response('Confirmed', { status: 200 });
};

// People have preferences, but we don't.
const routePostHandlers = {
	'/signup': handleSubscribe,
	'/subscribe': handleSubscribe,
	'/join': handleSubscribe,

	'/optout': handleUnsubscribe,
	'/unsubscribe': handleUnsubscribe,
	'/leave': handleUnsubscribe,

	'/verify': handleEmailConfirmation,
	'/confirm': handleEmailConfirmation,
} as Record<string, (request: Request, env: Env) => Promise<Response>>;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;

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

		if (request.method === 'POST') {
			const routeHandler = routePostHandlers[pathname];

			if (routeHandler) {
				return routeHandler(request, env);
			}
		}

		return new Response('Not found', { status: 404 });
	},
};

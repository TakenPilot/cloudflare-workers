import { object, optional, string, email as validEmail } from 'valibot';
import { withValidRequest } from '../lib/requests';
import { getListConfigRecordByUniqueValues, EmailConfirm } from '../db/list-config-records';
import { subscribe, unsubscribe, confirmEmail } from '../domain/subscriptions';
import { Unreachable } from '../lib/results';
import { RouteHandler } from '..';

const handleSubscribe = withValidRequest(
	object({
		query: object({}),
		body: object({
			email: string([validEmail()]),
			hostname: string(),
			list_name: string(),
			person_name: optional(string()),
		}),
	}),
	async (_, env, { body }) => {
		const subscribeResults = await subscribe(env, body);
		if (subscribeResults.ok === false) {
			switch (subscribeResults.error) {
				case 'RESUBSCRIBED':
					return new Response(subscribeResults.error, { status: 200 });
				case 'ALREADY_SUBSCRIBED':
					return new Response(subscribeResults.error, { status: 400 });
				case 'UNKNOWN_HOSTNAME':
					return new Response(subscribeResults.error, { status: 400 });
				default:
					throw new Unreachable(subscribeResults.error);
			}
		}

		const listConfig = await getListConfigRecordByUniqueValues(env.NewslettersD1, body);

		if (listConfig !== null && listConfig.email_confirm === EmailConfirm.Link) {
			// TODO: Send the user an email with a link to confirm their email address.
		}

		return new Response('SUBSCRIBED', { status: 200 });
	},
);

const handleUnsubscribe = withValidRequest(
	object({
		query: object({}),
		body: object({
			email: string([validEmail()]),
			hostname: string(),
			list_name: string(),
		}),
	}),
	async (_, env, { body }): Promise<Response> => {
		const unsubscribeResult = await unsubscribe(env, body);
		if (unsubscribeResult.ok === false) {
			switch (unsubscribeResult.error) {
				case 'UNKNOWN_HOSTNAME':
					return new Response(unsubscribeResult.error, { status: 400 });
				case 'ALREADY_UNSUBSCRIBED':
					return new Response(unsubscribeResult.error, { status: 200 });
				case 'NOT_FOUND':
					return new Response(unsubscribeResult.error, { status: 404 });
				default:
					throw new Unreachable(unsubscribeResult.error);
			}
		}

		return new Response('UNSUBSCRIBED', { status: 200 });
	},
);

const handleEmailConfirmation = withValidRequest(
	object({
		query: object({}),
		body: object({
			token: string(),
			hostname: string(),
		}),
	}),
	async (_, env, { body }): Promise<Response> => {
		const confirmEmailResult = await confirmEmail(env, body);
		if (confirmEmailResult.ok === false) {
			switch (confirmEmailResult.error) {
				case 'UNKNOWN_HOSTNAME':
					return new Response(confirmEmailResult.error, { status: 400 });
				case 'TOKEN_NOT_FOUND':
					return new Response(confirmEmailResult.error, { status: 400 });
				case 'TOKEN_EXPIRED':
					return new Response(confirmEmailResult.error, { status: 400 });
				case 'ALREADY_CONFIRMED':
					return new Response(confirmEmailResult.error, { status: 200 });
				default:
					throw new Unreachable(confirmEmailResult.error);
			}
		}

		return new Response('EMAIL_CONFIRMED', { status: 200 });
	},
);

export default {
	'/signup': { post: handleSubscribe },
	'/subscribe': { post: handleSubscribe },
	'/join': { post: handleSubscribe },
	'/optout': { post: handleUnsubscribe },
	'/unsubscribe': { post: handleUnsubscribe },
	'/leave': { post: handleUnsubscribe },
	'/verify': { post: handleEmailConfirmation },
	'/confirm': { post: handleEmailConfirmation },
} as Record<string, { post: RouteHandler }>;

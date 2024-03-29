import { BaseSchema, Output, safeParseAsync } from 'valibot';
import { Err, OK, Result } from './results';
import { Env } from '../common';

export const getRequestQueryData = async (request: Request): Promise<Result<Record<string, string>, never>> => {
	const url = new URL(request.url);

	const data: Record<string, string> = {};
	for (const [key, value] of url.searchParams.entries()) {
		data[key] = value;
	}

	return OK(data);
};

export const getRequestBodyData = async (
	request: Request,
): Promise<Result<Record<string, unknown> | null, 'INVALID_JSON' | 'INVALID_FORMDATA'>> => {
	const contentType = request.headers.get('content-type');

	if (contentType === 'application/json') {
		try {
			return OK(await request.json());
		} catch (e: unknown) {
			return Err('INVALID_JSON');
		}
	}

	if (contentType === 'application/x-www-form-urlencoded') {
		try {
			const formData = await request.formData();
			const data: Record<string, unknown> = {};

			for (const [key, value] of formData.entries()) {
				data[key] = value;
			}
			return OK(data);
		} catch (e: unknown) {
			return Err('INVALID_FORMDATA');
		}
	}

	return OK(null);
};

export const withValidRequest = <T extends BaseSchema>(
	schema: T,
	handler: (request: Request, env: Env, data: Output<T> & { id: string }) => Promise<Response>,
) => {
	return async (request: Request, env: Env): Promise<Response> => {
		const requestQueryResult = await getRequestQueryData(request);
		if (!requestQueryResult.ok) {
			return new Response(requestQueryResult.error, { status: 400 });
		}

		const requestDataResult = await getRequestBodyData(request);
		if (!requestDataResult.ok) {
			return new Response(requestDataResult.error, { status: 400 });
		}

		const data = {
			query: requestQueryResult.value,
			body: requestDataResult.value,
		};

		const parseResult = await safeParseAsync(schema, data);
		if (parseResult.success === false) {
			return new Response(parseResult.issues.map((issue) => issue.message).join(',\n'), { status: 400 });
		}

		const id = new URL(request.url).pathname.split('/').pop();
		if (typeof id !== 'string') {
			return new Response('ID_MISSING', { status: 400 });
		}

		return handler(request, env, { ...data, id });
	};
};

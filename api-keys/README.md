# API Keys via Cloudflare Worker

The API Keys API allows you to create, update, and delete API keys, designed to be limit access to other APIs.

The GET endpoint is public, but the PUT and DELETE endpoints are protected by one or more secret keys that can be rotated.

## Examples

### Create an API key

Example of PUT request to update an API key:

```js
fetch('/api-keys/aaaaaaaaaaa', {
	method: 'PUT',
	body: '{ "tenantId": "aaaaaaaaaaa", "expires": 0, "policies": [] }',
	headers: { Authorization: 'key1', 'Content-type': 'application/json' },
}).then(
	async (r) => {
		console.info('info', r);
		const body = await r.text();
		console.log('body', body);
		document.body.innerHTML = body;
	},
	(e) => {
		console.error('error', e);
	}
);
```

### Get an API key

Example of GET request to get an API key:

```js
fetch('/api-keys/aaaaaaaaaaa', {
	method: 'GET',
}).then(
	async (r) => {
		console.info('info', r);
		const body = await r.text();
		console.log('body', body);
		document.body.innerHTML = body;
	},
	(e) => {
		console.error('error', e);
	}
);
```

### Delete an API key

Example of DELETE request to delete an API key:

```js
fetch('/api-keys/aaaaaaaaaaa', {
	method: 'DELETE',
	headers: { Authorization: 'key1' },
}).then(
	async (r) => {
		console.info('info', r);
		const body = await r.text();
		console.log('body', body);
		document.body.innerHTML = body;
	},
	(e) => {
		console.error('error', e);
	}
);
```

## Testing

Run wrangler dev to test locally.

```zsh
npx wrangler dev
```

## Deploy to production

Run wrangler publish to deploy to Cloudflare.

```zsh
npx wrangler deploy -e prod
```

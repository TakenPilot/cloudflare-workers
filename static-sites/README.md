# Static Sites via Cloudflare Worker and R2

Serve static websites via a Cloudflare Worker and R2. This worker will serve the files from the directory that matches the hostname of the request. Set the worker as the custom hostname for the site in Cloudflare.

## Directory Structure

For each site that you want to serve from R2, create a directory with the full hostname of the site. This worker will serve the files within that directory when the Request hostname matches that directory name.

## Redirects

Redirects can occur if a file does not exist for that path, and a key for that "hostname/path" exists in the Redirects KV.

## Cache

The worker will cache the files that it serves to prevent unnecessary fetches from R2 and to speed up the response time.

## Purge

Particular routes can be cleared from the cache by setting the PURGE_TOKEN env variable to a secret value and then sending a PURGE request with the header `Authentication: Bearer <token>` set to that value.

## AB Testing Groups

Adding a cookie called `__Host-hostname` will change the host that is served. For example, setting the cookie to `__Host-hostname=example.com.test` will serve the test website "example.com.test" until the cookie is cleared.

Clients can read the cookie to set analytics for hich website they're seeing.

## Testing

Run wrangler dev to test locally. Disable local mode to test the local worker against production locally. This worker is read-only, so it's safe to test against production data.

```zsh
npx wrangler dev
```

## Deploy to production

Run wrangler publish to deploy to Cloudflare.

```zsh
npx wrangler deploy
```

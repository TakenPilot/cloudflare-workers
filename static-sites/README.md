# Static Sites via Cloudflare Worker

## Overview

Serve static sites via Cloudflare Worker.

Assumes a R2 directory structure where the top-level of the bucket is the hostname of the site, and the paths within the hostname directory are the paths of the site. There may be additional top-level directories that are subdomains of the main site.

```
account-maker.com
customclient.account-maker.com
dev.softwarepatterns.com
failback.account-maker.com
softwarepatterns.com
```

The host that is served can be modified by adding a cookie called `__Host-hostname` with the value of the host to be served. This can be used to opt-in to a test group and maintain that group until the cookie is removed. (TODO: How to restrict the test to that hostname instead of all hostnames served?)

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

# Newsletters Subscriptions via Cloudflare Worker and R2

(Work-in-progress, not done yet.)

Manage newsletter subscriptions via a Cloudflare Worker and R2. It will allow users to subscribe and unsubscribe from a newsletter, as well as verify their email address. Can also be used to create waiting lists.

## Database Structure

### Newsletters

When a user signs up for a newsletter or waiting list, we remember the email address, the list they signed up for, and the website that they came from. If they verify their email address, we mark the date that they verified.

If they unsubscribe, we mark the date that they unsubscribed. After a certain amount of time, we can obfuscate the record so we're legally compilant with data-retention laws while still having a record of user activity.

### Origins

We only allow newsletter subscriptions or waiting lists from known websites. Features for each site are configured in this table.

## Recaptcha

The worker can verify a recaptcha token with the recaptcha API before allowing the user to subscribe, preventing bots. This can be enabled by setting the RECAPTCHA_SECRET in the origins table.

## Private API

If there is an API key set for a known website, it can be used to download the current list of subscribers. This is used to integrate with other systems or scripts.

## Testing

Run wrangler dev to test locally.

```zsh
npx wrangler dev
```

## Deploy to production

Run wrangler publish to deploy to Cloudflare.

```zsh
npx wrangler deploy
```

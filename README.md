# Cloudflare Workers

Cloudflare Workers run JavaScript in a V8 environment. They are a serverless platform that allows you to run code at the edge of Cloudflare's network. This means that you can run code in 200+ cities around the world.

## Why Cloudflare Workers?

Cloudflare Workers are a great way to run code at the edge of Cloudflare's network. This means that you can run code in 200+ cities around the world. This is great for low latency applications. It also means that you can run code without having to manage servers. This is great for low cost applications.

## Why Rust?

Cloudflare Workers run JavaScript in a V8 environment, but they also support WebAssembly. We can therefore write our Workers in Rust and compile them to WebAssembly. WASM is a much more performant for parsing large JSON payloads than JavaScript.

## Development

To work on the project, you need to install the following tools:

### Install Rust and WASM dependencies

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update
# Installs local dependencies for compiling to WASM
rustup target add wasm32-unknown-unknown
```

### Important: Don't Install Wrangler

Any docs that say to install wrangler are outdated.

## Examples

https://blog.damianesteban.dev/blog/building-a-simple-crud-api-in-rust-with-cloudflare-workers/

### wrangler

https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler

https://crates.io/crates/worker#notes-and-faq

https://blog.cloudflare.com/oauth-2-0-authentication-server/

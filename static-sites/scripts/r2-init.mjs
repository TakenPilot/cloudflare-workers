import { Miniflare } from 'miniflare';

const mf = new Miniflare({
	modules: true,
	script: `
  export default {
    async fetch(request, env, ctx) {
      const object = await env.StaticSitesR2.get("count");
      const value = parseInt(await object.text()) + 1;
      await env.StaticSitesR2.put("count", value.toString());
      return new Response(value.toString());
    }
  }
  `,
	r2Buckets: ['StaticSitesR2'],
});

const bucket = await mf.getR2Bucket('StaticSitesR2');
await bucket.put('localhost/', '1');
await bucket.put('localhost/a/index.html', '2');
await bucket.put('localhost/b/index.html', '3');
await bucket.put('localhost/c/index.html', '4');

await mf.dispose();

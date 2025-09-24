/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// import { UserSession } from './UserSession';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		// /session/userid/add
		// /session/userid/entries

		if(url.pathname.startsWith('/session')){
			
			const userid = url.pathname.split("/")[2];
			//get the DO for this user
			const id = env.USER_SESSION.idFromName(userid);
			const obj = env.USER_SESSION.get(id);

			return obj.fetch(request)

	}
	return new Response('Hello World!');
},
} satisfies ExportedHandler<Env>;

// export { UserSession };

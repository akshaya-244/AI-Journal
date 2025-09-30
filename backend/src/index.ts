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

import { UserSession } from './UserSession';

export default {

	
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}
		//auth 
		if(url.pathname === '/auth/login' && request.method === 'POST'){
			try {
				const body = await request.json<{
					userId: string,
					email: string,
					name: string,
					picture?: string
				}>();
				
				console.log('User login request:', body);
				
				// Upsert user into database
				const userResult = await env.prod_daily_logs.prepare(
					`INSERT OR REPLACE INTO users (id, email, name, picture, updated_at) 
					 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
				).bind(
					body.userId,
					body.email,
					body.name,
					body.picture || null
				).run();
				
				console.log('User upserted successfully:', userResult);
				
				return new Response(JSON.stringify({
					success: true,
					message: 'User authenticated and database updated',
					userId: body.userId
				}), {
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				});
			} catch (error: any) {
				console.error('Auth login error:', error);
				return new Response(JSON.stringify({
					success: false,
					error: error.message
				}), {
					status: 500,
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				});
			}
		}

		// Debug route to get all users (no auth required)
		if(url.pathname === '/debug/users'){
			try {
				const users = await env.prod_daily_logs.prepare(
					`SELECT * FROM users ORDER BY created_at DESC`
				).all();
				
				return new Response(JSON.stringify({
					success: true,
					count: users.results?.length || 0,
					users: users.results || []
				}), {
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				});
			} catch (error: any) {
				return new Response(JSON.stringify({
					success: false,
					error: error.message
				}), {
					status: 500,
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				});
			}
		}

		// Debug route to get all journal entries (no auth required)
		if(url.pathname === '/debug/entries'){
			try {
				const entries = await env.prod_daily_logs.prepare(
					`SELECT * FROM journal_entries`
				).all();
				
				return new Response(JSON.stringify({
					success: true,
					count: entries.results?.length || 0,
					entries: entries.results || []
				}), {
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				});
			} catch (error: any) {
				return new Response(JSON.stringify({
					success: false,
					error: error.message
				}), {
					status: 500,
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				});
			}
		}

		if(url.pathname === '/debug/rag-search' && request.method === 'POST'){
			try {
				const body = await request.json<{
					query: string,
					userId?: string
				}>();
				
				console.log('Debug RAG search request:', body);
				
				// Get all journal entries for testing
				const dbEntries = await env.prod_daily_logs.prepare(
					`SELECT entry_text as text, timestamp, 
					 DATE(timestamp) as date,
					 CASE 
						 WHEN strftime('%w', timestamp) = '0' THEN 'Sunday'
						 WHEN strftime('%w', timestamp) = '1' THEN 'Monday'
						 WHEN strftime('%w', timestamp) = '2' THEN 'Tuesday'
						 WHEN strftime('%w', timestamp) = '3' THEN 'Wednesday'
						 WHEN strftime('%w', timestamp) = '4' THEN 'Thursday'
						 WHEN strftime('%w', timestamp) = '5' THEN 'Friday'
						 WHEN strftime('%w', timestamp) = '6' THEN 'Saturday'
					 END as day
					 FROM journal_entries 
					 ${body.userId ? 'WHERE user_id = ?' : ''}
					 ORDER BY timestamp DESC`
				).bind(body.userId || '').all();
				
				console.log('Found entries for RAG debug:', dbEntries.results?.length || 0);
				
				if (!dbEntries.results || dbEntries.results.length === 0) {
					return new Response(JSON.stringify({
						success: true,
						query: body.query,
						results: [],
						message: 'No journal entries found'
					}), {
						headers: {
							...corsHeaders,
							'Content-Type': 'application/json'
						}
					});
				}
				
				// Convert to format expected by RAG pipeline
				const journalLogs = dbEntries.results.map((entry: any) => ({
					date: entry.date,
					day: entry.day,
					text: entry.text
				}));
				
				// Import RAGPipeline
				const { RAGPipeline } = await import('./RAGPipeline.js');
				
				// Initialize RAG pipeline with journal logs
				const ragPipeline = new RAGPipeline(journalLogs);
				
				// Test all search types
				const keywordResults = await ragPipeline.performKeywordSearch(body.query, 5);
				const semanticResults = await ragPipeline.performSemanticSearch(body.query, 5);
				const hybridResults = await ragPipeline.performHybridSearch(body.query, 5);
				
				// Prepare context for AI (same as in real search)
				const context = hybridResults.slice(0, 5).map((result, index) => 
					`${index + 1}. **${result.date} (${result.day})** - Relevance: ${((result.similarity_score || result.keyword_score || result.hybrid_score || 0) * 100).toFixed(0)}%\n   "${result.text}"`
				).join('\n\n');
				
				return new Response(JSON.stringify({
					success: true,
					query: body.query,
					totalEntries: journalLogs.length,
					keywordResults: {
						count: keywordResults.length,
						results: keywordResults
					},
					semanticResults: {
						count: semanticResults.length,
						results: semanticResults
					},
					hybridResults: {
						count: hybridResults.length,
						results: hybridResults
					},
					contextForAI: context,
					allEntries: journalLogs
				}), {
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				});
				
			} catch (error: any) {
				console.error('Debug RAG search error:', error);
				return new Response(JSON.stringify({
					success: false,
					error: error.message,
					stack: error.stack
				}), {
					status: 500,
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				});
			}
		}

		if(url.pathname.startsWith('/session')){
			const userid = url.pathname.split("/")[2];
			//get the DO for this user
			const id = env.USER_SESSION.idFromName(userid);
			const obj = env.USER_SESSION.get(id);

			const response = await obj.fetch(request);
			
			// Add CORS headers to the response
			const newResponse = new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: {
					...response.headers,
					...corsHeaders
				}
			});
			
			return newResponse;
		}
		
		return new Response('Hello World! Your journal API is running.', {
			headers: corsHeaders
		});
	},
} satisfies ExportedHandler<Env>;

export { UserSession };
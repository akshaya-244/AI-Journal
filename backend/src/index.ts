// index.ts
// Worker entry with CORS-safe proxying to the Durable Object.

import { UserSession } from './UserSession';

interface Env {
  USER_SESSION: DurableObjectNamespace;
  prod_daily_logs: D1Database;
}

function buildCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*';
  const acrh = request.headers.get('Access-Control-Request-Headers') || 'Content-Type';
  const allowCreds = false; // flip to true if you need cookies across sites

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowCreds ? origin : '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': acrh,
    'Access-Control-Max-Age': '86400',
  };
  if (allowCreds) headers['Access-Control-Allow-Credentials'] = 'true';
  return headers;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(request);

    // Preflight first
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ------ Auth route: POST /auth/login ------
    if (url.pathname === '/auth/login' && request.method === 'POST') {
      try {
        const body = await request.json<{
          userId: string;
          email: string;
          name: string;
          picture?: string | null;
        }>();

		console.log("Logging in user:", body);

        await env.prod_daily_logs
          .prepare(
            `INSERT OR REPLACE INTO users (id, email, name, picture, updated_at) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
          )
          .bind(body.userId, body.email, body.name, body.picture ?? null)
          .run();
		
		  console.log("User authenticated and database updated");
		  
        return new Response(
          JSON.stringify({
            success: true,
            message: 'User authenticated and database updated',
            userId: body.userId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error?.message ?? String(error) }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ------ Debug: GET /debug/users ------
    if (url.pathname === '/debug/users') {
      try {
        const users = await env.prod_daily_logs
          .prepare(`SELECT * FROM users ORDER BY created_at DESC`)
          .all();

        return new Response(
          JSON.stringify({
            success: true,
            count: users.results?.length || 0,
            users: users.results || [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error?.message ?? String(error) }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ------ Debug: GET /debug/entries ------
    if (url.pathname === '/debug/entries') {
      try {
        const entries = await env.prod_daily_logs
          .prepare(`SELECT * FROM journal_entries`)
          .all();

        return new Response(
          JSON.stringify({
            success: true,
            count: entries.results?.length || 0,
            entries: entries.results || [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error?.message ?? String(error) }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ------ Debug: POST /debug/rag-search ------
    if (url.pathname === '/debug/rag-search' && request.method === 'POST') {
      try {
        const body = await request.json<{ query: string; userId?: string }>();

        const stmt = body.userId
          ? `SELECT entry_text as text, timestamp, 
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
              WHERE user_id = ?
              ORDER BY timestamp DESC`
          : `SELECT entry_text as text, timestamp, 
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
              ORDER BY timestamp DESC`;

        const dbEntries = body.userId
          ? await env.prod_daily_logs.prepare(stmt).bind(body.userId).all()
          : await env.prod_daily_logs.prepare(stmt).all();

        if (!dbEntries.results || dbEntries.results.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              query: body.query,
              results: [],
              message: 'No journal entries found',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const journalLogs = dbEntries.results.map((e: any) => ({
          date: e.date,
          day: e.day,
          text: e.text,
        }));

        const { RAGPipeline } = await import('./RAGPipeline.js');
        const rag = new RAGPipeline(journalLogs);

        const keywordResults = await rag.performKeywordSearch(body.query, 5);
        const semanticResults = await rag.performSemanticSearch(body.query, 5);
        const hybridResults = await rag.performHybridSearch(body.query, 5);

        const context = hybridResults
          .slice(0, 5)
          .map((r: any, i: number) => {
            const score =
              r.hybrid_score ?? r.similarity_score ?? r.keyword_score ?? 0;
            return `${i + 1}. **${r.date} (${r.day})** - Relevance: ${(score * 100).toFixed(
              0
            )}%\n   "${r.text}"`;
          })
          .join('\n\n');

        return new Response(
          JSON.stringify({
            success: true,
            query: body.query,
            totalEntries: journalLogs.length,
            keywordResults: { count: keywordResults.length, results: keywordResults },
            semanticResults: { count: semanticResults.length, results: semanticResults },
            hybridResults: { count: hybridResults.length, results: hybridResults },
            contextForAI: context,
            allEntries: journalLogs,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error?.message ?? String(error),
            stack: error?.stack,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ------ Proxy to Durable Object: /session/:userId/... ------
    if (url.pathname.startsWith('/session')) {
      const userId = url.pathname.split('/')[2];
      const id = env.USER_SESSION.idFromName(userId);
      const obj = env.USER_SESSION.get(id);

      const resp = await obj.fetch(request);

      // Merge headers correctly (cannot spread a Headers object)
      const headers = new Headers(resp.headers);
      for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      });
    }

    // Default
    return new Response('Hello World! Your journal API is running.', {
      headers: corsHeaders,
    });
  },
} satisfies ExportedHandler<Env>;

export { UserSession };

// userSession.ts
// Durable Object that handles per-user journal routes with solid CORS handling.

import { RAGPipeline, JournalEntry } from './RAGPipeline';

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

class UserSession {
  private entries: { text: string; timestamp: number }[] = [];
  private maxEntries = 50;

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const pathParts = url.pathname.split('/');
    const userId = pathParts[2]; // /session/:userId/...
    const action = pathParts[3]; // add | entries | search

    const corsHeaders = buildCorsHeaders(request);

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST /session/:userId/add
    if (method === 'POST' && action === 'add') {
      try {
        const body = await request.json<{ text: string; timestamp?: number }>();

        const entry = {
          text: body.text,
          timestamp: body.timestamp ?? Date.now(),
        };

        // In-memory cache
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) this.entries.shift();

        // Persist to D1
        await this.env.prod_daily_logs
          .prepare(
            `INSERT INTO journal_entries (user_id, entry_text, timestamp) 
             VALUES (?, ?, ?)`
          )
          .bind(userId, entry.text, new Date(entry.timestamp).toISOString())
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            entries: this.entries,
            message: 'Entry saved successfully',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to save to database',
            details: error?.message ?? String(error),
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // GET /session/:userId/entries
    if (method === 'GET' && action === 'entries') {
      try {
        const dbEntries = await this.env.prod_daily_logs
          .prepare(
            `SELECT entry_text as text, timestamp 
             FROM journal_entries 
             WHERE user_id = ? 
             ORDER BY timestamp DESC 
             LIMIT 50`
          )
          .bind(userId)
          .all();

        if (dbEntries.results && dbEntries.results.length > 0) {
          const formatted = dbEntries.results.map((e: any) => ({
            text: e.text,
            timestamp: new Date(e.timestamp).getTime(),
          }));
          return new Response(JSON.stringify(formatted), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        // fall back below
      }

      return new Response(JSON.stringify(this.entries), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /session/:userId/search
    if (method === 'POST' && action === 'search') {
      try {
        const body = await request.json<{ query: string }>();

        const dbEntries = await this.env.prod_daily_logs
          .prepare(
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
             WHERE user_id = ? 
             ORDER BY timestamp DESC`
          )
          .bind(userId)
          .all();

        if (!dbEntries.results || dbEntries.results.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              results: [],
              answer:
                'No journal entries found for this user. Start journaling to see search results!',
              message: 'No journal entries found for this user',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const journalLogs: JournalEntry[] = dbEntries.results.map((e: any) => ({
          date: e.date,
          day: e.day,
          text: e.text,
        }));

        const rag = new RAGPipeline(journalLogs);
        const searchResults = await rag.performHybridSearch(body.query, 5);
        const answer = await rag.generateAIAnswer(body.query, searchResults, this.env);

        return new Response(
          JSON.stringify({
            success: true,
            results: searchResults,
            answer,
            totalEntries: journalLogs.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Search failed',
            details: error?.message ?? String(error),
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
}

export { UserSession };

// In Cloudflare Workers, a DO is just a class with a constructor and a fetch() method. You can also use its storage API, but here you'll 
// mostly rely on in-memory state.

import { RAGPipeline, JournalEntry, SearchResult } from './RAGPipeline';

class UserSession{
    private entries: {text: string, timestamp: Number}[] = []; //array of objects
    private maxEntries = 50; //last N entries

    constructor(private state: DurableObjectState, private env: Env) {}
    
    async fetch(request: Request){
        const url = new URL(request.url);
        const method = request.method;
        const pathParts = url.pathname.split("/");
        const userId = pathParts[2]; // /session/userId/add or /session/userId/entries
        const action = pathParts[3]; // "add" or "entries"

        console.log('UserSession received:', method, url.pathname, 'userId:', userId, 'action:', action);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
        };

        // Handle OPTIONS preflight request
        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if(method === "POST" && action === 'add'){
            console.log('Processing POST /add request');
            
            try {
                const body = await request.json<{
                    text: string,
                    timestamp: number,
                    
                }>(); 
                
                console.log('Request body:', body);
                
                const entry = {
                    text: body.text,
                    timestamp: body.timestamp || Date.now()
                }

                // Store in memory (Durable Object)
                this.entries.push(entry)
                if(this.entries.length > this.maxEntries){
                    this.entries.shift(); // Remove oldest entry
                }
     
                // Insert journal entry into journal_entries table
                console.log('Inserting journal entry for user:', userId);
                const insertResult = await this.env.prod_daily_logs.prepare(
                    `INSERT INTO journal_entries (user_id, entry_text, timestamp) 
                     VALUES (?, ?, ?)`
                ).bind(
                    userId,
                    body.text,
                    new Date(entry.timestamp).toISOString()
                ).run();
                
                console.log('Journal entry inserted successfully:', insertResult);

                return new Response(JSON.stringify({
                    success: true, 
                    entries: this.entries,
                    message: 'Entry saved successfully'
                }), {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                });

            } catch (error: any) {
                console.error('Database error:', error);
                return new Response(JSON.stringify({
                    success: false, 
                    error: 'Failed to save to database',
                    details: error.message
                }), {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                });
            }
        }

        if(method === "GET" && action === 'entries'){
            console.log('Processing GET /entries request for user:', userId);
            
            try {
                // Try to get entries from D1 database first
                const dbEntries = await this.env.prod_daily_logs.prepare(
                    `SELECT entry_text as text, timestamp 
                     FROM journal_entries 
                     WHERE user_id = ? 
                     ORDER BY timestamp DESC 
                     LIMIT 50`
                ).bind(userId).all();

                console.log('Database entries found:', dbEntries.results?.length || 0);

                if (dbEntries.results && dbEntries.results.length > 0) {
                    // Convert timestamp back to number for frontend compatibility
                    const formattedEntries = dbEntries.results.map((entry: any) => ({
                        text: entry.text,
                        timestamp: new Date(entry.timestamp).getTime()
                    }));
                    
                    return new Response(JSON.stringify(formattedEntries), {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json"
                        }
                    });
                }
            } catch (error) {
                console.error('Database error when fetching entries:', error);
            }

            // Fallback to memory entries if database fails
            console.log('Falling back to memory entries:', this.entries.length);
            return new Response(JSON.stringify(this.entries), {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            });
        }

        if(method === "POST" && action === 'search'){
            console.log('Processing POST /search request for user:', userId);
            
            try {
                const body = await request.json<{
                    query: string
                }>();
                
                console.log('Search request body:', body);
                
                // Get user's journal entries from database
                const dbEntries = await this.env.prod_daily_logs.prepare(
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
                ).bind(userId).all();
        
                console.log('Found entries for search:', dbEntries.results?.length || 0);
        
                if (!dbEntries.results || dbEntries.results.length === 0) {
                    return new Response(JSON.stringify({
                        success: true,
                        results: [],
                        answer: 'No journal entries found for this user. Start journaling to see search results!',
                        message: 'No journal entries found for this user'
                    }), {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json"
                        }
                    });
                }
        
                // Convert to format expected by RAG pipeline
                const journalLogs: JournalEntry[] = dbEntries.results.map((entry: any) => ({
                    date: entry.date,
                    day: entry.day,
                    text: entry.text
                }));
        
                // Initialize RAG pipeline with user's journal logs
                const ragPipeline = new RAGPipeline(journalLogs);
                
                // Always use hybrid search for best results
                const searchResults = await ragPipeline.performHybridSearch(body.query, 5);

                // Generate AI-powered contextual answer (200 words max)
                const answer = await ragPipeline.generateAIAnswer(body.query, searchResults, this.env);
        
                return new Response(JSON.stringify({
                    success: true,
                    results: searchResults,
                    answer: answer,
                    totalEntries: journalLogs.length
                }), {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                });
        
            } catch (error: any) {
                console.error('Search error:', error);
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Search failed',
                    details: error.message
                }), {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                });
            }
        }

        console.log('Route not found:', method, url.pathname);
        return new Response("Not found", {
            status: 404,
            headers: corsHeaders
        });
    }
}

export { UserSession };
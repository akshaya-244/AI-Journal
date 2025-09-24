// In Cloudflare Workers, a DO is just a class with a constructor and a fetch() method. You can also use its storage API, but here you’ll 
// mostly rely on in-memory state.

class UserSession{
    private entries: {text: string, timestamp: Number}[] = []; //array of objects
    private maxEntries = 10; //last N entries

    constructor(private state: DurableObjectState, private env: Env) {}
    
    async fetch(request: Request){
        const url = new URL(request.url);
        const method = request.method;

        if(method === "POST" && url.pathname === '/add'){
            //.json() returns a promise so <Promise> and assume there is text in body
            const body = await request.json<{text: string}>(); 
            const entry = {
                text: body.text,
                timestamp: Date.now()
            }

            //push the log in memory
            this.entries.push(entry)

            if(this.entries.length > this.maxEntries){
                //removes the oldest element
                this.entries.shift();
            }

            const userId = url.pathname.split("/")[2]
            await this.env.prod_daily_logs.prepare(
                "INSERT INTO Users (user_id, entry_text, timestamp) VALUES (?,?,?)" 
            ).bind(userId, body.text, entry.timestamp)
            .run();
            return new Response(JSON.stringify({success: true, entries: this.entries}), {headers: {
                "Content-type": "application/json"
            }});
            
        }

        if(method === "GET" && url.pathname==="/entries"){
            return new Response(JSON.stringify(this.entries), {
                headers: {
                    "Content-type": "application/json"
                }
            });
        }

        return new Response("Not found", {
            status: 404
        })

    }
}

export { UserSession };
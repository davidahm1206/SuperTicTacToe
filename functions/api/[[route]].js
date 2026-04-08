export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  try {
    const db = env.DB || env.tictactoe;
    if (!db) {
       return new Response(JSON.stringify({ error: "Datenbank-Binding fehlt. Bitte stelle sicher, dass in den Cloudflare Pages Einstellungen ein D1 Binding mit dem Variablennamen 'DB' oder 'tictactoe' gesetzt ist." }), { status: 500, headers: corsHeaders });
    }

    // Auto-cleanup: delete games older than 30 minutes on each request
    try {
      await db.prepare("DELETE FROM games WHERE updated_at < datetime('now', '-30 minutes')").run();
    } catch(e) { /* ignore cleanup errors */ }

    // GET /api/lobbies?game=tictactoe
    if (path === "/api/lobbies" && request.method === "GET") {
      const gameType = url.searchParams.get('game') || '';
      let results;
      if (gameType) {
        const resp = await db.prepare("SELECT * FROM games WHERE state = 'waiting' AND game_type = ? ORDER BY created_at DESC").bind(gameType).all();
        results = resp.results;
      } else {
        const resp = await db.prepare("SELECT * FROM games WHERE state = 'waiting' ORDER BY created_at DESC").all();
        results = resp.results;
      }
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // POST /api/create
    if (path === "/api/create" && request.method === "POST") {
      const data = await request.json();
      const id = "srv_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000).toString();
      const gameType = data.game_type || 'unknown';
      await db.prepare("INSERT INTO games (id, game_type, name, password, state, board_data) VALUES (?, ?, ?, ?, 'waiting', ?)")
        .bind(id, gameType, data.name, data.password || "", JSON.stringify(data.board_data || {}))
        .run();
      return new Response(JSON.stringify({ id }), { headers: corsHeaders });
    }
    
    // POST /api/join
    if (path === "/api/join" && request.method === "POST") {
      const data = await request.json();
      const { results } = await db.prepare("SELECT * FROM games WHERE id = ?").bind(data.id).all();
      if (results.length > 0 && results[0].password === (data.password || "")) {
        await db.prepare("UPDATE games SET state = 'playing' WHERE id = ?").bind(data.id).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ success: false, error: "Falsches Passwort oder Spiel existiert nicht" }), { status: 403, headers: corsHeaders });
    }

    // GET /api/state/:id
    if (path.startsWith("/api/state/") && request.method === "GET") {
      const id = path.split("/")[3];
      const { results } = await db.prepare("SELECT board_data, state FROM games WHERE id = ?").bind(id).all();
      return new Response(JSON.stringify(results[0] || null), { headers: corsHeaders });
    }

    // POST /api/move/:id
    if (path.startsWith("/api/move/") && request.method === "POST") {
      const id = path.split("/")[3];
      const data = await request.json();
      await db.prepare("UPDATE games SET board_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(JSON.stringify(data.board_data), id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // POST /api/delete/:id
    if (path.startsWith("/api/delete/") && request.method === "POST") {
       const id = path.split("/")[3];
       await db.prepare("DELETE FROM games WHERE id = ?").bind(id).run();
       return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}

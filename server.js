const http = require("http");
const { Pool } = require("pg");

const PORT = process.env.PORT || 8080;
const APP_NAME = process.env.APP_NAME || "Livre d'or";
// L'adresse de la base de données, fournie par Render via une variable d'environnement
const DATABASE_URL = process.env.DATABASE_URL;
const start = Date.now();

// Connexion à la base (les hôtes externes de Render exigent SSL, les internes non)
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: /render\.com/.test(DATABASE_URL) ? { rejectUnauthorized: false } : false,
    })
  : null;
if (pool) pool.on("error", err => console.error("Erreur base de données :", err.message));

// Sans DATABASE_URL, on retombe sur la mémoire (messages perdus au redémarrage)
const memory = [];

async function init() {
  if (!pool) {
    console.log("Pas de DATABASE_URL : messages gardés en mémoire seulement");
    return;
  }
  // Crée la table au premier lancement ; ne fait rien si elle existe déjà
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  console.log("Base de données connectée");
}

async function listMessages() {
  if (!pool) return memory.slice(-50);
  const res = await pool.query("SELECT name, text FROM messages ORDER BY id DESC LIMIT 50");
  return res.rows.reverse(); // du plus ancien au plus récent
}

async function addMessage(name, text) {
  if (!pool) {
    memory.push({ name, text });
    if (memory.length > 50) memory.shift();
    return;
  }
  // $1 et $2 : la base reçoit les valeurs séparément du texte SQL (protège des injections SQL)
  await pool.query("INSERT INTO messages (name, text) VALUES ($1, $2)", [name, text]);
}

const page = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${APP_NAME}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
           max-width: 560px; margin: 0 auto; padding: 2rem 1rem; }
    input, button { font: inherit; padding: .6rem; border-radius: 8px; border: 0; }
    input { width: 100%; box-sizing: border-box; margin-bottom: .5rem; }
    button { background: #38bdf8; cursor: pointer; font-weight: 600; }
    .msg { background: #1e293b; padding: .8rem; border-radius: 8px; margin-top: .6rem; }
    .msg b { color: #38bdf8; }
  </style>
</head>
<body>
  <h1>${APP_NAME}</h1>
  <input id="name" placeholder="Ton prénom" maxlength="30">
  <input id="text" placeholder="Ton message" maxlength="140">
  <button id="send">Envoyer</button>
  <div id="list"></div>
  <script>
    async function load() {
      const res = await fetch("/api/messages");
      const data = await res.json();
      const list = document.getElementById("list");
      list.innerHTML = "";
      data.reverse().forEach(m => {
        const div = document.createElement("div");
        div.className = "msg";
        const b = document.createElement("b");
        b.textContent = m.name;
        div.append(b, " : ", document.createTextNode(m.text));
        list.append(div);
      });
    }
    document.getElementById("send").onclick = async () => {
      const name = document.getElementById("name").value.trim();
      const text = document.getElementById("text").value.trim();
      if (!name || !text) return;
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text }),
      });
      document.getElementById("text").value = "";
      load();
    };
    load();
  </script>
</body>
</html>`;

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);

  try {
    if (req.url === "/health") {
      return json(res, 200, {
        ok: true,
        db: Boolean(pool), // true = branché sur PostgreSQL, false = mémoire seulement
        uptime_seconds: Math.round((Date.now() - start) / 1000),
      });
    }

    if (req.url === "/api/messages" && req.method === "GET") {
      return json(res, 200, await listMessages());
    }

    if (req.url === "/api/messages" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 2000) return json(res, 413, { error: "message trop gros" });
      }
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return json(res, 400, { error: "JSON invalide" });
      }
      if (!data.name || !data.text) return json(res, 400, { error: "name et text requis" });
      await addMessage(String(data.name).slice(0, 30), String(data.text).slice(0, 140));
      return json(res, 201, { ok: true });
    }

    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(page);
    }

    json(res, 404, { error: "introuvable" });
  } catch (err) {
    console.error("Erreur :", err.message);
    json(res, 500, { error: "erreur serveur" });
  }
});

server.listen(PORT, () => console.log(`${APP_NAME} lancé sur le port ${PORT}`));
init().catch(err => console.error("Échec de l'initialisation de la base :", err.message));

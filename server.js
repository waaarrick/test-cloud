const http = require("http");

const PORT = process.env.PORT || 8080;
// Variable d'environnement : se règle sur Render, pas dans le code
const APP_NAME = process.env.APP_NAME || "Livre d'or";
const start = Date.now();

// Les messages vivent en mémoire : ils disparaissent à chaque redémarrage
const messages = [];

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

const server = http.createServer((req, res) => {
  // Les logs : c'est ce que tu verras dans l'onglet Logs de Render
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);

  if (req.url === "/health") {
    return json(res, 200, { ok: true, uptime_seconds: Math.round((Date.now() - start) / 1000) });
  }

  if (req.url === "/api/messages" && req.method === "GET") {
    return json(res, 200, messages);
  }

  if (req.url === "/api/messages" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 2000) req.destroy();
    });
    req.on("end", () => {
      try {
        const { name, text } = JSON.parse(body);
        if (!name || !text) return json(res, 400, { error: "name et text requis" });
        messages.push({ name: String(name).slice(0, 30), text: String(text).slice(0, 140) });
        if (messages.length > 50) messages.shift();
        json(res, 201, { ok: true });
      } catch {
        json(res, 400, { error: "JSON invalide" });
      }
    });
    return;
  }

  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(page);
  }

  json(res, 404, { error: "introuvable" });
});

server.listen(PORT, () => console.log(`${APP_NAME} lancé sur le port ${PORT}`));

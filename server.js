const http = require("http");

const PORT = process.env.PORT || 8080;
const start = Date.now();

const page = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mon premier déploiement cloud</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
           display: grid; place-items: center; min-height: 100vh; margin: 0; }
    main { text-align: center; }
    h1 { font-size: 2.5rem; margin-bottom: .5rem; }
    code { background: #1e293b; padding: .2rem .5rem; border-radius: 6px; }
  </style>
</head>
<body>
  <main>
    <h1>Ça tourne dans le cloud ☁️</h1>
    <p>Appli déployée par Warrick.</p>
    <p>Teste l'API : <code>/api/status</code></p>
  </main>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      ok: true,
      uptime_seconds: Math.round((Date.now() - start) / 1000),
      node: process.version,
    }));
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page);
});

server.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));

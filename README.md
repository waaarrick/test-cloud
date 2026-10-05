# Test cloud : déployer une appli avec Docker

## 1. En local (vérifier que ça marche)

```
docker build -t test-cloud .
docker run -p 8080:8080 test-cloud
```

Ouvre http://localhost:8080 puis http://localhost:8080/api/status

## 2. Déployer sur le cloud

### Option A : Render (le plus simple)
1. Pousse ce dossier sur un repo GitHub.
2. Sur render.com : New > Web Service > choisis ton repo.
3. Render détecte le Dockerfile tout seul. Plan gratuit, Deploy.
4. Tu obtiens une URL publique en quelques minutes.

### Option B : Google Cloud Run (le plus "vrai cloud")
1. Crée un projet sur console.cloud.google.com et active la facturation (il y a un palier gratuit).
2. Installe la CLI `gcloud`, puis :

```
gcloud auth login
gcloud run deploy test-cloud --source . --region europe-west9 --allow-unauthenticated
```

3. La commande build l'image, la déploie et te donne l'URL.

## 3. Pour aller plus loin (si ça t'accroche)
- Ajoute une variable d'environnement et lis-la dans server.js.
- Mets en place un déploiement auto à chaque push (GitHub Actions).
- Regarde les logs et les métriques dans la console du cloud.

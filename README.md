# Livre d'or cloud

Petite application web déployée en production, construite pour apprendre le cloud et le DevOps de bout en bout : code versionné, vérifié automatiquement, conteneurisé, déployé en continu et branché sur une vraie base de données.

**Démo :** https://test-cloud-2gbj.onrender.com

> La démo tourne sur des offres gratuites : le premier chargement peut prendre jusqu'à 50 secondes (le service se met en veille quand personne ne l'utilise), et la base de données gratuite est temporaire.

## Ce que fait l'application

Un livre d'or : on saisit un prénom et un message, ils sont enregistrés dans une base PostgreSQL et affichés avec leur date. Les messages survivent aux redémarrages du serveur.

## Stack

| Rôle | Outil |
|---|---|
| Serveur / API | Node.js (module `http`), bibliothèque `pg` |
| Base de données | PostgreSQL managée (Render) |
| Conteneur | Docker (`node:22-alpine`) |
| Hébergement | Render (Web Service, déploiement depuis GitHub) |
| Intégration continue | GitHub Actions |

## Architecture

```mermaid
flowchart LR
    Dev[Développeur] -->|git push| GH[GitHub]
    GH -->|déclenche| CI[GitHub Actions<br/>syntaxe + build Docker]
    GH -->|webhook| R[Render<br/>build de l'image Docker]
    R --> C[Conteneur Node.js]
    C -->|réseau interne| DB[(PostgreSQL)]
    U[Navigateur] -->|HTTPS| C
```

À chaque `git push` sur `main` : la CI vérifie le code, Render reconstruit l'image à partir du `Dockerfile` et redéploie le conteneur sur la même URL.

## API

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/` | Page web du livre d'or |
| `GET` | `/api/messages` | Liste des 50 derniers messages (JSON) |
| `POST` | `/api/messages` | Ajoute un message. Corps : `{"name": "...", "text": "..."}` |
| `GET` | `/health` | Contrôle de vie du service (`ok`, `db`, `uptime_seconds`) |

Codes de réponse : `200` / `201` succès, `400` requête invalide, `413` message trop gros, `500` erreur serveur. Limites : prénom 30 caractères, message 140.

Exemple :

```
curl -X POST https://test-cloud-2gbj.onrender.com/api/messages \
  -H "Content-Type: application/json" \
  -d '{"name":"Warrick","text":"Salut !"}'
```

## Configuration (variables d'environnement)

Aucun secret n'est dans le code ni dans GitHub.

| Variable | Rôle | Défaut |
|---|---|---|
| `DATABASE_URL` | Adresse de connexion PostgreSQL | absente : les messages restent en mémoire |
| `APP_NAME` | Titre affiché sur la page | `Livre d'or` |
| `PORT` | Port d'écoute (fourni par la plateforme) | `8080` |

## Lancer en local

Sans base de données (messages en mémoire, perdus à l'arrêt) :

```
npm install
npm start
```

Avec Docker :

```
docker build -t test-cloud .
docker run -p 8080:8080 test-cloud
```

Avec une base PostgreSQL :

```
docker run -p 8080:8080 -e DATABASE_URL="postgres://utilisateur:motdepasse@hote:5432/base" test-cloud
```

Puis ouvrir http://localhost:8080.

## Choix et points de sécurité

- Requêtes SQL **paramétrées** (`$1`, `$2`) : protège des injections SQL.
- Affichage via `textContent` côté navigateur : un message contenant du HTML ne s'exécute pas (protection XSS).
- Les détails des erreurs internes restent dans les logs ; le visiteur ne voit que « erreur serveur ».
- Connexion à la base par l'adresse **interne** de Render (hors Internet), adresse externe + SSL uniquement depuis un poste de travail.

## Ce que j'ai appris et testé

- Redéploiement qui **perd** les données (stockage en mémoire) puis qui les **conserve** (PostgreSQL).
- Changement de configuration sans toucher au code (variable d'environnement).
- Panne volontaire : faute de syntaxe détectée par la CI avant le déploiement, puis lue et corrigée dans les logs.
- Panne volontaire de la connexion à la base (`ENOTFOUND`), diagnostic dans les logs et réparation.

## Pistes d'amélioration

- Faire vérifier la vraie connexion à la base par `/health` (`SELECT 1`) au lieu de simplement tester qu'une adresse est configurée.
- Ajouter la suppression de messages et des tests automatiques dans la CI.
- Migrer la base vers une offre gratuite sans expiration (Neon, Supabase) ou vers un service cloud d'un grand fournisseur.

## Auteur

Warrick Mansoibou, étudiant en BUT MMI (IUT de Meaux).

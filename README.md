# Vox Monastica — Démo

Prototype de démonstration : un conseiller IA qui recommande des produits
d'artisanat monastique à partir de quelques critères, avec justification
personnalisée générée par l'API Claude.

## Structure du projet

```
index.html          → interface (questionnaire + affichage des résultats)
api/recommend.js     → fonction serverless qui appelle l'API Anthropic
catalog.json         → catalogue produit échantillon (12 produits)
package.json
```

## Déploiement (GitHub + Vercel)

### 1. Créer le repo GitHub

1. Sur github.com, créer un nouveau repository (par exemple `vox-monastica-demo`)
2. Via l'éditeur web GitHub ("Add file" → "Upload files" ou créer chaque
   fichier manuellement), ajouter les 4 fichiers de ce projet :
   - `index.html`
   - `catalog.json`
   - `package.json`
   - `api/recommend.js` (créer le dossier `api` en tapant `api/recommend.js`
     comme nom de fichier lors de la création)

### 2. Connecter le repo à Vercel

1. Aller sur vercel.com, se connecter avec le compte GitHub
2. "Add New..." → "Project"
3. Sélectionner le repo `vox-monastica-demo`
4. Laisser les réglages par défaut (Vercel détecte automatiquement le dossier
   `api/` comme des fonctions serverless)
5. Avant de déployer, ouvrir "Environment Variables" et ajouter :
   - Nom : `ANTHROPIC_API_KEY`
   - Valeur : votre clé API Anthropic (depuis console.anthropic.com)
6. Cliquer sur "Deploy"

### 3. Résultat

Vercel fournit une URL publique (par exemple `vox-monastica-demo.vercel.app`)
accessible depuis n'importe quel navigateur, y compris mobile.

## Notes importantes

- La clé API n'est **jamais exposée** côté navigateur : elle reste dans les
  variables d'environnement Vercel et n'est utilisée que par la fonction
  serverless `api/recommend.js`.
- Le catalogue (`catalog.json`) est volontairement limité à 12 produits pour
  la démo. Il peut être étendu facilement (ajouter des objets au même format)
  ou remplacé par une connexion à une vraie base de données (Airtable,
  Supabase, etc.) pour une version de production.
- Pensez à surveiller votre usage API (console.anthropic.com) si le lien de
  démo est partagé publiquement, pour éviter une consommation excessive.
- Pour révoquer l'accès après la démo : supprimer ou régénérer la clé API
  dans console.anthropic.com, ou supprimer la variable d'environnement sur
  Vercel.

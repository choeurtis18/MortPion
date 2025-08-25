# MortPion - Jeu de stratégie 3x3

Jeu de plateau multijoueur en temps réel inspiré d'Otrio, développé avec TypeScript, React, et Socket.io.

## 🎯 Objectif du jeu

Être le premier à réaliser l'une des conditions suivantes:
- 3 pièces de votre couleur, de même taille, alignées
- 3 pièces de votre couleur, alignées en ordre de tailles (S-M-L ou L-M-S)  
- Les 3 tailles (S+M+L) de votre couleur imbriquées dans une même case

## 🚀 Démarrage rapide

### Prérequis
- Node.js >= 18
- pnpm >= 8
- Redis (local ou Upstash)

### Installation
```bash
# Installer les dépendances
pnpm install

# Copier les fichiers d'environnement
cp apps/server/.env.example apps/server/.env
cp apps/client/.env.example apps/client/.env

# Démarrer Redis (si local)
redis-server

# Lancer le projet (client + serveur)
pnpm dev
```

### URLs
- Client: http://localhost:5173
- Serveur: http://localhost:3000
- Health check: http://localhost:3000/health

## 📁 Structure du projet

```
MortPion/
├─ apps/
│  ├─ client/        # React + Vite + Tailwind + Socket.io
│  └─ server/        # Express + Socket.io + Redis
├─ packages/
│  └─ shared/        # Types et logique de jeu partagés
├─ docs/             # Documentation (RULES.md, STACK.md)
└─ README.md
```

## 🛠️ Stack technique

- **Frontend**: React + Vite + Tailwind CSS + Zustand + Socket.io-client
- **Backend**: Node.js + Express + Socket.io + Redis + Pino
- **Shared**: TypeScript + Zod (validation)
- **Monorepo**: pnpm workspaces

## 📋 Validation de l'étape

Pour valider l'initialisation du projet:

1. ✅ Serveur démarre sur port 3000 avec route `/health`
2. ✅ Client démarre sur port 5173 avec interface "Hello"
3. ✅ Bouton "Ping Server" fonctionne (handshake Socket.io)
4. ✅ Redis connecté avec clé de test (TTL 10s)

## 🎮 Modes de jeu

- **Local**: Multijoueur sur le même écran (2-4 joueurs)
- **En ligne**: Multijoueur temps réel avec salons publics/privés

## 📚 Documentation

- [Règles complètes](./docs/RULES.md)
- [Stack technique](./docs/STACK.md)
- [Plan de développement](./docs/plan.md)

## 🔧 Commandes utiles

```bash
# Développement
pnpm dev                    # Client + serveur
pnpm --filter @mortpion/server dev    # Serveur seul
pnpm --filter @mortpion/client dev    # Client seul

# Build
pnpm build                  # Tout construire
pnpm --filter @mortpion/server build  # Serveur seul

# Tests et qualité
pnpm test                   # Tests
pnpm lint                   # Linting
pnpm type-check            # Vérification TypeScript
```

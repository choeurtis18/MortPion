# STACK TECHNIQUE — MortPion

Version: 1.0
Scope: Choix techniques, structure du dépôt, événements temps réel, persistance et raisons des choix.

---

## 1) Vue d’ensemble du stack (par défaut)
- **Langage**: TypeScript (client, serveur, shared)
- **Gestion du repo**: Monorepo `pnpm workspaces`
- **Frontend**: React + Vite + Tailwind CSS
  - État UI: Zustand (librairie de gestion d’état pour React)
  - Temps réel: `socket.io-client`
- **Backend**: Node.js + Express + Socket.io
  - Validation données: Zod (librairie de validation de données pour TypeScript/JavaScript, permet de définir des schémas de données)
  - Logs: pino (librairie de logging)
- **Persistance (éphémère)**: Redis (Upstash/Redis Cloud)
  - TTL natif pour expiration des salons (1h)
  - TTL 30s pour fenêtre de "Rejouer"
- **Shared**: package `packages/shared` (types + logique du jeu)
- **Tests**: Vitest (client/shared) + Vitest/Jest (serveur)
- **Qualité**: ESLint + Prettier
- **Déploiement**:
  - Frontend: Vercel
  - Backend: Railway (WebSocket natif)
  - Redis: Upstash (serverless)
- **Scale**: démarrage en 1 instance; ensuite `@socket.io/redis-adapter` + sticky sessions

---

## 2) Structure du dépôt (monorepo)
```
MortPion/
├─ apps/
│  ├─ client/        # React + Vite + Tailwind + socket.io-client
│  └─ server/        # Express + Socket.io + Redis + Zod + Pino
├─ packages/
│  └─ shared/        # Types, règles du jeu, détection victoire, helpers
├─ docs/             # RULES.md, plan.md, autres docs
├─ package.json      # pnpm workspaces
├─ pnpm-workspace.yaml
└─ README.md
```

---

## 3) Événements temps réel (nomenclature)
- **Lobby**: `rooms:list`, `room:create`, `room:join`, `room:leave`
- **Salle (admin)**: `room:kick`, `room:update`
- **Jeu**: `game:state`, `game:move`, `game:timer-tick`, `game:ended`
- **Replay**: `replay:vote`, `replay:update`
- **Erreurs**: `error` (code + message)

---

## 4) Persistance (Redis — schéma de clés indicatif)
- `room:{id}` → JSON état salle+jeu (EX 3600)
- `rooms:index` → set/sorted-set pour listage et "recently active"
- `room:{id}:votes` → hash des votes replay (EX 30)
- Optionnel: `socket:{id}` → `{ playerId, roomId }` pour cleanup

Rappels Règles TTL:
- Salle expire après 1h (EX 3600), TTL reset au démarrage d’une nouvelle partie
- Vote "Rejouer": fenêtre 30s (EX 30), unanimité des présents requise

---

## 5) Raisons des choix techniques
- **TypeScript partout**: cohérence des types, partage de modèles et logique
- **Monorepo pnpm**: rapidité d’install, partage de packages (shared), gestion simple
- **React + Vite + Tailwind**: DX rapide, HMR, UI mobile-first, peu de boilerplate
- **Zustand**: store minimaliste, simple à raisonner pour état UI local
- **Socket.io**: gestion WebSocket + fallback, rooms intégrées, bon écosystème
- **Express**: simplicité, écosystème mature; facile à intégrer à Socket.io
- **Zod**: validation de payloads côté serveur/partagé (schemas typed)
- **Pino**: logs performants et structurés
- **Redis**: modèle clé-valeur simple avec TTL natif pour salons et fenêtres temporelles
- **Upstash/Redis Cloud**: hébergement managé serverless/simple pour démarrer
- **Scaling Socket.io**: adapter Redis + sticky sessions quand on scale horizontalement

---

## 7) Critères de validation du stack (acceptance)
- Serveur `apps/server` démarre (Express+Socket.io) + route GET `/health` → 200
- Client `apps/client` démarre (Vite) → UI "Hello" + bouton "Ping server"
- Clic "Ping server" → handshake Socket.io, réception `pong`
- Redis connecté → set + expire d’une clé de test visible en logs

---

## 8) Étapes suivantes
1. Initialiser monorepo (`pnpm workspaces`)
2. Créer `apps/server` (Express+Socket.io, `/health`)
3. Créer `apps/client` (Vite+React+Tailwind) + bouton "Ping server"
4. Intégrer Redis (URL env) + clé test avec EX
5. Créer `packages/shared` (types + logique règles de base)

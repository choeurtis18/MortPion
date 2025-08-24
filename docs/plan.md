# Otrio Web Multiplayer Project

## Notes
- Web-based, real-time, multiplayer board game inspired by Otrio; do not use the “Otrio” trademark. Each player has a color and 3 square sizes (S/M/L) that can nest.
- Board: 3x3. Win if: (a) 3 same-size of your color aligned, (b) 3 sizes in strict order (S-M-L or L-M-S) of your color aligned, or (c) S+M+L of your color stacked in one cell.
- 2–4 players. Draw only if no legal moves remain (all S/M/L slots across the board are occupied).
- Modes: Local (same screen) and Online (multi-screen).
- Lobby: rooms are public or private; private rooms are listed but require a code on click. Each room has a human-readable name. Search by name (case-insensitive) and filter by public/private. Show status (Waiting/In-game). Sort by recently active.
- Online flow: game auto-starts when capacity reached. If host leaves in lobby, transfer host to earliest joiner; if empty, close room.
- Turn timer: 60s per turn → auto-skip on timeout; immediate skip if the player has no legal move. Optional anti-abuse: elimination after N consecutive skips (off by default).
- Disconnections: explicit leave in-game = forfeit; network disconnect keeps the seat, timer runs and may skip; reconnection allowed before room expires.
- Replay: Local = instant restart. Online = 30s vote; unanimity of present players → restart with same players; otherwise close.
- Room expiration: TTL 1h; reset TTL when a new game starts; close if no unanimous replay.
- Server authoritative; hash private codes; rate-limit room creation/join; minimal logging.

## Task List
- [x] Définir précisément les règles et conditions de victoire (validation)
- [x] Définir les modes de jeu : local (multi-joueurs sur le même écran, web uniquement) et multijoueur en ligne (salons, code d'accès, nombre de joueurs, expiration, pseudo) (validation)
- [x] Choisir le stack technique (validation)
- [x] Initialiser la structure du projet (validation)
- [x] Développer la logique du jeu côté serveur (validation)
- [x] Implémenter la détection des 3 conditions de victoire + nul (aucun coup légal possible) (validation)
- [ ] Implémenter l’imbrication/validations (poses légales/illégales, skip automatique si aucun coup) (validation)
- [ ] Implémenter le lobby: création salle (nom, capacité 2–4, public/privé+code), listage, recherche (insensible à la casse), filtres, statuts (validation)
- [ ] Implémenter le join privé par code + erreurs (mauvais code, salle pleine) (validation)
- [ ] Gérer hôte et départs: transfert d’hôte en lobby, forfait en jeu, déconnexions/reconnexions (validation)
- [ ] Timer 60s par tour → skip, anti‑abus N skips (optionnel) (validation)
- [ ] Rejouer 30s (unanimité des présents) + reset TTL (validation)
- [ ] Expiration des salles TTL 1h + cleanup (validation)
- [ ] Créer une interface utilisateur simple pour le plateau et les pièces (validation)
- [ ] Implémenter la communication temps réel (WebSocket/Socket.io) (validation)
- [ ] Connecter l'interface au backend et synchroniser les états de jeu (validation)
- [ ] Tester une partie multijoueur complète (validation)
- [ ] Déployer la version beta pour retours utilisateurs (validation)

## Current Goal
Choisir le stack technique et la persistance (ex. Redis pour état éphémère)
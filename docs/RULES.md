# RÈGLES – Jeu 3x3 à carrés imbriquables (style Otrio)

Version: 1.2 (MVP)  
Portée: Règles de jeu, mécaniques, modes Local et Multijoueur (2–4 joueurs), lobby et timers.  
Note PI: Ne pas utiliser la marque “Otrio”. Ici, chaque joueur a une couleur et des carrés de trois tailles (petit, moyen, grand) qui peuvent s’imbriquer.

---

## 1) Objectif
Être le premier à réaliser la condition suivante:
- 3 pièces de votre couleur alignées (ligne/colonne/diagonale), basé sur les pièces visibles.

**Note importante:** Seules les pièces visibles comptent pour l'alignement (la plus grande pièce dans chaque case). Si une pièce d'une couleur différente et de taille supérieure est présente dans l'alignement, elle interfère et empêche la victoire.

Si aucune condition n'est atteinte et qu'aucun coup légal n'est possible, la partie est nulle.

---

## 2) Composants
- Plateau: grille 3x3 (9 cases).
- Joueurs: 2 à 4, chacun une couleur distincte.
- Pièces par joueur: 9 carrés (3× petit, 3× moyen, 3× grand) dans sa couleur.

---

## 3) Imbrication et poses
- Une case peut contenir jusqu’à 3 carrés, au plus un par taille (P/M/G).
- Dans une même case:
  - Il est interdit d’avoir deux carrés de la même taille (toutes couleurs confondues).
  - Des couleurs différentes peuvent coexister si les tailles sont différentes.
  - L’imbrication suit l’ordre logique: petit dans moyen, moyen dans grand.
- Une pièce posée ne se déplace pas et n’est pas capturée.

---

## 4) Déroulement d’une partie
- Mise en place:
  - Chaque joueur choisit sa couleur et reçoit 3 P, 3 M, 3 G.
  - Premier joueur déterminé aléatoirement.
- Tour de jeu:
  - Le joueur actif choisit une de ses pièces restantes (P/M/G) et la pose dans une case autorisée.
  - Validation immédiate; vérification des conditions de victoire.
- Fin:
  - Victoire: si une condition de l’objectif est remplie à la fin du tour.
  - Nul: si aucun coup légal n’est possible (tous les slots P/M/G de toutes les cases sont occupés).

---

## 5) Détection de victoire (détails)
- Alignements valides: 3 lignes, 3 colonnes, 2 diagonales (8 au total).
- **Condition unique**: 3 pièces de la même couleur alignées, basé sur les pièces visibles dans chaque case.
- **Pièce visible**: Dans chaque case, seule la plus grande pièce (G > M > P) est considérée comme visible.
- **Interférence**: Si une pièce d'une couleur différente et de taille supérieure est présente dans l'alignement, elle empêche la victoire.
- Une pose peut déclencher la victoire; la partie s'arrête dès qu'une victoire est détectée.

---

## 6) Coups illégaux et cas particuliers
- Poser hors tour, sur case invalide (taille déjà présente), ou après fin de partie: refusé.
- Si un joueur n’a plus de coups légaux (toutes ses tailles restantes n’ont aucun slot libre), son tour est immédiatement sauté (skip auto).
- À 3–4 joueurs, si un joueur quitte (forfait), ses pièces déjà posées restent; son inventaire restant disparaît.

---

# Modes

## 7) Mode Local (même écran)
- 2 à 4 joueurs sur le même appareil.
- Étapes:
  1) Saisie des pseudos et choix des couleurs.
  2) Partie selon les règles ci-dessus.
  3) Écran de résultat + bouton “Rejouer” (relance instantanée avec les mêmes joueurs/couleurs) + bouton "Accueil" (retour au lobby).

---

## 8) Mode Multijoueur (en ligne)

### 8.1 Salles et visibilité (Lobby)
- Chaque salle possède:
  - Un nom (non nécessairement unique).
  - Un type: publique ou privée (avec code d’accès).
  - Une capacité: 2 à 4 joueurs.
  - Un hôte (créateur).
- Listing:
  - Les salles publiques ET privées sont listées.
  - Les salles privées affichent un badge “verrou”.
  - Le nom des salles privées est visible
  - Recherche par nom (insensible à la casse et idéalement aux accents).
  - Filtres: 
    - Toutes / Publiques / Privées.
    - Capacité (2/3/4).
    - Actif récemment.
  - Statuts affichés: En attente / En jeu

### 8.2 Rejoindre une salle
- Publique: clic → rejoindre immédiat (si place).
- Privée: clic → modal code → si code correct, rejoindre; sinon erreur.
- Si la salle devient pleine pendant la tentative → afficher “Salle complète”.

### 8.3 Lobby de salle
- Démarrage: la partie commence automatiquement quand la capacité est atteinte.
- Hôte:
  - Peut quitter le lobby; s’il part:
    - S’il reste des joueurs: transfert d’hôte au plus ancien membre (ordre d’arrivée).
    - Si personne ne reste: fermeture de la salle.
    - Bouton “expulser” disponible pour l’hôte.
- Joueurs quittant le lobby: retirés de la salle; la salle reste en attente jusqu’à capacité atteinte.

### 8.4 En jeu (temps réel)
- Serveur autoritaire:
  - Gère le tour actif, valide les poses, applique les règles d’imbrication.
  - Rejette actions hors tour, coups illégaux, actions post‑fin.
- Timer par tour:
  - 60 secondes par tour. Le compte à rebours démarre au début du tour du joueur actif.
  - À 60s, si aucun coup légal joué: skip automatique et passage au joueur suivant.
  - Skip immédiat si le joueur n’a aucun coup légal disponible.
- Anti-abus: élimination après N skips consécutifs (recommandé N=2).
- Déconnexions / départs:
  - Quitter explicitement en jeu:
    - À 2 joueurs: l’adversaire gagne par forfait.
    - À 3–4 joueurs: le joueur est éliminé, ses pièces restent, la partie continue.
  - Déconnexion (perte réseau):
    - Le siège reste réservé. Si c’est son tour, le timer continue puis peut skip.
    - Reconnexion possible tant que la salle n’a pas expiré et que le joueur n’est pas éliminé (par le système anti-abus).

### 8.5 Fin, Rejouer, Expiration
- Fin: affichage du résultat (victoire/nul).
- Rejouer (vote):
  - Fenêtre de 30 secondes où chaque joueur PRÉSENT vote “Rejouer”.
  - Unanimité requise des joueurs présents au moment du vote.
  - Si unanimité: nouvelle partie avec les mêmes joueurs/couleurs et un nouveau starter.
  - Sinon: la salle se ferme.
- Expiration des salles:
  - TTL (Time To Live) = 1 heure. Le TTL est réinitialisé au lancement d’une nouvelle partie.
  - Une salle se ferme si pas de rejouer unanime à la fin d’une partie.
  - Fermer immédiatement si tous les joueurs quittent.
  - Si la salle est vide, elle se ferme.
- Accueil: bouton "Accueil" pour quitter la salle et retourner au lobby.

---

# Arbitrage serveur et calculs

## 9) Validation d’une pose
1) Vérifier “tour actif”.  
2) Vérifier que la case ciblée n’a pas déjà la même taille (toutes couleurs).  
3) Appliquer la pose; décrémenter l’inventaire du joueur pour la taille posée.

## 10) Détection de victoire
- Lignes gagnantes: [0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6].
- Tester, après chaque pose:
  - Alignement “même taille & même couleur”.
  - Alignement “ordre de tailles” (PMG ou GMP) de la même couleur.
  - “Trio imbriqué” (P+M+G de la même couleur dans une case).
- Si victoire: marquer terminé; bloquer les nouvelles actions.

## 11) Détection de nul
- Si aucun coup légal n’est possible pour l’ensemble des joueurs (tous les slots P/M/G sont occupés) ET aucune victoire: nul.

---

# Paramètres par défaut (MVP)
- Joueurs: 2 (extensible 3–4).
- Premier joueur: tirage au sort; alternance au “Rejouer”.
- Salles privées: listées, code requis à l’entrée.
- Recherche: insensible à la casse; filtres Public/Privé, Capacité (2/3/4), Actif récemment.
- Timer tour: 60s → skip; skip immédiat si aucun coup légal.
- Anti‑abus “N skips = élimination” (reco N=2).
- Replay: fenêtre 30s; unanimité des présents.
- Expiration salle: TTL 1h; reset du TTL au démarrage d’une partie.

---

# Glossaire
- Case: emplacement du 3x3; contient 0–3 carrés (P/M/G).
- Slot: position de taille (P, M ou G) dans une case.
- Skip: passage de tour sans jouer (timeout ou aucun coup légal).
- Forfait: abandon explicite; entraîne victoire de l’adversaire (à 2) ou élimination (à 3–4).
- Salle: instance multijoueur contenant lobby + partie + règles d’expiration.

---

## Annexe A — Schéma de données indicatif (implémentation)

- Cell:
  - P: couleur | null
  - M: couleur | null
  - G: couleur | null
- Player:
  - id, nickname, color, inventory {P,M,G}, connected, skipsInARow, isEliminated, isHost, isWinner, isForfeited, isDisconnected, isReconnecting
- Room:
  - id, name, isPrivate, isFull, codeHash, hostId, capacity (2–4)
  - players[], board[9]: Cell
  - turnPlayerId, status: waiting|playing|finished
  - createdAt, expiresAt, replayVotes (playerId → bool)

Note: Hash du code côté serveur; rate‑limit sur tentatives; nettoyage des salles vides; tri “récemment actives” dans le lobby; TTL (time to live) = 1h; reset TTL au démarrage d’une partie; fermer immédiatement si tous les joueurs quittent; si la salle est vide, elle se ferme.

---

# Test Scenario - Partie Multijoueur Complète

## Objectif
Tester toutes les fonctionnalités implémentées dans une partie multijoueur réelle.

## Scénario de test

### 1. Création et lobby
- [x] Créer une salle privée avec code
- [x] Afficher le code d'accès dans la modal
- [x] Rejoindre la salle avec le code
- [x] Vérifier l'interface du lobby
- [x] Démarrage automatique à 2 joueurs

### 2. Gameplay et imbrication
- [ ] Tester les poses P/M/G avec imbrication
- [ ] Vérifier l'affichage des pièces superposées
- [ ] Tester les coups illégaux (taille déjà présente)
- [ ] Vérifier l'inventaire des joueurs

### 3. Mécaniques avancées
- [ ] Skip automatique si aucun coup légal
- [ ] Timer de 60s par tour
- [ ] Élimination après 2 skips consécutifs
- [ ] Détection de victoire (3 pièces alignées)
- [ ] Détection de match nul

### 4. Fonctionnalités multijoueur
- [ ] Affichage du tour actuel
- [ ] Modal des joueurs et leurs pièces
- [ ] Vote de replay (unanimité)
- [ ] Bouton retour au lobby

### 5. Tests de déconnexion
- [ ] Déconnexion en lobby (transfert d'hôte)
- [ ] Déconnexion en jeu (skip automatique)
- [ ] Reconnexion possible

## Résultats attendus
- Partie fluide sans bugs
- Interface claire et responsive
- Toutes les règles respectées
- Gestion des cas d'erreur

# Party Games

Projet de plateforme de jeux de soirée : un hôte lance des jeux sur un écran partagé (ordinateur ou télévision), et les participants rejoignent la session depuis leur smartphone. Certains jeux pourront aussi se jouer sans téléphone.

## État du projet

Le dépôt contient le socle technique, l’infrastructure E2E multijoueur et les premiers parcours hôte/joueur. Depuis l’accueil, l’hôte crée une room ; les participants choisissent « Rejoindre une room » et saisissent son code et leur pseudo. L’hôte et les joueurs voient la même liste actualisée en direct. L’atelier reste disponible sur `/design`. Le rechargement reprend la session dans le même onglet ; les joueurs peuvent quitter la room et l’hôte peut la fermer pour tous. Le quiz propose cinq questions à deux joueurs minimum : l’hôte révèle les réponses et fait avancer la partie, puis tous voient le classement final. Le retour au même lobby permet de rejouer avec des scores remis à zéro. Le chronomètre et la révélation automatique restent à développer.

## Documentation

- [Instructions pour les agents IA](AGENTS.md)
- [Vision produit](docs/PRODUCT.md)
- [Direction artistique et validation du design system](docs/DESIGN.md)
- [Architecture et décisions ouvertes](docs/ARCHITECTURE.md)
- [Conventions de collaboration](docs/CONVENTIONS.md)
- [Développement local et vérifications](docs/DEVELOPMENT.md)
- [Ajouter un jeu](docs/ADDING_A_GAME.md)
- [Roadmap d’implémentation](docs/ROADMAP.md)

## Démarrage local

Prérequis : Node 24 et pnpm 9.15.9.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir l’URL LAN affichée pour accéder depuis un téléphone du même réseau ; `localhost` n’est pas l’adresse de l’ordinateur hôte sur les autres appareils.

- `pnpm check` : lint, typage strict, tests et compilation.
- `pnpm exec playwright install chromium` puis `pnpm test:e2e` : tests navigateur.
- `pnpm build` puis `pnpm start` : application compilée sur le port 3000.

Rooms et sessions sont en mémoire : redémarrer le serveur perd toutes les parties. Exécution sur un LAN de confiance, sans compte ni hébergement public.

## Contribuer

Consulter les conventions avant de commencer. Discuter les décisions métier et proposer un plan avant un changement architectural. Documenter les décisions validées et leurs raisons.

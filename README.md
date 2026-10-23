# Party Games

Projet de plateforme de jeux de soirée : un hôte lance des jeux sur un écran partagé (ordinateur ou télévision), et les participants rejoignent la session depuis leur smartphone. Certains jeux pourront aussi se jouer sans téléphone.

## État du projet

L’hôte crée une room depuis l’accueil et invite les téléphones par QR, lien ou code. Le lobby représente les connexions autour d’un moniteur. Le catalogue propose le quiz historique et quatre jeux : **Qui de nous ?**, **Le menteur**, **D’où provient cette image ?** et **À vos crayons**.

Les nouveaux jeux enchaînent automatiquement leurs phases, révèlent les résultats et gardent le classement final jusqu’au retour au lobby. Le quiz conserve sa progression pilotée par l’hôte. Les téléphones utilisent des formes colorées pour les choix fixes ; les textes restent sur la télévision.

L’hôte peut importer des packs ZIP, télécharger leurs modèles et retirer les imports inutilisés. La bibliothèque est commune aux rooms jusqu’au redémarrage. Les contenus intégrés comprennent 20 questions sociales, 20 questions de bluff, 30 illustrations originales et 40 mots à dessiner. L’atelier reste accessible sur `/design`.

Les règles, paramètres et limites sont décrits dans [GAMES.md](docs/GAMES.md). La validation automatisée est distincte de la recette sur TV et appareils physiques.

## Documentation

- [Instructions pour les agents IA](AGENTS.md)
- [Vision produit](docs/PRODUCT.md)
- [Direction artistique et validation du design system](docs/DESIGN.md)
- [Architecture et décisions ouvertes](docs/ARCHITECTURE.md)
- [Conventions de collaboration](docs/CONVENTIONS.md)
- [Développement local et vérifications](docs/DEVELOPMENT.md)
- [Ajouter un jeu](docs/ADDING_A_GAME.md)
- [Règles des jeux et contenus](docs/GAMES.md)
- [Recette des nouveaux jeux](docs/RECETTE-JEUX.md)
- [Roadmap d’implémentation](docs/ROADMAP.md)
- [Recette locale sur TV et smartphones](docs/RECETTE.md)

## Démarrage local

Prérequis : Node 24 et pnpm 9.15.9.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir l’URL localhost affichée sur l’ordinateur hôte : l’application détecte l’adresse LAN pour générer le lien et le QR destinés aux téléphones du même Wi-Fi. Si plusieurs adresses sont détectées, choisir celle du réseau partagé. L’URL LAN affichée reste utilisable directement ; `localhost` ne doit pas être saisi sur les téléphones.

- `pnpm check` : lint, typage strict, tests et compilation.
- `pnpm exec playwright install chromium` puis `pnpm test:e2e` : tests navigateur.
- `pnpm build` puis `pnpm start` : application compilée sur le port 3000.

Rooms et sessions sont en mémoire : redémarrer le serveur perd toutes les parties. Exécution sur un LAN de confiance, sans compte ni hébergement public.

## Contribuer

Consulter les conventions avant de commencer. Discuter les décisions métier et proposer un plan avant un changement architectural. Documenter les décisions validées et leurs raisons.

# Conventions de développement collaboratif

## Périmètre et décisions

- Lire la documentation concernée avant de commencer une tâche.
- Garder chaque contribution ciblée et expliciter son objectif.
- Distinguer les exigences validées des propositions et hypothèses.
- Faire valider les décisions métier et les changements architecturaux ; consigner les choix retenus dans la documentation.
- Actualiser les documents concernés dans la même contribution que les changements qu'ils décrivent.

## Collaboration Git

- Travailler sur une branche dédiée à un objectif clairement nommé.
- Utiliser le préfixe `codex/` pour les branches créées par les agents IA ; la convention des autres branches reste à convenir.
- Préparer des commits cohérents avec des messages qui décrivent le changement et son intention.
- Présenter les contributions dans une demande de revue avec le problème, le résultat, les vérifications et les éventuelles limites.
- Ne pas écraser le travail d'autres contributeurs. Coordonner les changements concurrents et résoudre les conflits en préservant leur intention.
- Le modèle de branches, les protections, la politique de fusion et les validations obligatoires restent à définir.

## Documentation et code futur

- Rédiger la documentation du projet en français, avec des liens relatifs dans le dépôt.
- Employer des noms explicites et suivre les conventions du code existant lorsqu'il sera créé.
- Éviter les dépendances et abstractions sans besoin identifié.
- TypeScript strict, modules ESM, imports de types explicites ; imports relatifs Node avec extension `.js`, alias `@/` dans le frontend.
- Noms explicites en anglais dans le code ; composants React en PascalCase, fichiers de services en kebab-case. Tests Vitest en `*.test.ts`, Playwright en `*.spec.ts`.
- ESLint vérifie le code sans réécriture automatique ; éviter `any`. Ne pas importer les sources privées d’un autre package : utiliser ses exports.
- Conserver les dépendances internes en `workspace:*` et les tokens visuels dans la feuille de styles centrale.

## Vérification

- Exécuter les tests disponibles et les contrôles pertinents avant de proposer une contribution.
- Pour la documentation, vérifier la cohérence, les liens locaux et l'absence de décisions présentées à tort comme acquises.
- Indiquer ce qui a été vérifié et ce qui n'a pas pu l'être. Le socle dispose de tests Vitest et Playwright ; voir [le guide de développement](DEVELOPMENT.md).
- Tester les règles des jeux, la confidentialité des projections et les interactions entre appareils. Exécuter `pnpm check` et les tests navigateur pour les changements d’interface ou de transport.

## Configuration et données

- Ne jamais versionner de secrets, jetons, identifiants de connexion ou données personnelles de participants.
- Si des variables d'environnement deviennent nécessaires, documenter leur rôle et fournir un fichier d'exemple sans valeurs sensibles.
- Une fois le gestionnaire de paquets choisi, versionner son fichier de verrouillage et éviter les fichiers de verrouillage concurrents.

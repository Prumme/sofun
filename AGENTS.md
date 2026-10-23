# Instructions pour les agents IA

## Contexte et sources

- Consulter le README et la documentation pertinente dans `docs/` avant toute modification.
- Consulter la [direction artistique](docs/DESIGN.md) avant toute modification visuelle importante ou création d’interface. Lors de l’initialisation du frontend, prévoir la page de démonstration décrite dans ce document pour valider le design system avant de construire les pages de l’application.
- Respecter le périmètre demandé et distinguer les exigences confirmées, les propositions et les décisions encore ouvertes.
- Ne pas inventer de décisions métier. Demander une clarification lorsqu'une ambiguïté bloque le travail ; sinon expliciter les hypothèses sans les présenter comme acquises.
- Les choix techniques ne sont pas définitifs tant qu'ils ne sont pas explicitement validés et consignés dans `docs/ARCHITECTURE.md`.

## Modifications

- Privilégier les modifications ciblées, cohérentes avec l'existant. Éviter les refontes, dépendances et changements sans rapport avec la demande.
- Avant un changement architectural, proposer un plan précisant le problème, les options, les compromis et les impacts, puis obtenir la validation de l'équipe avant de l'appliquer.
- Mettre à jour la documentation concernée lorsque le comportement, les conventions ou les décisions évoluent.
- Ne pas écraser les modifications d'autres contributeurs et ne pas publier de secrets ou de données personnelles.

## Vérification et compte rendu

- Exécuter les tests disponibles et les vérifications pertinentes pour les fichiers modifiés.
- Consulter la [roadmap](docs/ROADMAP.md). Dès R2, accompagner chaque fonctionnalité multijoueur de tests Playwright avec des `BrowserContext` indépendants ; dès R5, automatiser une partie complète. Vérifier les comportements visibles par les utilisateurs, sans attentes temporelles arbitraires.
- Si aucun test ou outil de vérification n'est configuré, le signaler ; ne pas prétendre avoir exécuté des tests et ne pas installer d'outillage sans demande.
- Résumer les changements, les vérifications effectuées, leurs limites et les points restant à valider.

## Périmètre actuel

Le socle technique a été autorisé le 22 octobre 2026 : monorepo TypeScript strict, React/Vite, Tailwind/shadcn, NestJS, Socket.IO, Zod, pnpm, Vitest et Playwright. Consulter [l’architecture validée](docs/ARCHITECTURE.md) et [le guide de développement](docs/DEVELOPMENT.md).

Le socle, l’atelier, l’infrastructure E2E R0, la création de room hôte R1, l’admission des joueurs R2 et le cycle de vie du lobby R3 sont implémentés. R4/R5 livrent un quiz de cinq questions avec révélation manuelle, classement final et retour au lobby pour rejouer. Le temps autoritaire reste R6 et la résilience en partie R7. Ne pas étendre ce périmètre sans demande. Préserver les frontières entre contrats publics, SDK interne et état serveur privé.

Exécuter `pnpm check` ; ajouter `pnpm test:e2e` pour les changements d’interface ou de transport. Les branches des agents utilisent `codex/`.

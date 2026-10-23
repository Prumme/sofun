# Ajouter un jeu

1. Définir les règles, les acteurs autorisés, les informations privées et les conditions de fin. Faire valider les décisions métier avant de coder.
2. Ajouter dans `packages/contracts/src/games/` les schémas Zod de configuration, d’intentions et de vues réseau ; exporter les contrats nécessaires. Aucun état interne secret dans ce package.
3. Ajouter un dossier dans `apps/server/src/games/`. Implémenter `GameDefinition` du SDK puis l’adapter avec `defineGame` et l’enregistrer dans le registre serveur.
4. Écrire `setup`, `handleAction`, `handleTimer` et `project`. Retourner des transitions sans mutation, utiliser le contexte pour temps/hasard, et déclarer les effets de minuterie. Ne pas importer les services réseau/stockage ou un autre jeu.
5. Tester règles, actions interdites, projections pour deux joueurs et l’hôte, fins de partie et minuteries. `apps/server/test/fixtures/game.ts` est un exemple technique réservé aux tests.
6. Ajouter les vues web et les enregistrer explicitement. Suivre les tokens et composants de [DESIGN.md](DESIGN.md). Une vue émet des intentions et affiche la projection validée ; elle ne détermine jamais les résultats autoritaires.
7. Ajouter les tests de bout en bout du parcours et documenter les règles.

L’écran partagé agit comme hôte, y compris pour les jeux sans téléphone. Il ne reçoit pas automatiquement les secrets des joueurs. La V1 autorise seulement la reprise des joueurs existants pendant une partie ; les nouvelles admissions se font au lobby.

Les événements internes du moteur ne constituent pas un bus public. Ajouter un nouvel effet (audio serveur, I/O, etc.) exige de définir sa responsabilité et son comportement en cas d’échec avant de modifier le SDK.

Le module `apps/server/src/games/quiz/quiz.ts` est le premier exemple de production. Il n’active pas `finished` à la révélation afin de garder les résultats visibles. Le contrôle de révision reste strict par défaut : n’activer `actionConcurrency: 'game-validated'` qu’avec une validation métier des intentions périmées (question/phase, acteur, doublon) et ses tests, comme le quiz R4. Le simple assouplissement d’une révision sans garde métier est insuffisant.

Pour une phase finale persistante, suivre le quiz R5 : exposer `results` sans `finished`, puis retourner `finished: true` seulement sur l’action hôte de retour au lobby. Le nettoyage de la partie et des départs est assuré par les rooms existantes. Les intentions de progression doivent viser une question/phase précise pour qu’un double envoi ne saute pas d’étape.


## Jeux avec contenus préparés

Les quatre nouveaux jeux reçoivent leurs entrées privées via `GameSetupContext.content`, résolu et copié côté rooms avant `setup`. Ne pas lire `ContentLibrary` depuis une transition ni accepter des vérités fournies dans `game:start`. Les fichiers de pack sont validés côté serveur ; les contrats publics ne contiennent que configuration, intentions et projections.

Le catalogue serveur et l’affichage frontend sont explicites. Enregistrer le jeu serveur, ses métadonnées, son contrat de configuration et son rendu frontend ; n’exposer que les jeux effectivement jouables. Les exemples sociaux, bluff, images et dessin couvrent les minuteries de phase et le classement persistant. Les helpers communs ne constituent pas un moteur générique de phases.

Les lots de dessin sont des intentions comme les autres : rôle, tour, version, séquence, quantité et cadence sont validés avant application. Ne jamais publier l’état interne ou les trois mots à tous les participants. Les images publiques sont référencées par identifiant opaque, sans exposer le manifeste privé.

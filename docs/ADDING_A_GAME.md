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

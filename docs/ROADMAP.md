# Roadmap d’implémentation — Party Games

## Statut et méthode

Roadmap validée par le propriétaire du projet, enrichie de R0 avant la reprise de R1. Le développement est réalisé par une personne avec l’assistance d’agents IA. Chaque tâche constitue une contribution ciblée, avec des critères d’acceptation et ses tests dans la même contribution.

Le monolithe modulaire TypeScript existant est conservé. Ne pas recréer les services de rooms, de sessions ou le moteur ; relier progressivement l’interface aux capacités existantes. Aucune fonctionnalité métier de R1 à R9 n’est développée dans R0.

## État de départ audité

- Monorepo, validation Zod, backend NestJS/Socket.IO et stockage mémoire opérationnels.
- Rooms, sessions, déduplication, projections privées et minuteries couverts par des tests unitaires et d’intégration.
- Frontend limité à l’atelier du design system et à une connexion réelle au serveur.
- Registres de jeux vides ; aucun quiz, score, classement, écran de room ou QR code.
- Audit initial : `pnpm check` réussi (13 tests Vitest), puis 6 tests Playwright réussis sur le build compilé. Ces résultats précèdent l’ajout de R0.
- Recette sur vrais smartphones et télévision, capacité cible et compatibilité hors Chromium à vérifier.

Deux points sont à traiter au moment du quiz : le contrôle strict de la révision globale peut refuser des réponses concurrentes valides ; `finished` efface immédiatement le jeu, ce qui impose de conserver une phase de résultats avant le retour au lobby. Aucun changement du moteur n’est effectué par R0.

## Premier quiz visé

Un hôte distinct et au moins deux joueurs individuels. Cinq questions françaises embarquées côté serveur, quatre choix et une bonne réponse. Une réponse définitive par joueur et par question ; un point par bonne réponse, sans bonus de vitesse. Vingt secondes par question, révélation lorsque tous ont répondu ou à l’échéance, puis passage à la suivante par l’hôte. Solutions et réponses des autres joueurs masquées avant révélation. Classement final avec égalités, retour au même lobby et possibilité de rejouer.

Les participants sont fixés au lancement. Une déconnexion conserve l’identité et le score sans suspendre le temps ; une absence de réponse vaut zéro point. Comptes, équipes, éditeur de questions, statistiques persistantes et autres jeux restent hors de cette première livraison.

## R0 — Infrastructure Playwright multijoueur

**Statut : implémentée et vérifiée.** `pnpm check` réussi (13 tests Vitest), `pnpm test:e2e` réussi (10 tests), puis `pnpm exec playwright test --repeat-each=2` réussi (20 passages). Un échec volontaire temporaire a confirmé la production de trois captures, d’une archive de traces multicontexte et du rapport HTML ; ce test de contrôle a ensuite été retiré.

**Objectif :** permettre aux agents de tester automatiquement les futurs parcours avec un hôte et plusieurs participants dans des `BrowserContext` indépendants.

**Dépendances :** socle existant uniquement. **Livraison :** infrastructure, tests de chargement/isolation navigateur et documentation ; pas de création de room ni de partie.

### Travail prévu

- Réutiliser Playwright, `playwright.config.ts` et la commande racine `pnpm test:e2e`, déjà présents ; aucune configuration concurrente ni dépendance supplémentaire.
- Compiler le frontend et le backend puis démarrer un processus Nest dédié aux tests, servant aussi React et Socket.IO, sans charger le fichier `.env` de développement.
- Vérifier la santé du backend et la disponibilité du HTML frontend avant les tests ; vérifier ensuite le rendu et la connexion via l’interface.
- Fournir une fixture `createActors(playerCount)` : un hôte desktop et des participants mobiles, chacun avec sa page et son contexte isolé ; fermer tous les contextes après le test, y compris après échec.
- Commencer avec un seul worker, sans parallélisme ni retries masquant une instabilité.
- Conserver les traces et captures sur échec, produire un rapport HTML et documenter leur consultation.
- Utiliser des attentes sur les éléments ou états observables, sans `waitForTimeout` arbitraire ni service externe.

### Critères d’acceptation

- Un smoke test charge l’application réelle avec un hôte et deux participants, vérifie leur connexion visible et leurs interactions de formulaire indépendantes.
- Les cookies, `localStorage`, `sessionStorage` et identifiants de session ne sont pas hérités d’un autre acteur ou groupe.
- Plusieurs passages consécutifs de la suite réussissent sans intervention humaine.
- Les échecs produisent des traces et captures consultables, y compris pour les contextes créés par la fixture.
- Les sources applicatives et les fonctionnalités de R1 à R9 restent inchangées.

### Isolation des futures rooms

Chaque exécution démarre son propre serveur mémoire, sans réutiliser un serveur de développement. Chaque test reçoit de nouveaux contextes sans session préchargée. À partir de R1/R2, les scénarios créeront leur propre room via l’interface et utiliseront uniquement le code obtenu ; aucun code ou token fixe et aucun endpoint artificiel de reset. À partir de R3, les scénarios fermeront leur room via l’interface lorsque le parcours le permet. L’arrêt du processus supprime les rooms restantes à la fin de l’exécution. La suite reste séquentielle tant que l’isolation entre scénarios n’est pas suffisamment démontrée.

## R1 à R9 — fonctionnalités verticales

Les objectifs et dépendances métier ci-dessous sont ceux de la roadmap validée. Seule la dépendance de R1 à R0 est ajoutée.

| ID | Tâche | Dépendances | Critères d’acceptation et tests |
| --- | --- | --- | --- |
| **R1** | **Créer une room depuis l’écran hôte** | R0 + validation de la roadmap | Un bouton appelle le service existant ; le code réel apparaît dans un lobby vide. Doubles clics bloqués pendant la requête, erreur lisible si échec. Test Playwright de création et vérification de l’instantané affiché. |
| **R2** | Rejoindre par code et pseudonyme | R1 | Un navigateur joueur rejoint la room ; hôte et joueur voient la même liste. Code invalide, room absente et pseudo vide sont traités. Test Playwright avec contextes hôte et joueur séparés. |
| **R3** | Recharger, quitter et fermer une room | R2 | Un rechargement retrouve la même identité sans doublon. Départ et fermeture mettent les écrans à jour. Une session perdue ramène vers une action claire. Tests navigateur de reprise, fermeture et identifiants périmés. |
| **R4** | Jouer une première question de quiz | R2 + règles validées | L’hôte lance le quiz ; les joueurs répondent et l’hôte révèle manuellement. Le serveur calcule les points et masque la solution jusque-là. Tests de réponses simultanées, doublons, mauvais acteur et confidentialité ; parcours navigateur d’une question. |
| **R5** | Enchaîner les questions et afficher le classement final | R4 | L’hôte parcourt les cinq questions ; scores cumulés exacts, classement stable et égalités visibles. Les résultats restent affichés jusqu’au retour au lobby ; une seconde partie repart de zéro. Tests unitaires et navigateur d’une partie complète sans chronomètre. |
| **R6** | Ajouter le temps autoritaire | R5 | Échéance calculée par le serveur ; compte à rebours indicatif côté client. Révélation automatique à l’échéance ou après toutes les réponses. Une réponse tardive est refusée même si le callback de minuterie est retardé. Tests avec horloge contrôlée et scénario navigateur. |
| **R7** | Fiabiliser les interruptions pendant le quiz | R6 | Reprise sur la bonne question avec réponse et score conservés. Déconnexion de l’hôte sans remise à zéro du temps. Aucune réponse d’une ancienne question appliquée à la suivante. Tests multiclients de coupure, reprise et remplacement de connexion. |
| **R8** | Ajouter le lien d’admission et le QR code | R2 | L’hôte affiche un lien utilisant l’origine LAN, sans secret ; le QR ouvre le formulaire avec le bon code. Tests d’URL avec adresse LAN et vérification manuelle du scan. |
| **R9** | Réaliser la recette locale complète | R7 + R8 | Un ordinateur relié à une TV et deux smartphones terminent une partie, sans accès Internet externe. Vérifier lisibilité à distance, cibles tactiles, contrastes, coupure/reprise et seconde partie. Consigner les résultats et corriger les défauts constatés. |

R8 peut être réalisée après R2. Le code manuel permet de développer le quiz sans attendre le QR code. Chemin principal : **R0 → création → admission → cycle de vie → question jouable → partie complète → temps → résilience → recette réelle**.

## Exigences de tests pour la suite

- Dès R2, toute fonctionnalité impliquant plusieurs joueurs doit inclure des tests Playwright avec plusieurs `BrowserContext` indépendants.
- Dès R5, la suite doit simuler une partie complète sans intervention humaine, en pilotant aussi les actions de l’hôte.
- Vérifier les comportements observables par les utilisateurs : listes, questions, réponses confirmées, résultats et reconnexions. Les réponses d’API seules ne suffisent pas.
- Réutiliser les fixtures simples de R0 et les composants/tokens existants. Ajouter les helpers métier au moment où les vrais écrans existent.
- Exécuter `pnpm check` et `pnpm test:e2e` avant livraison ; garder la recette matérielle de R9 distincte de l’émulation mobile.

## Livraison R1

**Statut : implémentée et vérifiée.** `pnpm check` réussi (17 tests Vitest) et `pnpm test:e2e` réussi (18 tests bureau/mobile). Les captures de l’accueil et du lobby ont été inspectées. La recette sur télévision et smartphones physiques reste R9.

La création de room côté hôte est implémentée : accueil `/`, appel du service existant, code réel et lobby vide, verrou de double clic, chargement et erreurs de connexion. L’atelier reste accessible sur `/design`. Le client attend la fin d’une éventuelle restauration avant d’autoriser la création ; les contrats et le backend sont inchangés.

Les tests vérifient le code reçu du serveur, la commande unique lors d’un double clic, la coupure pendant la requête, l’indisponibilité initiale et deux rooms indépendantes dans des contextes distincts. Les contrôles unitaires couvrent aussi la validation des instantanés, l’attente de restauration et le rejet des réponses d’une ancienne connexion.

R2 complète désormais cette étape avec l’admission. Les contrôles de départ/fermeture, le parcours complet de reprise et les jeux restent aux étapes suivantes. Les objectifs et dépendances de R2 à R9 restent inchangés.

## Livraison R2

**Statut : implémentée et vérifiée.** `pnpm check` réussi (17 tests Vitest, lint, typage strict et builds) et `pnpm test:e2e` réussi (26 tests bureau/mobile). Les captures du formulaire mobile et des lobbies hôte/joueur ont été inspectées. La recette sur appareils physiques reste R9.

L’accueil propose « Rejoindre une room » et le formulaire `/join` utilise la commande et les validations partagées existantes. Le code est normalisé en majuscules, le pseudo est nettoyé de ses espaces extérieurs ; code invalide, pseudo vide et room introuvable sont expliqués et corrigeables. Le formulaire est protégé contre les doubles envois et attend la confirmation du serveur avant d’afficher le lobby.

L’hôte et les participants partagent un composant de liste, alimenté par leurs instantanés respectifs ; chaque joueur repère sa propre entrée. Les tests utilisent des contextes hôte/joueurs indépendants, avec admissions simultanées et deux rooms distinctes. Aucun changement du backend, du protocole ou des dépendances n’est nécessaire.

R3 complète désormais le cycle de vie du lobby. Les objectifs et dépendances métier de R3 à R9 restent inchangés.

## Livraison R3

**Statut : implémentée et vérifiée.** `pnpm check` réussi (18 tests Vitest, lint, typage strict et builds). Après compilation, `pnpm exec playwright test` réussit les 40 tests bureau/mobile ; deux passages complets ont validé les nouveaux scénarios réseau, puis le dernier inclut aussi la fermeture des rooms R1/R2 via l’interface. Les captures de confirmation ont été inspectées. La recette physique reste R9.

Rechargement et reconnexion dans le même onglet conservent l’identité sans doublon. Les joueurs quittent volontairement le lobby, puis peuvent rejoindre à nouveau. L’hôte dispose d’une fermeture confirmée, communiquée aux participants, puis peut créer une nouvelle room. Une session périmée supprime la vue locale et propose à nouveau création ou admission. En cas de confirmation de départ perdue, une vérification explicite de session permet de retrouver l’état réel. Aucun changement du backend, des contrats ou des dépendances.

Les scénarios Playwright multicontextes couvrent reprise, présence hors ligne, départ et réadmission, annulation et fermeture collective, identifiants invalides, session devenue périmée hors ligne et accusé perdu.

Prochaine étape : R4, jouer une première question de quiz selon les règles de cette roadmap. Les objectifs et dépendances métier de R4 à R9 restent inchangés ; la recette matérielle reste R9.

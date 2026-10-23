# Développement local

## Installation

Prérequis : Node 24 (version de référence dans `.node-version`) et pnpm 9.15.9. L’installation initiale et le téléchargement du navigateur Playwright demandent Internet ; l’application n’en a pas besoin à l’exécution.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

L’accueil `/` permet de créer une room ou d’ouvrir le formulaire joueur `/join`. Sur chaque téléphone du même réseau, ouvrir l’URL LAN de l’application, choisir « Rejoindre une room », ou scanner le QR / ouvrir le lien du lobby hôte, puis saisir un pseudo (le code est prérempli via le lien). L’hôte et les participants voient la même liste actualisée par le vrai serveur Socket.IO. Les boutons attendent une connexion prête et sont désactivés pendant les requêtes ; les échecs sont signalés. L’atelier est conservé sur `/design` ; le cycle de vie du lobby et le quiz complet de cinq questions sont disponibles.

## Réseau local

Ouvrir sur les téléphones une des URL `http://ADRESSE_LAN:5173` affichées par `pnpm dev`. `localhost` désigne chaque appareil lui-même et ne fonctionne pas pour joindre l’ordinateur hôte depuis un téléphone.

Les appareils doivent partager un réseau autorisant les connexions entre clients. Vérifier le pare-feu de l’ordinateur et l’isolation du Wi-Fi invité. En présence de VPN ou de plusieurs interfaces, choisir la bonne adresse avec `LAN_HOST` dans `.env` (copie facultative de `.env.example`). Cette valeur sélectionne l’adresse affichée, elle ne crée pas de connectivité réseau.

Le serveur backend reste sur `127.0.0.1:3000` en développement. Vite expose le port `WEB_PORT` (5173 par défaut) et relaie API et Socket.IO. Ne pas désactiver globalement les contrôles d’hôtes Vite. Les modifications redémarrant le serveur perdent les rooms en mémoire.

## Commandes

| Commande | Usage |
| --- | --- |
| `pnpm dev` | Compilation initiale, watchers des packages et serveur, Vite, URL LAN. |
| `pnpm lint` | ESLint, sans réécriture. |
| `pnpm typecheck` | Typage strict, applications et tests compris. |
| `pnpm test` | Tests Vitest unitaires et intégration réelle. |
| `pnpm test:watch` | Vitest en observation. |
| `pnpm build` | Packages, web puis serveur. |
| `pnpm start` | Serveur compilé et frontend sur le même port. |
| `pnpm check` | Lint, typage, tests et compilation. |
| `pnpm test:e2e` | Compilation puis Playwright bureau/mobile. |

Pour Playwright, installer Chromium une fois :

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Pour une soirée locale sans serveurs de développement :

```sh
pnpm build
pnpm start
```

Ouvrir `http://ADRESSE_LAN:3000`. `HOST` et `PORT` configurent cette exécution ; `PUBLIC_ORIGIN` permet d’autoriser une origine navigateur explicite si nécessaire. En développement, `PORT` configure aussi la cible backend du proxy et `WEB_PORT` le port web. Si les ports par défaut sont occupés, utiliser par exemple `PORT=3001 WEB_PORT=5174 pnpm dev` (ou définir ces valeurs dans `.env`).

## Vérifications avant contribution

Exécuter `pnpm check` et, pour un changement d’interface ou de transport, `pnpm test:e2e`. Les tests du socle utilisent un jeu synthétique non enregistré en production ; les tests du quiz utilisent son vrai module. Tester manuellement sur un vrai téléphone après une modification de l’accès LAN ; l’émulation mobile ne vérifie ni Wi-Fi ni pare-feu.

Avant d’étendre les pages, faire valider l’atelier : couleurs, typographie, lisibilité à distance, focus clavier, contrastes, cibles tactiles et mouvement réduit. Les modifications visuelles suivent [DESIGN.md](DESIGN.md).

## E2E multijoueurs (R0)

La configuration unique reste `playwright.config.ts` ; aucune installation supplémentaire de Playwright n’est nécessaire après `pnpm install`. Chromium doit être téléchargé une fois avec la commande ci-dessus.

`pnpm test:e2e` compile les packages, React et Nest, puis démarre un serveur de test neuf sur `127.0.0.1:3100`. Nest sert le frontend compilé et Socket.IO : aucun serveur Vite parallèle n’est nécessaire. Le serveur n’utilise pas le `.env` local ; le démarrage fixe l’adresse d’écoute, le port et l’origine de test. Le port doit être libre : ne pas réutiliser un serveur de développement ni exécuter deux suites simultanément sur ce port.

Playwright attend `/api/health` ; le setup vérifie sa réponse et le HTML frontend avant les scénarios. Les smoke tests vérifient ensuite le rendu réel et la connexion visible au backend. Une seule instance de worker exécute les projets Chromium desktop et mobile, sans retries automatiques.

### Acteurs isolés

Les tests multijoueurs importent `test` et `expect` depuis `tests/e2e/fixtures/actors.ts` :

```ts
import { test, expect } from './fixtures/actors.js';

test('mon scénario', async ({ createActors }) => {
  const { host, players } = await createActors(2);
  await host.page.goto('/');
  for (const player of players) await player.page.goto('/');
  await expect(host.page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  // Ajouter les vraies interactions hôte/joueurs lorsque les écrans seront livrés.
});
```

Chaque acteur possède son propre `BrowserContext`, sa page, ses cookies et ses stockages. L’hôte utilise un profil desktop, les participants un profil mobile, indépendamment du projet exécutant le scénario. La fixture ferme tous ses contextes en fin de test, même si une assertion ou la création d’un acteur échoue. Playwright collecte les diagnostics de ces contextes avant leur fermeture.

Les smoke tests multicontextes vérifient le chargement de l’atelier sur `/design` et l’indépendance des navigateurs. Les tests R1 créent de vraies rooms depuis `/`, vérifient le code reçu du serveur, la protection contre le double clic et les erreurs de connexion. Ils ne testent pas encore l’admission de joueurs ni une partie. Dès R1/R2, créer une nouvelle room par scénario par l’interface, puis utiliser le code affiché ; ne jamais partager un code, un token ou un `storageState` de développement entre tests. Dès R3, fermer les rooms via l’interface lorsque possible. Le serveur mémoire est partagé pendant une exécution séquentielle et supprimé à sa fin ; aucune route artificielle de reset n’est ajoutée.

Dès R2, chaque comportement impliquant plusieurs joueurs doit être testé dans plusieurs contextes ; dès R5, une partie complète doit pouvoir être jouée automatiquement, sans action humaine. Vérifier les comportements visibles, pas uniquement les réponses réseau. Attendre les locators, URL ou états attendus avec les assertions Playwright ; éviter les `waitForTimeout` arbitraires.

### Exécution et résultats

```sh
pnpm test:e2e
# Après un build, répéter les scénarios sans recompiler :
pnpm exec playwright test --repeat-each=2
# Rapport HTML du dernier passage :
pnpm exec playwright show-report
# Trace d’un échec (reprendre le chemin affiché par Playwright) :
pnpm exec playwright show-trace test-results/CHEMIN-DU-TEST/trace.zip
```

Le terminal affiche le résultat de chaque test. Le rapport HTML est généré dans `playwright-report/`, sans ouverture automatique. Les traces et captures d’écran des échecs sont conservées dans `test-results/` et liées dans le rapport. Les succès ne conservent pas de trace ; le test historique de l’atelier produit aussi sa capture de contrôle. Chaque passage remplace les résultats précédents : copier les diagnostics à conserver avant de relancer. Ces dossiers sont ignorés par Git et peuvent contenir les informations visibles d’une session de test ; utiliser uniquement des données de test.

La [roadmap](ROADMAP.md) décrit les étapes R0 à R9 et la stratégie d’isolation. La vérification sur vrais téléphones et télévision reste une recette distincte.

### Périmètre de la création de room (R1)

La création R1 reste inchangée ; R2 complète le lobby avec l’admission et la liste des joueurs, sans lancement de jeu ni fermeture manuelle. Le code affiché provient exclusivement de l’instantané validé du serveur et n’est présenté comme créé qu’après confirmation de l’accusé. Les credentials restent dans `sessionStorage`, sans apparaître dans l’URL ni dans le document. Le client distingue connexion, restauration et disponibilité avant d’autoriser la création ; l’atelier n’effectue pas de reprise de session hôte. La reprise technique déjà existante est conservée, mais les parcours complets de rechargement, départ et fermeture restent R3.

Un test de transport retient momentanément la vraie commande Socket.IO pour vérifier le bouton désactivé et empêcher deux créations. Il relaie ensuite la commande au vrai serveur et compare son code à l’interface ; un autre coupe la connexion avant l’envoi pour vérifier l’erreur. Aucune réponse de succès ni room n’est fabriquée. Les tests continuent d’attendre des événements ou états réels, sans `waitForTimeout`.

### Admission multijoueur (R2)

Les helpers `tests/e2e/fixtures/rooms.ts` pilotent les vraies interfaces : `createRoom(page)` récupère le code affiché, `joinRoom(page, code, name)` remplit et soumet le formulaire, `expectPlayers(page, names)` vérifie la liste visible. Ils s’utilisent avec les contextes indépendants de `createActors`. Chaque scénario crée ses propres rooms, sans code réel de développement ni credentials préchargés.

Les tests R2 couvrent deux admissions simultanées, la même liste sur les écrans hôte et joueurs, le repère « Vous », la normalisation du code et du pseudo, les champs invalides, une room absente, la correction des erreurs, la protection contre le double clic et l’isolation de deux rooms. Les captures montrent le formulaire mobile, le lobby joueur et la liste hôte. Aucune réponse serveur de succès n’est simulée. Les parcours complets de reprise et de fermeture restent aux tests R3 à venir.

### Cycle de vie du lobby (R3)

Dans le même onglet, recharger l’écran hôte ou joueur reprend la session. Le joueur peut quitter depuis son lobby ; l’hôte peut fermer après confirmation. Déconnexion et départ volontaire sont distincts : seule la seconde action retire le joueur du lobby. Un redémarrage serveur ou des identifiants refusés rendent la création ou l’admission accessibles avec un message explicite.

`tests/e2e/room-lifecycle.spec.ts` utilise des contextes indépendants pour vérifier identités conservées après rechargement, retour réseau sans doublon, départ/réadmission, annulation puis fermeture collective, session périmée hors ligne et secret invalide. Le scénario d’accusé de départ perdu transmet la vraie commande au serveur et retient uniquement sa confirmation ; le joueur vérifie ensuite sa session via l’interface. Aucun succès serveur n’est fabriqué. Les rooms sont fermées par l’hôte à la fin lorsque la session hôte reste disponible ; les rooms devenues inaccessibles disparaissent avec le processus de test.

Commande ciblée après compilation : `pnpm exec playwright test room-lifecycle`. Les interruptions pendant un quiz sont couvertes par R7 ci-dessous.

### Première question de quiz (R4)

Créer une room et la rejoindre depuis deux contextes ou téléphones. « Lancer le quiz » ouvre la question sur tous les écrans. Chaque joueur choisit une réponse définitive ; l’hôte pouvait utiliser « Révéler la réponse » en R4 ; R6 ajoute la révélation automatique. Les écrans affichent solution, choix et points calculés par le serveur. La room peut ensuite être fermée. Cette étape ne comporte ni chronomètre ni question suivante.

`apps/server/test/quiz.test.ts` couvre rôles, configuration, réponses concurrentes sur la même révision, requêtes dédupliquées, choix définitif, mauvaises questions/parties/révisions futures, projection privée, absence de réponse et isolation. Les anciens tests du moteur conservent le contrôle strict de révision pour les jeux sans option de concurrence. `tests/e2e/quiz.spec.ts` vérifie le parcours visible hôte/deux joueurs, les doubles clics, les choix simultanés, la révélation anticipée, les points et une autre room inchangée. Les captures de question et résultats couvrent écran hôte et mobile.

Commande ciblée après compilation : `pnpm exec playwright test quiz`. Les bonnes réponses ne doivent jamais être déplacées dans les contrats ou le frontend. La suite reste sans appels externes ni attentes temporelles arbitraires.

### Partie complète et replay (R5)

Après révélation, utiliser « Question suivante » pour les quatre premières questions, puis « Voir le classement final » après la cinquième. Seul l’hôte peut progresser ou revenir au lobby. « Retour au lobby » conserve la room et les sessions présentes ; un nouveau lancement remet les scores à zéro. Le temps et la révélation restent manuels jusqu’à R6.

`tests/e2e/quiz-complete.spec.ts` automatise deux parties complètes avec un hôte et trois participants dans quatre contextes indépendants. Il vérifie les cinq questions, les réponses réinitialisées, les scores après chaque révélation, les ex æquo, le classement conservé après rechargement, le retour au même code avec les mêmes identités et un second résultat différent. Un participant ne répond pas pour couvrir l’absence de réponse. Le test ferme sa room par l’interface. Les captures du classement hôte/mobile sont disponibles dans les résultats.

Les tests serveur de quiz couvrent aussi les questions distinctes, les contrôles de rôle/phase sur `next` et `return-lobby`, les actions d’une ancienne question ou partie, la remise à zéro et le nettoyage des départs volontaires au retour au lobby. Les tests R4 d’une seule question sont conservés. Commande ciblée après compilation : `pnpm exec playwright test quiz-complete`.

### Temps autoritaire (R6)

Lancer le quiz puis répondre depuis tous les téléphones pour vérifier la révélation immédiate, ou laisser au moins une réponse en attente pour observer l’échéance serveur de vingt secondes. L’hôte peut encore révéler plus tôt. Le compteur est indicatif et dépend de l’horloge locale ; seul le serveur valide les réponses et publie la solution. Une nouvelle question dispose de vingt nouvelles secondes.

`apps/server/test/quiz-timing.test.ts` utilise l’horloge contrôlée Vitest : limite à 19 999/20 000 ms, callback retardé, dernière réponse, annulation de l’ancienne minuterie, délai suivant, absence de pause sans hôte, fermeture et callback ancien/précoce. `tests/e2e/quiz-timing.spec.ts` attend la vraie révélation après vingt secondes sur le serveur de test, sans accélérer ni remplacer sa minuterie. Il avance uniquement l’heure d’un navigateur pour vérifier qu’un compteur à zéro ne décide pas du résultat ; la réponse encore valide sur le serveur est acceptée. Les assertions attendent les résultats visibles, sans `waitForTimeout`.

Le scénario de partie complète conserve deux parties de cinq questions ; la seconde utilise la révélation automatique sur la dernière réponse pour toutes les questions. Le test d’échéance ajoute environ vingt secondes par projet bureau/mobile à la suite. Commande ciblée après compilation : `pnpm exec playwright test quiz-timing`. Le transport et la configuration Playwright restent inchangés.

### Interruptions et connexions remplacées (R7)

`tests/e2e/quiz-reconnection.spec.ts` couvre, dans des contextes indépendants, la réponse retrouvée après coupure/rechargement, le retour sur la question suivante avec score conservé, l’expiration réelle pendant l’absence de l’hôte, la reprise d’une identité par une connexion remplaçante et une intention retardée de l’ancienne question. Le test de délai conserve les vingt secondes réelles du serveur ; aucune pause serveur ni attente temporelle arbitraire.

Le test de remplacement copie explicitement les credentials produits dans le scénario vers un autre contexte éphémère pour modéliser deux connexions revendiquant la même identité. Cette copie est limitée à ce test ; elle ne modifie pas la fixture d’isolation ni la politique de stockage du produit. L’ancien écran est désactivé ; le nouvel écran conserve réponse et score. Une reprise explicite peut reprendre le contrôle, sans boucle automatique entre les connexions.

Le test d’intention retardée retient une vraie trame `game:action`, laisse l’hôte révéler et avancer, puis transmet la trame d’origine au vrai serveur. Elle est refusée pour la nouvelle question ; la réponse valide à cette dernière reste possible et son résultat est affiché sans erreur obsolète. Aucun succès ni instantané n’est fabriqué. Commande ciblée après compilation : `pnpm exec playwright test quiz-reconnection`. La suite complète continue de jouer deux parties en R5/R6.

### Invitations locales (R8)

Sur l’ordinateur hôte, ouvrir l’URL LAN affichée par `pnpm dev`, ou `http://ADRESSE_LAN:3000` pour le build compilé. Le lobby expose ensuite son lien `/join?code=...` et son QR. L’origine et le port proviennent de la page ouverte ; ne pas utiliser `localhost` pour un lien destiné à un téléphone. Le lobby explique ce point et masque le lien/QR si l’origine est une boucle locale ou une adresse d’écoute générique. Aucun endpoint de découverte LAN n’est ajouté.

`tests/e2e/room-invite.spec.ts` utilise le nom `party-games.test` résolu vers la boucle locale par Chromium uniquement dans ce fichier de tests. Les acteurs restent des contextes indépendants, le vrai serveur mémoire est réutilisé et aucun DNS/service externe n’est requis. La configuration Playwright générale est inchangée. Les tests décodent le SVG réellement rendu avec `jsqr` (développement uniquement), vérifient l’URL, puis pilotent l’admission de deux téléphones par le formulaire. Ils couvrent aussi les paramètres invalides, le lien d’une room fermée et le repli vers la saisie manuelle en boucle locale. Les tests unitaires vérifient notamment IPv4 LAN, IPv6, noms d’hôte et ports.

Après compilation : `pnpm exec playwright test room-invite`. Pour la vérification physique R9, afficher le lobby sur la TV, scanner avec deux téléphones du même Wi-Fi, vérifier le code prérempli et rejoindre avec deux pseudos. Vérifier aussi le lien textuel et le parcours manuel. Le décodage automatisé ne remplace pas cette vérification de caméra, distance, réseau et pare-feu.

### Recette locale complète (R9)

Suivre [RECETTE.md](RECETTE.md) pour le parcours TV/deux smartphones sans WAN, les interruptions, la seconde partie et le relevé des anomalies. La recette physique est reportée par le propriétaire ; elle reste nécessaire avant de clôturer R9. Le scénario `quiz-complete` joue désormais ses deux parties avec les requêtes HTTP externes bloquées dans chaque contexte et vérifie l’absence de requêtes ou WebSockets externes. Ce contrôle automatisé ne prouve pas le fonctionnement du réseau et des appareils physiques.

### QR depuis la page joueur

La page `/join` affiche aussi un QR et un lien pour ouvrir le formulaire sur un téléphone du même Wi-Fi, sans saisir l’adresse IP. Sans code valide, ils pointent vers `/join` ; dès que les six caractères saisis forment un code valide, ils pointent vers `/join?code=CODE`. Un code partiel ou invalide revient au lien sans code. Le pseudo n’est jamais partagé, et aucune admission n’est automatique. Si cet onglet possède déjà une session hôte, la page propose le QR de sa room. L’origine LAN et le port sont conservés ; le repli explicatif sur localhost reste identique au lobby hôte. Le test `room-invite` décode les deux formes et fait rejoindre deux contextes indépendants.

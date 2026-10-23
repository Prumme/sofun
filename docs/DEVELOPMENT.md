# Développement local

## Installation

Prérequis : Node 24 (version de référence dans `.node-version`) et pnpm 9.15.9. L’installation initiale et le téléchargement du navigateur Playwright demandent Internet ; l’application n’en a pas besoin à l’exécution.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

L’accueil `/` permet de créer une room ou d’ouvrir le formulaire joueur `/join`. Sur chaque téléphone du même réseau, ouvrir l’URL LAN de l’application, choisir « Rejoindre une room », puis saisir le code et un pseudo. L’hôte et les participants voient la même liste actualisée par le vrai serveur Socket.IO. Les boutons attendent une connexion prête et sont désactivés pendant les requêtes ; les échecs sont signalés. L’atelier est conservé sur `/design` ; les jeux et les contrôles de départ/fermeture ne sont pas encore livrés.

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

Exécuter `pnpm check` et, pour un changement d’interface ou de transport, `pnpm test:e2e`. Les tests utilisent un jeu synthétique non enregistré en production. Tester manuellement sur un vrai téléphone après une modification de l’accès LAN ; l’émulation mobile ne vérifie ni Wi-Fi ni pare-feu.

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

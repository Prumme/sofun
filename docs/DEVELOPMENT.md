# Développement local

## Installation

Prérequis : Node 24 (version de référence dans `.node-version`) et pnpm 9.15.9. L’installation initiale et le téléchargement du navigateur Playwright demandent Internet ; l’application n’en a pas besoin à l’exécution.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

La page initiale est l’atelier du design system : les cartes ne lancent aucun jeu. Le statut de connexion utilise le vrai serveur Socket.IO. Aucun parcours de room complet n’est encore livré.

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

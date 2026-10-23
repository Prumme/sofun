# Recette locale complète — R9

## Statut

**Préparation automatisée effectuée ; recette physique à réaliser.** Le propriétaire testera ultérieurement avec une télévision et deux smartphones. Aucun résultat sur appareil réel n’est considéré comme acquis.

La suite existante couvre admission, confidentialité, cinq questions, scores, égalités, retour au lobby, seconde partie et interruptions. Le scénario `tests/e2e/quiz-complete.spec.ts` bloque les requêtes HTTP vers toute origine externe avant le chargement des quatre contextes indépendants et vérifie qu’aucune ressource externe ni WebSocket externe n’est demandé, y compris après rechargement. Il joue deux parties sur le vrai serveur mémoire. Ce contrôle ne remplace ni une coupure WAN réelle, ni la caméra, le Wi-Fi, Safari ou la lisibilité d’une TV.

Vérifications automatisées du 23 octobre 2026 : `pnpm check` réussi (36 tests Vitest, lint, typage et compilation) ; `pnpm test:e2e` réussi (64 tests, 3 minutes). Sources applicatives inchangées depuis `4c47f98` ; seul le scénario E2E et la documentation évoluent dans cette contribution.

## Préparer la soirée de test

Installer les dépendances et Chromium avec Internet avant la recette, puis compiler :

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
pnpm test:e2e
pnpm start
```

Pour la recette matérielle, conserver le même build et le processus serveur pendant les deux parties. Ouvrir sur l’hôte `http://ADRESSE_LAN:3000`, avec l’adresse IPv4 locale de l’ordinateur. Elle peut aussi être repérée dans les paramètres réseau ou les URL affichées par `pnpm dev`. Si le port est occupé, choisir un port libre avec `PORT=3001 pnpm start` et adapter l’URL. Vérifier les valeurs éventuelles de `.env`, notamment `HOST`, `PORT` et `PUBLIC_ORIGIN` ; voir [DEVELOPMENT.md](DEVELOPMENT.md).

Relier l’ordinateur à la TV, connecter deux smartphones au même réseau autorisant les communications entre appareils, autoriser le port dans le pare-feu. Ne pas utiliser `localhost` sur l’hôte pour créer le QR destiné aux téléphones. Ne pas redémarrer le serveur : rooms et sessions sont en mémoire.

Pour vérifier l’absence de dépendance Internet, couper uniquement l’accès WAN du réseau de test tout en conservant le Wi-Fi/LAN opérationnel, selon le matériel disponible. Désactiver les données mobiles des smartphones pour éviter un contournement. Si ce n’est pas possible, noter explicitement « WAN non vérifié » ; ne pas confondre avec le test automatisé de blocage des origines externes.

## Informations à consigner

- Date, testeur, commit testé (`git rev-parse HEAD`), commande et port utilisés.
- Ordinateur / OS / navigateur et version ; TV, résolution, zoom et distance de lecture.
- Deux téléphones : modèle, OS, navigateur et version (Safari sur iPhone si disponible).
- Configuration réseau, méthode de coupure WAN et maintien du LAN ; ne pas publier de secrets de session, données personnelles ou captures non expurgées.

## Parcours matériel

Noter chaque résultat **OK**, **KO** ou **non exécuté**, avec une observation. À ce jour, toutes les lignes ci-dessous sont **non exécutées**.

| ID | Action | Résultat attendu | Résultat / observation |
| --- | --- | --- | --- |
| M1 | Sans WAN, ouvrir l’application sur la TV et créer une room. | Interface, police et icônes chargées ; code et QR visibles sans erreur. | Non exécuté |
| M2 | Scanner le QR avec les deux téléphones depuis la distance d’usage. | Formulaire ouvert avec le bon code, pseudo encore requis ; aucun secret dans l’URL. | Non exécuté |
| M3 | Rejoindre avec les pseudos de test Alice et Benoît ; tester le lien textuel sur un téléphone et la saisie manuelle sur l’autre avant admission. | Deux joueurs distincts, même liste sur les trois écrans, aucune entrée dupliquée. | Non exécuté |
| M4 | Lancer le quiz. Répondre aux deux téléphones à la question 1. | Choix tactiles utilisables, confirmation visible, solution masquée avant révélation ; révélation automatique après les deux réponses. | Non exécuté |
| M5 | À la question 2, laisser un joueur sans réponse. | Révélation après vingt secondes côté serveur ; absence à zéro point, choix du premier conservé. | Non exécuté |
| M6 | Question 3 : Alice répond, coupe son Wi-Fi, le réactive et recharge le même onglet avant de poursuivre. | Même identité, réponse et score conservés ; aucune réponse modifiable ou dupliquée. Si le temps expire, reprise sur la révélation. | Non exécuté |
| M7 | Question 4 : couper le réseau de l’ordinateur hôte sans arrêter le serveur, laisser passer l’échéance puis reconnecter et recharger le même onglet. | Le temps n’est pas remis à zéro ; l’hôte retrouve la phase courante et peut poursuivre. Les téléphones peuvent aussi perdre la connexion durant la coupure de l’ordinateur. | Non exécuté |
| M8 | Terminer les cinq questions et afficher le classement. | Scores cohérents avec les choix, classement identique sur les écrans ; résultats conservés après rechargement. | Non exécuté |
| M9 | Retourner au lobby puis terminer une seconde partie, en répondant à toutes les questions. | Même code et mêmes joueurs ; scores remis à zéro, cinq nouvelles questions, nouveau classement exact. | Non exécuté |
| M10 | Fermer la room avec confirmation, puis ouvrir son ancien lien sur un téléphone. | Joueurs informés de la fermeture ; ancienne room refusée ; possibilité de créer une nouvelle room. | Non exécuté |
| M11 | Pendant les parcours, observer TV à la distance habituelle et téléphones en portrait. | Questions, choix, temps et scores lisibles ; contraste satisfaisant, aucun débordement gênant ; réponses accessibles sans zoom ni toucher voisin accidentel. | Non exécuté |

Pour contrôler le score, chaque bonne réponse vaut un point, sans bonus de vitesse. La solution publiée à chaque révélation permet de compter indépendamment ; la grille serveur fixe donne Jupiter, Six, Tokyo, H2O, Sept. Exemple seconde partie : Alice répond correctement partout, Benoît choisit une mauvaise réponse partout : résultats attendus 5/5 et 0/5. Les égalités sont aussi couvertes automatiquement.

## Anomalies et clôture

Pour chaque KO, noter ID du parcours, étape, appareil/navigateur, comportement attendu et obtenu, reproduction et éventuelle capture expurgée. Corriger le défaut de manière ciblée, ajouter un test de régression adapté et rejouer la ligne concernée ainsi que le parcours complet si son déroulement est affecté.

R9 reste ouverte tant que les lignes matérielles ne sont pas exécutées, que l’absence de WAN n’est pas vérifiée ou qu’un défaut bloque le premier parcours. Inscrire ici les résultats réels, leur date et le commit testé, puis actualiser [ROADMAP.md](ROADMAP.md). La capacité au-delà du groupe testé et les navigateurs non essayés restent non validés. Ne pas convertir un succès Chromium émulé en validation de ces appareils.

## Retour sur la découverte LAN — 23 octobre 2026

Le propriétaire a confirmé que l’essai de QR construit avec l’adresse détectée côté serveur fonctionne. Ce retour valide la méthode pour sa finalisation ; il ne renseigne pas les appareils, le parcours complet sans WAN ni toutes les lignes M1 à M11. R9 reste donc ouverte. Pour les prochains essais, l’hôte peut ouvrir localhost et contrôler l’adresse LAN du lien affiché avant le scan.

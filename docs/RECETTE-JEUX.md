# Recette physique des nouveaux jeux — C12

## Statut

**À réaliser sur TV et smartphones réels.** Les parcours Chromium automatisés, y compris douze contextes indépendants, ne valident ni les caméras, ni les claviers mobiles réels, ni la fluidité sur le Wi-Fi de la soirée. Cette recette complète [RECETTE.md](RECETTE.md), sans clôturer R9.

## Préparation

Installer et compiler avant de couper l’accès Internet. Garder le LAN opérationnel. Lancer `pnpm dev`, ou `pnpm build` puis `pnpm start`. Sur l’ordinateur, ouvrir localhost sur le port affiché, créer une room, vérifier l’adresse LAN du QR et rejoindre depuis les téléphones. Choisir au moins trois joueurs pour le Menteur et le dessin. Noter commit, date, appareils, navigateurs, TV/résolution, réseau et méthode de coupure WAN.

Pour chaque ligne, noter **OK**, **KO** ou **non exécuté**, avec observations. Toutes les lignes matérielles restent non exécutées à cette livraison.

| ID | Parcours | Résultat attendu | Résultat |
| --- | --- | --- | --- |
| C12-1 | Connecter, couper puis reprendre un téléphone dans le lobby | Un téléphone par connexion, identité conservée hors ligne dans la liste, aucun doublon ; QR/code lisibles. | Non exécuté |
| C12-2 | Activer la réduction des animations sur l’hôte | Moniteur/téléphones et compte restent présents, sans rotation ni balancement. | Non exécuté |
| C12-3 | Jouer au quiz avec les boutons symboliques | Correspondance forme/couleur avec TV, grille 2×2 tactile, sélection visible sans lire les réponses sur téléphone. | Non exécuté |
| C12-4 | Jouer et rejouer à Qui de nous ? | Vote pour soi autorisé, détail des votants après clôture, points pour toutes les personnes majoritaires, zéro si abstention. | Non exécuté |
| C12-5 | Jouer et rejouer au Menteur | Inventions privées, doublon refusé et corrigeable, vote pour soi impossible, vérité/auteurs révélés et points exacts. | Non exécuté |
| C12-6 | Jouer et rejouer aux Images | Illustrations reconnaissables depuis TV, seules les formes à choisir sur téléphone, première bonne réponse à 1000 puis 500, 333… ; erreurs à zéro. | Non exécuté |
| C12-7 | Dessiner depuis chaque téléphone | Trois mots privés, tracé tactile fluide sur TV, effacement synchronisé, aucune déformation du carré. | Non exécuté |
| C12-8 | Deviner et terminer deux tours de table successifs | Propositions privées, casse/accents ignorés, pas de double récompense, points du dessinateur et rotation corrects. | Non exécuté |
| C12-9 | Couper/recharger hôte, dessinateur et devineur dans les différentes phases | Reprise sur la phase courante, mots/réponses/scores/dessin conservés, minuteries non réinitialisées, aucune ancienne intention appliquée. | Non exécuté |
| C12-10 | Télécharger et réimporter les quatre modèles ; essayer un ZIP invalide | Import atomique, erreur compréhensible, modèle image complet ; réutilisation dans une seconde room, suppression d’un pack actif refusée. | Non exécuté |
| C12-11 | Terminer les quatre jeux sans WAN puis fermer la room | Ressources entièrement locales, progressions automatiques et classement final persistant ; fermeture communiquée à tous. | Non exécuté |
| C12-12 | Si matériel disponible, réunir douze téléphones | Pas de chevauchement gênant, réponses disponibles, dessin partagé exploitable et Wi-Fi stable. | Non exécuté |

Pour chaque KO : appareil, étape, résultat attendu/obtenu et reproduction ; expurger les captures de données personnelles. Corriger avec un test de régression approprié, puis rejouer le parcours affecté. Les barèmes et paramètres sont dans [GAMES.md](GAMES.md). Le format et les limites des packs sont dans [DEVELOPMENT.md](DEVELOPMENT.md).

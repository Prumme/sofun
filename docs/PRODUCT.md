# Vision produit

## Intention

Permettre à un groupe de partager des jeux de soirée autour d'un écran commun, avec des smartphones comme moyens de participation lorsque le jeu le nécessite.

## Éléments établis

- Un hôte peut lancer des jeux sur un écran partagé, ordinateur ou télévision.
- Les participants peuvent rejoindre une session depuis leur smartphone.
- Certains jeux pourront se jouer sans téléphone.

Le fonctionnement sans téléphone concerne le mode de participation. L’exécution sans accès Internet relève d’une contrainte distincte, précisée dans le périmètre V1 ci-dessous.

## Utilisateurs et usages

- **Hôte** : prépare et lance la session, présente le jeu au groupe et accompagne son déroulement.
- **Participants** : rejoignent la session sur smartphone lorsque nécessaire et participent aux jeux.
- **Groupe autour de l'écran** : suit les informations communes et peut participer aux jeux compatibles sans téléphone.

Ces rôles décrivent les usages envisagés, sans imposer de comptes utilisateurs ni de permissions techniques.

## Fonctionnalités envisagées — à valider

- Création d'une session et accès des participants par un mécanisme simple, par exemple un code ou un QR code.
- Salle d'attente et visualisation des participants.
- Choix d'un jeu et présentation de ses règles sur l'écran partagé.
- Interactions sur smartphone adaptées à chaque jeu : réponses, votes ou autres actions.
- Déroulement en manches, affichage de résultats et scores lorsque pertinent.
- Jeux ou modes avec participation orale ou collective sans téléphone.
- Gestion du départ et du retour d'un participant.

Cette liste constitue une base de discussion, pas un engagement de livraison.

## Questions produit ouvertes

- Quel public viser et dans quel contexte : amis, famille, événements ou autres ?
- Quels jeux et quel parcours constituent la première version ?
- Combien de participants et d'équipes faut-il prendre en charge ?
- Quels appareils, navigateurs et modes d'affichage sur télévision faut-il supporter ?
- Quels outils de modération faut-il proposer au-delà des sessions invitées avec pseudonyme ?
- Quels besoins d'accessibilité, langues et contraintes de connexion faut-il couvrir ?
- Quelles données conserver, pendant combien de temps et pour quelle finalité ?
- Quels critères permettront d'évaluer la réussite d'une première version ?

## Périmètre du socle validé le 22 octobre 2026

- Exécution locale sur un LAN de confiance, sans hébergement public pour la V1. Les ressources web et polices sont embarquées.
- Écran hôte distinct des joueurs ; l’hôte qui souhaite jouer rejoint séparément sur téléphone.
- Jeux sans téléphone via les actions de l’hôte, sans joueurs virtuels dans le socle.
- Pas de pause ni transfert automatique en cas de déconnexion de l’hôte.
- Pas de comptes ; sessions invitées et reprise dans le même onglet.
- Nettoyage après deux heures sans connexion, sans récupération après redémarrage du serveur.
- Initialisation limitée aux fondations et à la démonstration visuelle ; les jeux, le QR code et les pages de room viendront ensuite.

Les questions ci-dessus concernant ces points sont résolues par ce périmètre ; le premier quiz est précisé dans la roadmap validée ; la capacité cible reste à définir.

## Première étape de parcours — R1

La création de room côté hôte est autorisée après R0. L’accueil doit permettre de créer une room réelle et d’afficher son code dans un lobby vide, avec un état de chargement, une protection contre les doubles clics et un message en cas d’échec. Cette étape réutilise les services existants. L’admission depuis un smartphone reste R2, le cycle de vie complet R3 et le quiz R4 à R7 ; voir [la roadmap](ROADMAP.md).

## Admission des joueurs — R2

Le parcours joueur permet de rejoindre une room depuis le même réseau, avec le code affiché par l’hôte et un pseudo. Le formulaire signale un code invalide, un pseudo vide ou une room introuvable. Après admission, l’hôte et les joueurs voient la même liste mise à jour en direct ; le joueur identifie sa propre entrée. Les jeux, le QR code et les contrôles de départ/fermeture restent aux étapes prévues dans la roadmap.

## Cycle de vie du lobby — R3

Recharger le même onglet retrouve le rôle et le pseudo sans nouvelle admission. Une coupure réseau conserve la place, indiquée hors ligne aux autres participants. « Quitter la room » retire volontairement le joueur ; il peut rejoindre à nouveau comme nouvelle session. « Fermer la room », confirmé par l’hôte, met fin à la room pour tous et permet d’en créer une autre. Une session périmée est expliquée et ramène vers une action de création ou d’admission. La fermeture d’un onglet ne constitue pas un départ volontaire ; aucune garantie de reprise après fermeture d’onglet ou redémarrage serveur.

## Première question de quiz — R4

L’hôte lance le quiz lorsque le lobby contient au moins deux joueurs. Une question française embarquée propose quatre choix ; chaque joueur valide une seule réponse définitive. Seul le propre choix est visible sur son téléphone avant révélation. L’écran partagé indique combien de réponses sont reçues.

L’hôte révèle manuellement, même si une réponse manque. La solution et les réponses deviennent visibles ; une bonne réponse vaut un point, une mauvaise réponse ou une absence zéro. Les résultats de cette question restent affichés jusqu’à fermeture de la room. L’enchaînement de cinq questions, le classement final et la possibilité de rejouer dans le même lobby relèvent de R5 ; le temps et la révélation automatique de R6.

## Partie complète — R5

Le quiz enchaîne cinq questions dans un ordre fixe. Après chaque révélation, l’hôte consulte les points de la question et le total cumulé, puis choisit « Question suivante ». Après la cinquième révélation, « Voir le classement final » affiche les scores sur cinq à tous les participants. Les ex æquo partagent leur rang (1, 1, 3), avec un ordre d’affichage stable issu du lobby.

Le classement reste affiché jusqu’à ce que l’hôte choisisse « Retour au lobby ». La room conserve son code et les identités encore présentes. L’hôte peut relancer une partie, dont les réponses et les scores repartent de zéro. Les joueurs ayant quitté volontairement ne reviennent pas automatiquement au lobby. Cette étape reste sans chronomètre, avec révélation et progression manuelles.

## Temps et révélation automatique — R6

Chaque question accorde vingt secondes selon l’horloge du serveur. Les écrans affichent un compte à rebours indicatif. La solution apparaît automatiquement quand tous les participants fixés au lancement ont répondu ou lorsque le délai expire. Une réponse reçue trop tard est refusée ; une absence vaut zéro point, sans bonus de vitesse. Une déconnexion ne suspend pas le délai.

L’hôte peut toujours écourter une question avec « Révéler la réponse ». Après révélation, il garde la main sur le passage à la suivante et sur l’affichage du classement final. Les résultats restent visibles sans limite de vingt secondes.

## Reprise pendant la partie — R7

Un joueur qui recharge ou retrouve le réseau revient sur la question actuelle avec sa réponse déjà enregistrée et ses points conservés. Si la question a changé pendant son absence, il voit la nouvelle question ; sa réponse précédente ne vaut pas pour celle-ci. Le temps continue pendant une interruption de l’hôte ; son retour retrouve l’état réel, y compris une révélation déjà survenue.

Une seule connexion peut contrôler une session. Une reprise sur une autre connexion désactive l’écran précédent, qui affiche un message et permet une reprise explicite. Cela ne crée pas de nouveau joueur. Les requêtes encore en attente d’une ancienne question ne bloquent pas la suivante. Les limites de reprise dans le même onglet et de stockage en mémoire restent inchangées.

## Admission par lien ou QR — R8

Le lobby affiche un lien et un QR code permettant aux téléphones du même réseau d’ouvrir le formulaire avec le code de room prérempli. Le joueur choisit son pseudo et confirme son admission ; scanner ne crée pas immédiatement de joueur. Le code manuel reste disponible. Un lien invalide est expliqué et corrigeable ; une room fermée n’accepte plus de nouveaux participants.

L’hôte ouvre l’application via l’adresse réseau de l’ordinateur. Si l’application est ouverte via `localhost`, elle invite à utiliser cette adresse avant de partager un QR ou un lien. La disponibilité réelle sur Wi-Fi, le scan depuis une télévision et la compatibilité des appareils restent à vérifier lors de la recette R9.

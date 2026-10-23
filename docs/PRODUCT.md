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

Les questions ci-dessus concernant ces points sont résolues par ce périmètre ; les règles du premier jeu et la capacité cible restent à définir.

## Première étape de parcours — R1

La création de room côté hôte est autorisée après R0. L’accueil doit permettre de créer une room réelle et d’afficher son code dans un lobby vide, avec un état de chargement, une protection contre les doubles clics et un message en cas d’échec. Cette étape réutilise les services existants. L’admission depuis un smartphone reste R2, le cycle de vie complet R3 et le quiz R4 à R7 ; voir [la roadmap](ROADMAP.md).

## Admission des joueurs — R2

Le parcours joueur permet de rejoindre une room depuis le même réseau, avec le code affiché par l’hôte et un pseudo. Le formulaire signale un code invalide, un pseudo vide ou une room introuvable. Après admission, l’hôte et les joueurs voient la même liste mise à jour en direct ; le joueur identifie sa propre entrée. Les jeux, le QR code et les contrôles de départ/fermeture restent aux étapes prévues dans la roadmap.

## Cycle de vie du lobby — R3

Recharger le même onglet retrouve le rôle et le pseudo sans nouvelle admission. Une coupure réseau conserve la place, indiquée hors ligne aux autres participants. « Quitter la room » retire volontairement le joueur ; il peut rejoindre à nouveau comme nouvelle session. « Fermer la room », confirmé par l’hôte, met fin à la room pour tous et permet d’en créer une autre. Une session périmée est expliquée et ramène vers une action de création ou d’admission. La fermeture d’un onglet ne constitue pas un départ volontaire ; aucune garantie de reprise après fermeture d’onglet ou redémarrage serveur.

# Architecture et décisions techniques

## Décision validée le 22 octobre 2026

Le plan d’initialisation a été validé : monolithe modulaire dans un monorepo TypeScript strict, un processus serveur autoritaire, une application web hôte/joueur. Aucun microservice, Docker obligatoire, base de données ni compte utilisateur.

### Pile

- React et Vite ; Tailwind CSS et composants shadcn/ui adaptés localement.
- NestJS et Socket.IO ; validation Zod à l’entrée et à la sortie.
- pnpm workspaces, packages ESM compilés, TypeScript strict.
- Vitest (unitaires et intégration Nest/Socket.IO) et Playwright (application compilée, bureau/mobile).
- Node 24, pnpm 9.15.9 ; versions résolues dans `pnpm-lock.yaml`.

## Frontières

| Ensemble | Responsabilité |
| --- | --- |
| `apps/web` | Interfaces, intentions, connexion et reprise ; aucun calcul métier fiable. |
| `apps/server/src/rooms` | Cycle de vie, admission, orchestration et file séquentielle par room. |
| `apps/server/src/sessions` | Identités hôte/joueur, secrets et connexions. |
| `apps/server/src/realtime` | Transport, validation et envoi individuel des vues. |
| `apps/server/src/engine` | Registre, transitions et validation des effets. |
| `apps/server/src/games` | Jeux indépendants, enregistrés explicitement. |
| `apps/server/src/storage` | Port `RoomStore`, adaptateur mémoire. |
| `packages/contracts` | Schémas Zod et types réseau, sans état secret ni dépendance Nest/React. |
| `packages/game-sdk` | Interfaces internes, contextes, transitions et effets déclaratifs. |

Le frontend importe uniquement les contrats partagés. Le serveur dépend des contrats et du SDK. Le SDK n’utilise que les types communs des contrats et les types Zod. Aucun jeu n’importe un autre jeu.

Le module Nest racine assure le câblage par injection ; les services métier restent des classes et fonctions indépendantes de Nest. L’injection explicite évite de dépendre des métadonnées de paramètres dans les transformations Vitest.

## Rooms et sessions

- Une room possède un identifiant interne et un code public à six caractères non ambigus.
- Plusieurs rooms coexistent ; une seule partie active par room, plusieurs parties successives.
- L’hôte est distinct des joueurs ; participer nécessite une autre session sur téléphone.
- L’admission de nouveaux joueurs est limitée au lobby. Une identité existante peut revenir pendant une partie.
- La session est indépendante du `socket.id`. Un secret aléatoire de 256 bits permet sa reprise ; une nouvelle connexion remplace la précédente.
- Le serveur stocke l’empreinte du secret. Les réponses initiales contenant les secrets sont temporairement conservées dans le cache de déduplication de la connexion ; elles disparaissent à sa déconnexion ou à la fermeture de la room. Aucun secret dans les URL, projections ou journaux.
- Le navigateur utilise `sessionStorage` : reprise après rechargement dans l’onglet, aucune garantie après fermeture de l’onglet.
- Une déconnexion conserve la place. Un départ explicite supprime la place au lobby ; pendant la partie, l’identité reste jusqu’au retour au lobby, sans possibilité de reprendre la session quittée.
- Le départ de l’hôte n’entraîne ni pause ni transfert : les minuteries continuent.
- Expiration après deux heures continues sans connexion, vérifiée chaque minute. Le redémarrage du processus perd tout état.

## Moteur autoritaire

Chaque jeu définit configuration, intentions validées, état interne, transitions, minuteries et projection par destinataire. Les effets déclaratifs se limitent à programmer/annuler une minuterie. Les événements internes ne sont pas automatiquement envoyés aux clients.

Le moteur fournit temps, hasard et participants. Une action reçoit l’acteur authentifié par le serveur ; un client ne peut pas déclarer son rôle ni imposer un score. Les jeux ne font ni I/O ni accès au stockage. Les états sont clonés aux frontières des callbacks pour éviter une mutation de l’état courant.

Les transitions valident toutes les projections avant publication. L’hôte reçoit une vue d’écran partagé, sans privilège implicite sur les secrets. Les instantanés complets sont envoyés individuellement, jamais l’état interne à toute une room.

Chaque commande, déconnexion et minuterie est ordonnée dans la file de sa room. Les autres rooms restent indépendantes. Les minuteries sont associées à une partie, annulées à la fin et ignorées après remplacement/fermeture.

## Protocole

Événements entrants : `room:create`, `room:join`, `room:leave`, `room:close`, `session:resume`, `game:start`, `game:action`. Réponse par accusé Socket.IO validé, avec `requestId`, succès ou erreur structurée. Événement sortant : `room:snapshot`.

Le client fournit un UUID de requête. Le serveur retient les 256 derniers résultats par session ; les opérations d’établissement/reprise sont dédupliquées par connexion. Un identifiant réutilisé pour un contenu différent est refusé. La protection est bornée ; elle ne promet pas une exécution exactement une fois après éviction ou fin de session.

Une intention de jeu vise l’identifiant de partie et la révision observée. Par défaut, un état obsolète est refusé avec publication d’une projection fraîche. L’option de concurrence validée pour le quiz R4 est précisée ci-dessous. La reprise authentifie puis renvoie un instantané complet, sans rejeu automatique d’intentions en attente. Les messages malformés conservent leur UUID de requête s’il est valide ; sinon, l’erreur reçoit un nouvel UUID serveur.

## Réseau et confiance

LAN de confiance en HTTP : les secrets protègent les identités applicatives, pas contre l’écoute du réseau. Aucun hébergement public prévu. Les navigateurs doivent utiliser la même origine que le serveur/proxy ou `PUBLIC_ORIGIN` explicitement configurée. Charge utile Socket.IO limitée à 64 Kio.

En développement, Vite écoute toutes les interfaces sur 5173 par défaut et relaie `/api` et `/socket.io` vers Nest sur la boucle locale 3000 par défaut. `WEB_PORT` et `PORT` permettent de changer ces ports ensemble avec la configuration du proxy. En exécution compilée, Nest sert les ressources web et Socket.IO sur le même port LAN. Les clients utilisent des chemins relatifs. Police et ressources sont locales ; pas de CDN à l’exécution.

## Limites et décisions encore ouvertes

- Les parcours hôte/joueur permettent de créer et rejoindre une room, avec une liste de joueurs synchronisée. Le quiz R6 joue cinq questions avec temps autoritaire, révélation automatique, classement final et retour au lobby ; R7 couvre les interruptions ; R8 ajoute l’admission par lien/QR ; catalogue métier et recette physique restent à compléter.
- Palette et police de la démonstration restent à valider visuellement avant de décliner les pages.
- Public, nombre maximal de participants/rooms, équipes, modération, compatibilité navigateurs et critères de performance à définir.
- Aucune durabilité, distribution multi-processus, récupération après crash ou garantie de traitement des effets après panne.
- Un stockage durable demandera une nouvelle décision de concurrence et de reprise ; remplacer la Map ne suffit pas.
- Protections de branches, politique de fusion et hébergement de CI à convenir.

## Infrastructure E2E multijoueur — R0

La configuration Playwright existante est étendue, sans changer l’architecture applicative. L’exécution compile le frontend et le backend, puis démarre un processus Nest mémoire dédié sur la boucle locale, servant aussi React et Socket.IO. Le setup vérifie backend et HTML frontend. Le serveur de développement et son `.env` ne sont pas réutilisés.

Un seul worker exécute initialement les tests. Les acteurs sont des contextes navigateur indépendants et éphémères, fermés après chaque scénario. Le serveur est neuf par exécution ; les futures rooms seront créées via l’interface pour chaque test et fermées via l’interface dès que R3 le permettra. Aucun endpoint de test ni réinitialisation artificielle n’est ajouté au produit. Traces, captures sur échec et rapport HTML complètent les diagnostics. Voir [le guide de développement](DEVELOPMENT.md) et [la roadmap](ROADMAP.md).

## Parcours hôte — R1

L’accueil React utilise `room:create` et les `room:snapshot` existants pour afficher un lobby hôte vide. Les contrats réseau et le backend ne changent pas. `/design` conserve l’atelier ; ces deux entrées utilisent une sélection simple de page sans nouveau routeur ni dépendance.

Le client expose un statut de connexion distinguant transport, restauration et disponibilité de session. La création est bloquée tant que la session n’est pas prête, puis protégée par un verrou synchrone et un bouton désactivé. L’instantané reçu avant l’accusé est conservé jusqu’à confirmation de la création. Après un accusé non confirmé, un nouvel essai explicite réutilise l’UUID de requête pour profiter de la déduplication existante sur la même connexion. Aucun rejeu automatique de création n’est effectué à la reconnexion. Les réponses tardives d’une ancienne connexion sont ignorées ; les secrets de session restent dans le stockage de session du navigateur.

L’atelier n’effectue pas de reprise de session, afin de ne pas remplacer une connexion hôte. L’admission des joueurs, les contrôles de départ/fermeture et les règles de jeu ne sont pas ajoutés par R1.

## Admission et liste des joueurs — R2

`/join` complète la sélection simple de pages React. Le formulaire utilise le schéma Zod `room:join` partagé : code de six caractères normalisé en majuscules et pseudo nettoyé de ses espaces extérieurs, entre 1 et 32 caractères. La validation côté serveur reste autoritaire ; une room absente est signalée sans créer de joueur. Les pseudos ne sont pas rendus uniques : les identifiants serveur existants distinguent les participants.

L’admission attend une connexion prête, désactive le formulaire pendant la requête et utilise un verrou synchrone contre les doubles envois. Un nouvel essai explicite après une réponse non confirmée réutilise l’identifiant seulement si le code et le pseudo normalisés sont identiques. Le lobby joueur est affiché après confirmation et correspondance de l’instantané avec l’identité reçue. Aucun contrat, service serveur ni mécanisme d’authentification supplémentaire n’est ajouté.

Le composant de liste est partagé par l’hôte et les joueurs ; seules les données autorisées des instantanés validés l’alimentent. Chaque joueur voit sa propre entrée marquée « Vous ». Les états de présence déjà fournis par le serveur sont affichés sans ajouter de contrôle de départ ou fermeture. Les liens d’admission préremplis et QR codes restent R8 ; le cycle de vie complet reste R3.

## Cycle de vie du lobby — R3

Les interfaces réutilisent `session:resume`, `room:leave` et `room:close`, sans changement du backend, du stockage ou des contrats. Le rechargement et la reconnexion reprennent l’identité dans le même onglet via `sessionStorage`. Une déconnexion conserve la place, signalée hors ligne ; un départ volontaire au lobby la supprime. L’hôte ferme la room après confirmation, ce qui informe tous les participants connectés.

Les actions sont bloquées tant que la connexion n’est pas prête ou pendant leur envoi. Les credentials sont supprimés après confirmation du départ ou réception de la fermeture. Une reprise refusée pour session invalide ou room absente efface aussi la vue locale et rend le formulaire ou l’accueil accessible. Après un accusé de départ perdu, une action explicite permet de reconnecter et vérifier la session réelle ; aucune intention de départ ou fermeture n’est rejouée automatiquement. La création et l’admission peuvent ensuite recommencer avec un nouvel identifiant de requête.

Les garanties de reprise restent limitées à l’onglet et à la durée de vie du serveur mémoire. Le cycle de vie pendant un quiz et ses interruptions reste aux étapes suivantes.

## Première question de quiz — R4

Le quiz est enregistré explicitement côté serveur et son panneau est intégré aux écrans hôte/joueur existants. Les contrats Zod publics séparent configuration vide, intentions `answer`/`reveal` et vues `question`/`revealed`. La question et sa solution restent dans le module serveur. La vue avant révélation contient uniquement les choix publics, la présence d’une réponse pour chaque participant et le propre choix du joueur ; aucun score, choix adverse ni solution. Après révélation, le serveur publie solution, réponses et points.

Les participants sont figés au lancement à partir des identités du lobby (au moins deux, y compris une identité temporairement hors ligne). L’hôte lance et révèle ; les joueurs répondent une seule fois, avec un index de choix validé et l’identifiant de question. Aucun calcul fiable n’est confié au client. Une question révélée reste affichée, sans `finished`, jusqu’à fermeture de la room ; R5 ajoutera enchaînement, classement et retour au lobby, R6 le temps.

### Concurrence — ajustement validé pour R4

Le propriétaire a validé l’option explicite `GameDefinition.actionConcurrency: 'game-validated'`. Sans cette option, l’adaptateur conserve `strict-revision` : toute révision différente reste refusée. Pour un jeu optant pour la validation métier, la room accepte une révision ancienne, mais jamais une révision future ni un autre identifiant de partie. La file séquentielle par room et la déduplication restent inchangées.

Le quiz utilise cette option : son validateur vérifie rôle, appartenance au groupe figé, identifiant de question, phase ouverte et absence de réponse antérieure. Deux joueurs répondant sur la même révision peuvent donc réussir ; une réponse ancienne ne peut pas changer un résultat révélé. Les futures questions R5 devront conserver des identifiants distincts. Aucun rejeu client automatique ni suppression globale du contrôle de révision n’est introduit. Cette solution ajoute une option ciblée au SDK ; demander un nouvel envoi utilisateur conserverait les refus de réponses concurrentes, et assouplir tous les jeux changerait leurs garanties.

## Quiz complet — R5

Le quiz étend son état privé avec l’index de question et les scores cumulés. Les cinq questions françaises et leurs solutions restent dans le module serveur. Les scores sont crédités une seule fois à la transition `question` → `revealed` ; une nouvelle révélation est refusée. Les réponses sont réinitialisées au passage à la question suivante. Les vues de question ne publient ni solution, ni scores, ni autres réponses ; les vues de révélation ajoutent le total cumulé.

L’intention hôte `next`, associée à l’identifiant de question, n’est autorisée qu’après révélation. Après la cinquième, elle expose la phase `results` sans `finished`. Le classement reste ainsi présent dans l’état serveur, y compris après rechargement. L’intention hôte `return-lobby`, autorisée uniquement depuis ces résultats, utilise le `finished` existant ; rooms, code et sessions restent en place et les départs volontaires sont nettoyés par le mécanisme existant. Un nouveau lancement crée un nouvel identifiant de partie et des scores nuls.

Convention d’affichage utilisée pour les égalités : rang de compétition partagé (1, 1, 3), ordre d’entrée au lobby conservé à score égal, aucun départage. Cette convention concrétise le classement stable demandé sans changer le barème. Les actions retardées sont contrôlées par l’identifiant de partie, l’identifiant distinct de question et la phase ; le mode de concurrence validé en R4 est conservé. Aucun changement du SDK, du moteur ou du transport n’est nécessaire. Chronomètre et révélation automatique restent R6.

## Temps autoritaire du quiz — R6

Chaque ouverture de question calcule `deadline = context.now + 20_000` côté serveur et programme un effet `schedule` existant, sous une clé unique de minuterie pour le quiz. La question et son échéance restent dans l’état privé ; la vue publique ajoute l’échéance absolue validée par Zod. Le callback vérifie l’identifiant de question, la phase et l’heure serveur ; s’il arrive trop tôt, il reprogramme uniquement le délai restant.

Chaque intention de réponse est refusée lorsque `context.now >= deadline`, même si le callback est retardé. La dernière réponse attendue révèle automatiquement ; sinon la minuterie révèle les réponses reçues et attribue zéro aux absences. La révélation manuelle anticipée de l’hôte reste disponible. Toutes ces voies utilisent la même transition de calcul des points et annulent la minuterie, pour créditer chaque question une seule fois. Le passage à la suivante reste une action de l’hôte et crée une nouvelle échéance. Les gardes de question, l’annulation/remplacement de clé et le nettoyage de partie/room réutilisent les garanties existantes du moteur.

Le compte à rebours React est indicatif : différence entre l’échéance serveur et l’heure locale, rafraîchie quatre fois par seconde et bornée entre zéro et vingt. Aucun temps ou score client n’est envoyé au serveur. Une horloge locale décalée peut donc fausser le chiffre affiché ; elle ne révèle pas la solution, ne valide pas une réponse tardive et ne bloque pas une réponse encore valide sur le serveur. Le navigateur attend toujours l’instantané autoritaire de révélation. Aucune synchronisation d’horloges, nouveau transport ou modification du SDK/moteur n’est introduit.

## Interruptions en partie — R7

Les garanties serveur existantes sont conservées : reprise authentifiée par session, instantané complet, remplacement de l’ancienne connexion, file par room, question/phase validées et échéance inchangée. Aucun changement du moteur, des contrats ou du protocole n’est nécessaire. Une coupure ne retire ni réponse ni points, et n’arrête aucune minuterie. Un participant qui revient après le passage à la suivante retrouve la question actuelle, sans réponse ancienne appliquée à celle-ci.

Les contrôles du quiz sont recréés lorsque changent la partie, la question, la phase ou la disponibilité de connexion. Le verrou d’une ancienne intention et les messages liés à son accusé ne peuvent ainsi bloquer ou polluer les contrôles suivants. Les callbacks asynchrones d’un panneau démonté ignorent leur résultat local ; le transport conserve sa garde de génération pour les réponses d’anciennes connexions. Aucune intention en attente n’est rejouée automatiquement par l’interface.

Une déconnexion explicitement imposée par le serveur est signalée avec une action de reconnexion, en conservant l’identité locale. Elle peut résulter d’une reprise par une autre connexion. Après une reprise réussie, les messages de coupure précédents sont retirés de l’écran. Le transport Socket.IO ne reprend pas automatiquement une connexion déconnectée par le serveur : le contrôle reste à la connexion remplaçante jusqu’à une reprise explicite. Le message ne prétend pas connaître la cause exacte au-delà de cette fermeture serveur. Les secrets ne sont ni affichés ni placés dans l’URL.

Les limites restent celles de la V1 : même onglet, serveur mémoire, aucune persistance après redémarrage, aucun transfert automatique d’hôte. Le compteur local reste indicatif ; l’échéance serveur ne se recalcule pas à la reprise.

## Lien d’admission et QR code — R8

Le lobby hôte construit `/join?code=CODE` depuis `window.location.origin`, en conservant schéma, hôte et port. Le seul paramètre partagé est le code public validé ; aucun identifiant interne, secret de session ou nom de joueur. Le formulaire normalise le code du lien, mais attend toujours la saisie du pseudo et une soumission explicite. Un code malformé, vide ou répété dans l’URL est signalé et reste corrigeable ; une room fermée est refusée par le service existant. La reprise de session existante garde priorité sur une nouvelle admission implicite.

Une origine LAN utilisable reste prioritaire pour l’invitation. Depuis `localhost`, une adresse de boucle locale ou une adresse générique d’écoute, la découverte côté serveur décrite ci-dessous fournit les candidates. Aucun port n’est codé en dur. Un nom d’hôte doit également être résolvable sur les téléphones.

`qrcode.react` 4.2.0 encode localement le lien en SVG (correction M, marge de quatre modules), sans service externe ni autre dépendance de production que React déjà présent. Les couleurs noir/blanc de lecture sont centralisées dans les tokens. `jsqr` 1.4.0 est ajouté uniquement aux dépendances de développement pour décoder le rendu réel dans les tests. Backend, contrats réseau, stockage et moteur restent inchangés.

## Découverte LAN pour les invitations — validée le 23 octobre 2026

Après essai réel concluant, le propriétaire a demandé la finalisation de cette méthode : `GET /api/network` renvoie uniquement les IPv4 privées non internes détectées via `os.networkInterfaces()`, validées par un contrat Zod partagé, sans cache. Aucun nom d’interface ni adresse MAC n’est envoyé. La détection concerne la machine serveur, pas celle du navigateur.

Quand l’origine courante ne permet pas déjà une invitation, le frontend interroge cette route. Une seule candidate est sélectionnée automatiquement ; plusieurs candidates nécessitent un choix explicite. Le QR conserve le protocole et le port du frontend, y compris derrière le proxy Vite, et ajoute uniquement le code public éventuel. Une erreur de détection conserve le parcours manuel. Une origine LAN déjà utilisable reste prioritaire et n’interroge pas cette route.

Cette fonctionnalité étend le repli localhost décrit dans R8. Il suppose que frontend et backend tournent sur le même ordinateur, conformément au lancement local actuel. Il ne garantit ni le choix de la bonne interface en présence d’un VPN unique, ni l’accès Wi-Fi/pare-feu. Pas de découverte client, de serveur externe, de nouveau stockage ou de modification du moteur. Les adresses IPv6 et link-local ne sont pas couvertes par cette détection.

Le client sépare la requête de découverte (`useLanAddresses`) du rendu du QR. La requête est annulée au démontage et limitée à cinq secondes ; une erreur HTTP, réseau ou de validation produit un message et une action de reprise sans perdre code ni pseudo. Les réponses sont dédupliquées. Les schémas publics résident dans `packages/contracts/src/network.ts` ; le contrôleur HTTP délègue le filtrage à une fonction serveur testable. Aucun changement du protocole Socket.IO ou du moteur.

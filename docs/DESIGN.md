# Direction artistique — Party Games

## Objectif

Nous souhaitons créer une plateforme de jeux de soirée avec une identité visuelle **minimaliste, moderne, sombre et légèrement néon**.

Le design doit évoquer un environnement numérique élégant, ludique et immersif, sans tomber dans l'esthétique arcade surchargée ou cyberpunk.

L'objectif est de trouver un équilibre entre :

- La sobriété d'une application SaaS moderne.
- Le caractère ludique d'une plateforme de jeux.
- Des accents lumineux inspirés des enseignes néon.
- Une interface claire, confortable et immédiatement compréhensible.

**Principe central : le minimalisme domine, le néon souligne.**

## 1. Ambiance générale

Utiliser un thème sombre par défaut.

L'interface doit donner une impression de modernité, de fluidité et de qualité, avec beaucoup d'espace entre les éléments.

Le design doit rester agréable même après plusieurs heures d'utilisation.

Éviter :
- Les arrière-plans excessivement décorés.
- Les particules permanentes.
- Les dégradés multicolores omniprésents.
- Les contours néon autour de chaque composant.
- Les animations trop nombreuses.
- Les effets de glassmorphism exagérés.
- Les interfaces trop chargées visuellement.

Privilégier :
- Des fonds sombres uniformes.
- Des surfaces légèrement différenciées.
- Des compositions aérées.
- Une hiérarchie typographique claire.
- Quelques éléments lumineux soigneusement choisis.
- Des animations courtes et fluides.

## 2. Palette de couleurs

Palette initiale proposée :

| Rôle | Couleur |
|---|---|
| Background principal | `#0B0D17` |
| Surface principale | `#151827` |
| Surface surélevée | `#1D2133` |
| Texte principal | `#F5F6FA` |
| Texte secondaire | `#A5A9BE` |
| Bordure discrète | `#303449` |
| Accent principal violet | `#A855F7` |
| Accent secondaire cyan | `#22D3EE` |
| Accent rose | `#F472B6` |
| Succès | `#34D399` |
| Attention | `#FBBF24` |
| Erreur | `#FB7185` |

Ces couleurs constituent une proposition initiale et doivent être centralisées dans des design tokens.

Ne pas disperser les valeurs hexadécimales dans les composants.

Le violet sera l'accent principal de la plateforme.

Le cyan et le rose pourront être utilisés ponctuellement pour différencier des jeux, des états ou des éléments interactifs.

Éviter d'utiliser simultanément toutes les couleurs d'accent sur un même écran.

## 3. Effets néon

Le néon doit être discret, localisé et intentionnel.

Il peut être utilisé sur :
- Les icônes des jeux.
- Les boutons principaux.
- Certains états sélectionnés.
- Les indicateurs de progression.
- Les éléments importants d'une partie.
- Les animations de victoire ou de résultat.

Exemple d'intention visuelle :

Une icône de quiz peut être représentée par une ampoule dessinée avec un trait violet ou jaune légèrement lumineux.

La carte contenant cette icône reste sobre, avec un fond sombre et une bordure discrète.

Ne pas entourer systématiquement toute la carte d'un halo lumineux.

L'effet lumineux doit être composé d'une couleur principale nette et d'une ombre diffuse peu intense.

Le néon ne doit jamais compromettre la lisibilité.

## 4. Iconographie

Utiliser principalement des icônes simples en outline.

Lucide Icons constitue une bonne base.

Les icônes doivent avoir :
- Un trait relativement fin et régulier.
- Une géométrie simple.
- Peu de détails.
- Une taille cohérente.
- Une couleur d'accent adaptée à leur contexte.

Certaines icônes importantes peuvent recevoir un léger effet néon.

Éviter les emojis comme éléments principaux de l'interface.

Éviter les illustrations complexes lorsque des icônes simples suffisent.

## 5. Typographie

Utiliser une typographie sans-serif moderne, lisible et sobre.

Préférences possibles :
- Inter.
- Geist.
- Manrope.

Utiliser une seule famille principale dans la V1.

Les titres doivent être nets, bien hiérarchisés et suffisamment visibles à distance.

Éviter les polices futuristes excessivement stylisées.

Ne pas appliquer d'effet lumineux aux paragraphes ou aux textes ordinaires.

Les effets lumineux sur la typographie doivent rester exceptionnels.

## 6. Composants

### Cartes

- Fond légèrement plus clair que le background.
- Coins arrondis modérément.
- Bordure fine et discrète.
- Espacement intérieur généreux.
- Icône identifiable.
- Titre court.
- Description facultative.

Au survol, une carte peut légèrement s'élever ou changer de bordure.

Un halo subtil peut apparaître autour de son icône.

### Boutons

Bouton principal :
- Couleur d'accent dominante.
- Texte très lisible.
- Forme simple.
- Éventuel halo discret au survol.

Bouton secondaire :
- Surface sombre.
- Bordure subtile.
- Aucun halo permanent.

Ne pas transformer tous les boutons en éléments néon.

### Champs de formulaire

- Fond sombre.
- Bordure discrète.
- Focus visible avec la couleur principale.
- Messages d'erreur clairs.
- Zones tactiles confortables.

### Navigation

- Minimaliste.
- Peu d'éléments visibles simultanément.
- Icônes accompagnées de libellés lorsque nécessaire.
- Éviter les menus complexes.

## 7. Animations

Les animations doivent renforcer les interactions plutôt que décorer l'interface.

Exemples :
- Apparition douce d'une carte.
- Transition entre deux questions.
- Confirmation d'une réponse.
- Animation courte lorsqu'un joueur rejoint une room.
- Mise en évidence d'un gagnant.

Utiliser principalement opacity et transform pour les transitions courantes.

Préférer des durées courtes, généralement entre 150 et 300 ms.

Les animations de victoire peuvent être plus expressives.

Respecter `prefers-reduced-motion`.

Éviter les animations lumineuses permanentes.

## 8. Interface TV et interface mobile

Le projet doit proposer deux expériences complémentaires.

### Interface TV / Hôte

L'interface doit être lisible à plusieurs mètres.

Prévoir :
- Des titres de grande taille.
- Des informations prioritaires bien visibles.
- Des contrastes suffisants.
- Peu de texte secondaire.
- Des scores facilement identifiables.
- Des animations perceptibles sans être envahissantes.

Ne pas reproduire simplement une interface desktop classique sur la télévision.

### Interface mobile / Joueur

L'interface doit être utilisable d'une seule main.

Prévoir :
- Des boutons suffisamment grands.
- Des actions principales immédiatement accessibles.
- Une hiérarchie visuelle simple.
- Un minimum de défilement pendant les parties.
- Des retours visuels immédiats.

Les effets de survol ne doivent pas être nécessaires pour comprendre une interaction.

## 9. Identité propre à chaque jeu

La plateforme conserve une identité globale cohérente.

Chaque jeu peut cependant posséder :
- Une couleur d'accent.
- Une icône spécifique.
- Des animations adaptées.
- Certains composants visuels propres.

Exemples :
- Quiz : violet.
- Blind test : cyan.
- Dessin : rose.
- Jeu de mots : vert.

Ces associations sont indicatives et pourront évoluer.

Les jeux doivent partager les mêmes conventions de navigation, de typographie, d'espacement et d'accessibilité.

## 10. Accessibilité et lisibilité

Le design doit rester fonctionnel sans les effets néon.

Respecter autant que possible les recommandations WCAG AA pour le contraste.

Ne pas utiliser uniquement la couleur pour transmettre une information.

Prévoir des états de focus visibles au clavier.

Garantir une bonne lisibilité sur les écrans de télévision, les ordinateurs et les smartphones.

## 11. Organisation technique

Utiliser Tailwind CSS et shadcn/ui comme fondations.

Centraliser :
- Les couleurs.
- Les rayons de bordure.
- Les espacements.
- Les typographies.
- Les ombres.
- Les animations.
- Les variantes des composants.

Créer des composants réutilisables lorsque cela présente un réel intérêt.

Ne pas multiplier les abstractions inutiles.

## 12. Consignes pour les agents IA

Avant de développer une nouvelle interface, consulter ce document.

Ne pas improviser une nouvelle direction artistique pour chaque fonctionnalité.

Respecter les composants et les tokens existants.

Ne pas ajouter d'effets néon simplement pour rendre une interface plus spectaculaire.

Privilégier systématiquement la lisibilité, la simplicité et la cohérence.

Lorsqu'une décision visuelle importante n'est pas couverte par cette documentation, proposer une solution cohérente avant de l'implémenter.

## Résumé de la direction artistique

**Minimalisme sombre + touches néon subtiles + iconographie outline + typographie moderne + animations légères.**

Nous voulons une plateforme qui ressemble à un produit moderne et soigné, avec une personnalité ludique, et non à une borne d'arcade saturée d'effets lumineux.

## 13. Validation du design system lors de l’initialisation

Lors de l’initialisation du frontend, créer une petite page de démonstration du design system avant de construire les pages de l’application.

Cette page doit présenter les boutons, les cartes de jeux, les icônes et les champs de formulaire, ainsi que leurs états interactifs pertinents : survol, focus clavier, sélection, désactivation, chargement et erreur. Les interactions doivent pouvoir être essayées sur la page.

Vérifier la lisibilité sur écran partagé et sur smartphone, les contrastes, les zones tactiles et le respect de `prefers-reduced-motion`.

Cette démonstration servira à valider les tokens, les variantes et la cohérence du design system avant de décliner toutes les pages. Les couleurs, polices et associations propres aux jeux encore présentées comme des propositions restent à valider.

## 14. Admission par QR code

Le QR de room reste noir sur fond blanc, avec une marge de lecture de quatre modules, sans halo ni décoration sur les modules. Ses couleurs sont centralisées dans les tokens `--qr-background` et `--qr-foreground`. Sur l’écran hôte, le QR et le code manuel sont empilés dans la colonne d’invitation, à droite des participants ; les petits écrans empilent les colonnes. Le lien textuel et la saisie manuelle constituent les alternatives au scan. Vérifier le scan réel depuis la télévision lors de R9.

## 15. Évolutions visuelles validées — C1/C2

Choix fixes : triangle rose-rouge, losange cyan, cercle jaune et carré vert, couleurs centralisées dans `--choice-a` à `--choice-d`. TV : forme et texte ; téléphone : formes seules en deux colonnes, avec nom accessible complet et sélection marquée par contour et coche. Les textes réapparaissent à la révélation. Les votes sociaux et mensonges gardent leurs libellés textuels.

Le lobby hôte réutilise le visuel de l’atelier avec un moniteur et un téléphone par connexion active. L’orbite continue lente et le léger balancement constituent une exception ciblée à la préférence générale pour les animations courtes : ils restent limités au lobby hôte et sont désactivés par mouvement réduit. Deux anneaux évitent les superpositions jusqu’à douze joueurs. La liste textuelle conserve les identités hors ligne ; les téléphones joueurs n’affichent pas cette animation.

Le dessin utilise exclusivement `--drawing-background` et `--drawing-ink` pour le fond blanc et le crayon noir. Les illustrations du jeu d’images sont des indices vectoriels originaux embarqués, sans ressources externes ; sources reproductibles avec les assets serveur.

## 16. Résultats et transitions de phase

Les valeurs numériques de classement restent insécables. Le total et le gain de manche sont regroupés dans une seule colonne alignée à droite ; les noms peuvent se répartir sur plusieurs lignes, mais jamais les chiffres d’un gain comme « +1000 ».

Le chrono est présenté dans un encadré contrasté, avec une grande valeur numérique et un libellé de phase explicite (fin du vote, du dessin, prochaine manche ou classement final). Il reste visible au défilement et passe en couleur attention à cinq secondes, sans animation clignotante. La valeur reste indicative ; seul le serveur décide du changement de phase. Les lecteurs d’écran ne reçoivent pas une annonce à chaque seconde.

## 17. Écrans centrés sur l’action

Le lobby hôte sépare l’admission du catalogue : QR et code empilés à droite, participants à gauche, puis « Choisir un jeu ». Un retour aux participants conserve la room. Les instructions manuelles se limitent au libellé et à l’URL. Les décorations et espacements restent secondaires face aux informations utiles.

Pendant une manche, afficher en priorité phase, chrono, question et commandes. Aucun classement pendant la saisie ou le vote ; les points apparaissent à la révélation et au classement final. Sur téléphone, la révélation des images conserve la bonne réponse et le choix du joueur, sans répéter toute l’image et les mauvaises réponses. Le dessin partagé reste disponible dans un format compact.

Les champs de saisie utilisent au moins 16 px pour éviter le zoom automatique au focus sur iPhone. Ne pas désactiver le zoom manuel. Les mises en page visent un écran sans défilement pour les contenus courants ; les longs contenus, erreurs, listes et besoins d’agrandissement conservent un défilement accessible plutôt qu’une hauteur bloquée.

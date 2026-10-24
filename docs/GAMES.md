# Règles validées des nouveaux jeux

## Principes

Questions et mots français, sélection serveur sans répétition dans une partie. Joueurs fixés au lancement, reprise sans pause, points réinitialisés entre parties. Progression automatique, résultats intermédiaires 10 secondes (réglables 5–60), classement final persistant jusqu’au retour hôte au lobby. Le quiz historique conserve sa progression et son barème.

| Jeu | Minimum | Manches | Temps par défaut | Réglages |
| --- | --- | --- | --- | --- |
| Qui de nous ? | 2 | 5 | Vote 30 s | 1–20 manches, vote 10–120 s |
| Menteur | 3 | 5 | Invention 60 s, vote 30 s | 1–20 manches, invention 15–180 s, vote 10–120 s |
| Images | 2 | 5 | Réponse 20 s | 1–20 manches, réponse 5–120 s |
| Dessin | 3 | Un tour de table | Choix 15 s, dessin 90 s | 1–3 tours, dessin 30–180 s |

Le nombre de manches ne dépasse pas les entrées disponibles. Cible de validation : 12 joueurs.

## Qui de nous ?

Vote définitif, soi-même autorisé. Après tous les votes ou échéance, publier totaux et votants. Chaque votant qui a désigné une personne arrivée en tête gagne un point, égalités comprises. Sans vote exprimé, zéro point.

## Le menteur

Inventions privées, une proposition acceptée définitive. Refuser vérité, alias ou doublon après normalisation casse/accents/espaces, avec possibilité de réessayer. Mélanger inventions et vérité anonymement ; interdire le vote pour soi côté serveur. Vote définitif : deux points pour la vérité, un par vote attiré. Révéler vérité, auteurs, votes et points. Sans invention valide, révélation sans vote ni points.

## Images

Image et quatre choix sur TV, formes seules sur téléphone. Réponse définitive ; points `floor(1000 / rang d’arrivée des bonnes réponses)` selon réception serveur. Erreur/absence : zéro. Révélation après toutes les réponses ou échéance. Banque initiale : dix illustrations originales par catégorie (jeux, films, pays), choix confirmé par le propriétaire.

## Dessin

Chacun dessine une fois par tour. Trois mots privés, choix sous 15 secondes ; sans choix, manche à zéro. Crayon noir, une épaisseur, tout effacer, surface carrée et tracé progressif. Propositions privées, 80 caractères maximum, trois par seconde, reconnaissance normalisée et alias ; une seule récompense par joueur. Devineurs : `floor(1000 / rang)`, dessinateur : 100 par personne ayant trouvé. Fin lorsque tous ont trouvé ou à l’échéance. Mot et bonnes propositions masqués avant révélation.

## Imports

ZIP avec `manifest.json` versionné, titre, jeu et entrées spécifiques. Images JPEG/PNG/WebP uniquement. Import atomique, limite ZIP 20 Mio, décompression 50 Mio et bibliothèque importée 200 Mio. Refuser chemins sortants, archives imbriquées, exécutables et entrées invalides. Bibliothèque commune aux rooms jusqu’au redémarrage ; packs intégrés permanents, suppression d’un import inutilisé uniquement. Authentifier les opérations d’écriture avec une session hôte existante. Ne pas exposer les manifestes ou réponses dans les ressources publiques.

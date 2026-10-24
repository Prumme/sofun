# Sources des illustrations

Les trente illustrations sont des compositions vectorielles originales créées pour ce dépôt. Aucune capture de jeu, affiche de film, photo, logo ou police externe n’a été téléchargée. Elles servent d’indices stylisés, et non de reproductions des images des œuvres citées.

- Source reproductible : `scripts/generate-game-art.mjs`.
- Chaque `scene-NN.svg` est la source vectorielle du PNG de même nom.
- `index.json` associe les illustrations aux réponses côté serveur uniquement.
- Dix indices de jeux, dix de films et dix de pays.
- Les noms d’œuvres identifient les réponses du jeu ; aucune affiliation n’est revendiquée.

Les PNG sont embarqués, générés à partir des SVG avec le navigateur Playwright déjà utilisé dans le projet. La génération ne fait aucun appel externe. Les sources et leur table de réponses ne sont pas servies par les routes web publiques.

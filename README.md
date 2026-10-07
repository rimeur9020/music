# Atelier musique

Site statique (HTML/CSS/JS, sans installation) pour travailler la musique.

## Théorie
- **Oreille** : reconnaître les notes (5 niveaux, avec ou sans Do de référence), les intervalles et les accords.
- **Lecture de notes** : clé de sol, clé de fa ou les deux, 5 niveaux (dans la portée → lignes supplémentaires → altérations → chrono 60 s).
- **Gammes** : majeure, modes, mineures, pentatoniques, blues, gammes symétriques… avec formule, couleur, usage, notes sur la portée et accords de la gamme.
- **Rythme** : croches, doubles croches, notes pointées, contretemps et syncopes ; exercices « reconnais le rythme » et « tape le rythme » (4 niveaux, tempo réglable).
- **Accords** : construction (empilement de tierces), triades, sus, septièmes, extensions, renversements, lecture des symboles ; constructeur interactif et quiz « trouve les notes ».

## Guitare
- **Notes du manche** : mémoriser les notes des cases 0 à 12 (explications, repères, jeu en 3 modes + défi 60 s).
- **Gammes sur le manche** : toute gamme dans toute tonalité, sur tout le manche ou par position ; fondamentales entourées en orange, option « seulement les fondamentales ».
- **Formes d’accords** : banque de formes mobiles (fondamentale sur la 6e ou la 5e corde), classées par type d’accord, fondamentale entourée, notes facultatives et barrés indiqués.
- **Jeu d’accords** : un nom d’accord s’affiche, on pose les doigts sur le manche ; 4 niveaux, indice et solution.
- **Guitaristes** : on tape le nom d’un guitariste et on obtient sa vie, son matériel et sa technique (fiches rédigées pour les plus connus dans `js/guitar/guitarists.js`, sinon résumé automatique de Wikipédia).
- **Trouver le son** : on enregistre une fois son matériel (guitare, ampli, pédales), puis on tape une chanson, un artiste ou un style ; le site donne sélecteur de micro, chaîne de pédales avec réglages, réglages d’ampli et adaptations au matériel ; à chaque recherche, le site cherche sur le web (DuckDuckGo) et lit les sites spécialisés (Equipboard, Ground Guitar, Premier Guitar, Guitar World, MusicRadar, forums… via un relais public), ainsi que Wikipédia (anglais) et Wikidata, pour trouver interprète, guitaristes, genre, guitares, amplis, effets et accordage cités, construit les réglages à partir de ces indices indique les réglages qui changent selon les parties (« Couplets = … », « Refrains = … », « Solo = … ») et affiche les citations sources ; les recherches sont gardées en mémoire dans le navigateur (réaffichage instantané, bouton pour refaire la recherche) (`js/guitar/tone-research.js`, base de départ dans `js/guitar/tone-data.js`).
- **Backing tracks** : recherche de backing tracks sur YouTube (plusieurs moteurs essayés à la suite : page YouTube, Invidious, Piped, DuckDuckGo, Bing), lecture intégrée sans téléchargement, départ 15 s avant le solo quand la description de la vidéo indique où il commence, repères début/fin enregistrés, boucle et vitesse réglable.
- **Partition → accords** : envoie une photo de la partition avec les accords **surlignés au fluo** (ou mode « toute la page ») → les accords sont lus (OCR Tesseract, chargé depuis internet la première fois), corrigeables, puis les boucles qui se répètent sont nommées **A, B, C…** avec une zone « où chaque partie revient », l’ordre du morceau, l’écoute et un export PDF. Toutes les notations de la fiche d’accords sont comprises (-7, +, +7, -7(b5), -maj7, add2, -add4, -(b6), 6/9, 7(b9,#5), 7(9,13), -9+7, maj7(#5,#11), 13sus4…) et **chaque accord est dessiné sur le manche** (accord ouvert si possible, sinon la forme de la fiche, avec la fondamentale en orange ; bouton « autre doigté »).

## Utilisation
Ouvrir `index.html` dans un navigateur, ou publier le dépôt avec GitHub Pages
(Settings → Pages → Deploy from a branch → branche + dossier `/`).

Bibliothèques incluses dans `vendor/` : jsPDF, JSZip (MIT) et la police Noto Music (OFL).

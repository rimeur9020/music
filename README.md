# Atelier musique

Site statique (HTML/CSS/JS, sans installation) pour travailler la musique.

## Théorie
- **Oreille** : reconnaître les notes (5 niveaux, avec ou sans Do de référence), les intervalles et les accords.
- **Lecture de notes** : clé de sol, clé de fa ou les deux, 5 niveaux (dans la portée → lignes supplémentaires → altérations → chrono 60 s).
- **Gammes** : majeure, modes, mineures, pentatoniques, blues, gammes symétriques… avec formule, couleur, usage, notes sur la portée et accords de la gamme.
- **Accords** : construction (empilement de tierces), triades, sus, septièmes, extensions, renversements, lecture des symboles ; constructeur interactif et quiz « trouve les notes ».

## Guitare
- **Gammes sur le manche** : toute gamme dans toute tonalité, sur tout le manche ou par position ; fondamentales entourées en orange, option « seulement les fondamentales ».
- **Dictionnaire d’accords** : « Mes accords » (liste dans `js/guitar/my-chords.js` + ajout depuis le site), accords ouverts (catégorie à part), et tous les accords dans toutes les tonalités (formes de Mi et de La).
- **Jeu d’accords** : un nom d’accord s’affiche, on pose les doigts sur le manche ; 4 niveaux, indice et solution.
- **Partition → accompagnement** : photo/scan, fichier MusicXML (.musicxml/.xml/.mxl) ou saisie des notes → tonalité, accords proposés (ou repris de la partition), rythmique selon le style et le tempo, parties A/B détectées, écoute, et **fiche PDF d’une page** (accords de chaque partie une seule fois, structure en bas de page).

## Utilisation
Ouvrir `index.html` dans un navigateur, ou publier le dépôt avec GitHub Pages
(Settings → Pages → Deploy from a branch → branche + dossier `/`).

Bibliothèques incluses dans `vendor/` : jsPDF, JSZip (MIT) et la police Noto Music (OFL).

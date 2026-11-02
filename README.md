# Carte des artisans pour Gladys Assistant

Intégration externe de [Gladys Assistant](https://gladysassistant.com) qui
affiche les artisans d'un métier autour de votre maison, à partir des données
publiques de la [Carte des artisans](https://cartedesartisans.fr/) (Sirene de
l'Insee, répertoire des métiers des CMA, labels RGE et EPV ; plus de 3 millions
d'établissements, mis à jour chaque mois).

La Carte des artisans est un site indépendant, non affilié à l'Insee ni aux
chambres de métiers et de l'artisanat.

- **Widget « Artisans près de chez moi »** : métier, rayon (5 à 50 km),
  labellisés seulement ; jusqu'à 8 entreprises, labellisées d'abord puis les
  plus proches, avec fiche, itinéraire, téléphone quand l'artisan l'a ajouté.
- **Action de scène « Chercher un artisan »** : nom, téléphone, adresse,
  distance et lien du premier résultat, pour un message par exemple.

Mode d'emploi : [docs/fr.md](docs/fr.md) ([English](docs/en.md)).

## Fonctionnement

```
index.js           branchement du SDK (widget, action de scène, bouton Tester)
src/service.js     recherche autour de la maison Gladys (getHouses)
src/recherche.js   règles du site : rayon, tri, bloc « Sponsorisé »
src/donnees.js     lecture des fichiers du site, cache mémoire et disque (/data)
src/widgets.js     contenu du widget (card-list)
src/scenes.js      action de scène
src/geo.js         distances
scripts/metiers.mjs  remplit les listes « Métier » du manifest
```

Les données viennent de l'export léger du site,
`https://cartedesartisans.fr/donnees/export/` : `index.json` (rubriques,
emprise et activités de chaque département), `communes.json` et un fichier JSON
par département × activité. Seuls les fichiers des départements à portée du
rayon sont téléchargés, puis gardés jusqu'à la mise à jour mensuelle suivante.
`recommandes.js`, `maitres-artisans.js` et `enrichies.js` (informations
ajoutées par les artisans) sont relus toutes les 6 heures.

La position de la maison ne sert qu'aux calculs de distance, dans le conteneur :
elle n'est jamais envoyée. Les liens vers le site portent `mtm_campaign=gladys`.

### Ordre et bloc « Sponsorisé »

Mêmes règles que le site
([faq.html#classement](https://cartedesartisans.fr/faq.html#classement)) :
labellisés (RGE, EPV, Maître artisan) d'abord, puis les plus proches. Les
artisans recommandés (option payante en cours, activité réelle ciblée et
recherchée, département ou commune de la maison ciblés) apparaissent au plus
3, tirés au hasard, en tête de liste et marqués « Sponsorisé », sans changer
les résultats ni leur ordre. L'action de scène n'en renvoie jamais.

## Développement

```bash
npm install
npm test               # tests (sans réseau, faux Gladys du SDK)
npm run lint
npm run format:check
npm run metiers        # met à jour les listes « Métier » depuis le site
npx github:GladysAssistant/integration-store .   # contrôles du store
```

Lancer en local contre un Gladys :

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<jeton>" \
GLADYS_INTEGRATION_SELECTOR="carte-des-artisans" \
DATA_DIR=./data LOG_LEVEL=debug npm start
```

Les valeurs des listes « Métier » (`<catégorie>.<rubrique>`) sont enregistrées
par Gladys dans les widgets et les scènes : ne jamais les renommer. Une
rubrique disparue du site reste dans la liste (le widget affiche un message).

## Publier une version

1. Décrire les changements sous `## [Unreleased]` dans `CHANGELOG.md`.
2. **Actions › Release › Run workflow** (patch, minor ou major) : versions,
   étiquette, image `ghcr.io` multi-architecture et GitHub Release.
3. L'indexeur du store Gladys reprend la nouvelle version dans l'heure.

Démarré depuis le modèle officiel
[integration-template-js](https://github.com/GladysAssistant/integration-template-js).

## Licence

Apache-2.0. Données : licence ouverte (Etalab 2.0), voir
[cartedesartisans.fr](https://cartedesartisans.fr/mentions-legales.html).

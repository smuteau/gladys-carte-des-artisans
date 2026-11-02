# Carte des artisans

Trouvez les artisans de votre métier autour de votre maison, directement dans
Gladys : plombiers, électriciens, menuisiers, boulangers, garagistes…
L'intégration lit les données publiques de la
[Carte des artisans](https://cartedesartisans.fr/), un site indépendant (non
affilié à l'Insee ni aux chambres de métiers et de l'artisanat) qui recense
plus de 3 millions d'établissements artisanaux actifs en France métropolitaine
et en Corse.

## Avant de commencer

- **Gladys 5.1 ou plus récent.**
- **La position de votre maison** doit être renseignée dans
  **Paramètres › Maisons**. L'intégration cherche autour de la première maison
  localisée (par ordre alphabétique).
- L'installation demande l'accès à la **position de la maison** : elle ne sert
  qu'à calculer les distances, **dans Gladys**. Elle n'est jamais envoyée au
  site ni à un autre service.

Il n'y a rien à régler dans l'onglet **Configuration** : le bouton
**Tester la connexion** vérifie que les données sont lisibles et que la
maison est localisée.

## Widget « Artisans près de chez moi »

Ajoutez-le à un tableau de bord, puis choisissez dans ses réglages :

- **Métier** : l'une des 126 rubriques de la Carte des artisans ;
- **Rayon** : 5, 10, 25 ou 50 km autour de la maison ;
- **Seulement les entreprises labellisées** (RGE, EPV, Maître artisan).

Le widget affiche le nombre d'artisans trouvés et jusqu'à 8 entreprises. Un
appui sur une entreprise montre son activité, son adresse, ses labels, son
téléphone si l'artisan l'a ajouté, et les liens **Voir la fiche** et
**Itinéraire**. Le bouton **Voir sur la carte** ouvre la carte du site pour ce
métier et votre commune (jamais votre position exacte).

Ajoutez plusieurs widgets pour suivre plusieurs métiers.

### Ordre des résultats

Comme sur le site : les **entreprises labellisées** (RGE, Entreprise du
patrimoine vivant, Maître artisan) d'abord, puis **les plus proches**.

### Entrées « Sponsorisé »

En tête de liste peuvent apparaître jusqu'à 3 entrées marquées
**Sponsorisé** : ce sont des artisans qui ont souscrit l'option payante
« Artisan recommandé » pour ce métier dans votre département ou votre commune.
Elles sont tirées au hasard, toujours signalées, et **n'ont aucun effet sur
les autres résultats ni sur leur ordre**. L'action de scène n'en renvoie
jamais. Détails : [règles de classement](https://cartedesartisans.fr/faq.html#classement).

## Action de scène « Chercher un artisan »

Dans l'éditeur de scènes, catégorie **Intégrations**. Choisissez le métier, le
rayon et éventuellement « labellisés seulement ». L'action fournit aux actions
suivantes de la scène :

| Variable    | Contenu                                     |
| ----------- | ------------------------------------------- |
| `trouve`    | vrai si au moins un artisan a été trouvé    |
| `nombre`    | nombre d'artisans dans le rayon             |
| `nom`       | nom du premier artisan (labellisés d'abord) |
| `telephone` | son téléphone, s'il l'a ajouté sur le site  |
| `adresse`   | son adresse                                 |
| `distance`  | sa distance à la maison (« 2,4 km »)        |
| `lien`      | lien vers sa fiche sur cartedesartisans.fr  |

Exemple : une alerte de fuite d'eau qui envoie un message « Plombier le plus
proche : nom, téléphone, lien ».

## Données et vie privée

- Sources : Sirene (Insee) et répertoire des métiers (CMA), licence ouverte,
  mises à jour une fois par mois ; labels RGE (ADEME) et EPV (DGE).
- L'intégration télécharge seulement les fichiers nécessaires (un par métier et
  par département proche, quelques kilo-octets), les garde dans son dossier
  `/data` et ne les relit qu'à la mise à jour mensuelle. Les informations
  ajoutées par les artisans (téléphone, labels Maître artisan, artisans
  recommandés) sont relues toutes les 6 heures.
- Aucune donnée vous concernant n'est envoyée : ni position, ni identifiant,
  ni cookie. Les liens vers le site portent seulement `mtm_campaign=gladys`,
  pour compter les visites venues de Gladys.

## Dépannage

- **« Indiquez la position de votre maison »** : renseignez-la dans
  Paramètres › Maisons, puis rouvrez le tableau de bord.
- **« Ce métier n'existe plus »** : la rubrique a été retirée du site ;
  choisissez-en une autre dans les réglages du widget.
- **Aucun résultat** : élargissez le rayon.
- **Une erreur sur une entreprise** (adresse, retrait) : utilisez le lien
  « Signaler une erreur » de sa fiche sur le site.

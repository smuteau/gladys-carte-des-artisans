# Changelog

Toutes les évolutions notables de l'intégration sont décrites ici. Format
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions
[sémantiques](https://semver.org/lang/fr/).

Chaque évolution s'ajoute sous `## [Unreleased]` ; le workflow Release déplace
cette section sous la version publiée, et elle devient le texte de la GitHub
Release.

## [Unreleased]

### Added

- Widget « Artisans près de chez moi » : artisans d'un métier autour de la
  maison Gladys (rayon de 5 à 50 km, labellisés seulement en option),
  labellisés d'abord puis les plus proches, entrées « Sponsorisé » signalées en
  tête, lien vers la carte du site.
- Action de scène « Chercher un artisan » : nom, téléphone, adresse, distance et
  lien du premier résultat, nombre d'artisans trouvés.
- Bouton « Tester la connexion » dans l'écran de configuration.
- Cache des données dans `/data`, relu seulement à la mise à jour mensuelle du
  site.

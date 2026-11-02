// -----------------------------------------------------------------------------
// Recherche autour de la maison Gladys : réunit la position de la maison
// (getHouses, manifest « location »), les données du site et les règles de
// src/recherche.js. Partagé par le widget et l'action de scène.
// -----------------------------------------------------------------------------

import { SITE } from './donnees.js';
import { chercher, communeProche, jourParis, sponsorises } from './recherche.js';

const DELAI_MAISONS = 10 * 60 * 1000;
export const RAYONS = [5, 10, 25, 50];
export const RAYON_DEFAUT = 10;

/** Rayon accepté (valeur d'un select, donc une chaîne) ; sinon le rayon par défaut. */
export function rayonValide(valeur) {
  const n = Number(valeur);
  return RAYONS.includes(n) ? n : RAYON_DEFAUT;
}

/** Lien vers la fiche du site ; la campagne distingue ces visites dans la mesure d'audience. */
export const lienFiche = (siret) => `${SITE}/fiche.html?siret=${siret}&mtm_campaign=gladys`;

/** Lien vers la carte pour la rubrique et la commune (jamais la position de la maison). */
export function lienCarte(rubrique, commune) {
  const ville = commune ? `&ville=${encodeURIComponent(commune.cle).replace(/%7C/g, '|')}` : '';
  return `${SITE}/carte.html?mtm_campaign=gladys#rub=${encodeURIComponent(rubrique)}${ville}`;
}

export const lienItineraire = (e) =>
  `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lon}`;

export function creerService(gladys, source) {
  let maisons = null;
  let maisonsLues = 0;

  // Première maison localisée (par nom) : la position change rarement, relue toutes les 10 min
  async function maison() {
    if (!maisons || Date.now() - maisonsLues > DELAI_MAISONS) {
      maisons = await gladys.getHouses();
      maisonsLues = Date.now();
    }
    const m = maisons.find((h) => Number.isFinite(h.latitude) && Number.isFinite(h.longitude));
    return m ? { nom: m.name, lat: m.latitude, lon: m.longitude } : null;
  }

  /**
   * @returns {Promise<{etat: 'sans-maison'|'rubrique-inconnue'|'ok', ...}>}
   */
  async function rechercher({ rubrique, rayon, labellises = false, avecSponsorises = true }) {
    const index = await source.index();
    const rub = index.rubriques[rubrique];
    if (!rub) return { etat: 'rubrique-inconnue', rubrique };
    const centre = await maison();
    if (!centre) return { etat: 'sans-maison', rubrique, titre: rub.titre };
    const rayonKm = rayonValide(rayon);
    const [maitres, enrichies, communes] = await Promise.all([
      source.fichierAdmin('maitres'),
      source.fichierAdmin('enrichies'),
      source.communes(index),
    ]);
    const resultats = await chercher({
      index,
      lire: (dep, code) => source.lignes(index, dep, code),
      centre,
      rayonKm,
      codes: rub.codes,
      labellisesSeulement: labellises,
      maitres,
    });
    const commune = communeProche(communes, centre);
    const recommandes = avecSponsorises ? await source.fichierAdmin('recommandes') : [];
    return {
      etat: 'ok',
      rubrique,
      titre: rub.titre,
      rayonKm,
      commune,
      resultats,
      enrichies,
      sponsorises: sponsorises({ recommandes, codes: rub.codes, commune, jour: jourParis() }),
      activites: index.activites,
      genere: index.genere,
    };
  }

  return { rechercher, maison };
}

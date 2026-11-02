// -----------------------------------------------------------------------------
// Recherche d'artisans autour d'un point, avec les règles du site :
//   - résultats : établissements de la rubrique dans le rayon, labellisés
//     (RGE, EPV, Maître artisan) d'abord, puis du plus proche au plus loin ;
//   - bloc « Sponsorisé » à part (option « Artisan recommandé » en cours,
//     activité réelle ciblée et recherchée, département ou commune de la
//     maison ciblés), au plus 3, tirés au hasard, sans effet sur les
//     résultats ni sur leur ordre.
// -----------------------------------------------------------------------------

import { distanceEmprise, distanceKm } from './geo.js';

export const MAX_SPONSORISES = 3;
const PARALLELE = 6;

/** Clé de commune du site : minuscules, sans accents, « - » et « ' » remplacés par des espaces. */
export function cleCommune(nom, dep) {
  const n = String(nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-']/g, ' ');
  return `${n}|${dep}`;
}

/** « SAINT-ETIENNE-DU-ROUVRAY » → « Saint-Etienne-du-Rouvray » (comme titre() du site). */
export function titre(texte) {
  const petits = new Set([
    'de',
    'du',
    'des',
    'la',
    'le',
    'les',
    'sur',
    'sous',
    'en',
    'et',
    'aux',
    'au',
    'lès',
  ]);
  return String(texte ?? '')
    .toLowerCase()
    .replace(
      /(^|[\s'-])(\p{L}+)/gu,
      (m, sep, mot) => sep + (sep && petits.has(mot) ? mot : mot[0].toUpperCase() + mot.slice(1)),
    );
}

/** Commune dont le centre est le plus proche du point : { nom, dep, cle }. */
export function communeProche(communes, point) {
  let meilleure = null;
  let min = Infinity;
  for (const [nom, dep, lat, lon] of communes) {
    // Préfiltre grossier (≈ 50 km) avant le calcul exact
    if (Math.abs(lat - point.lat) > 0.5 || Math.abs(lon - point.lon) > 0.7) continue;
    const d = distanceKm(point, { lat, lon });
    if (d < min) {
      min = d;
      meilleure = { nom, dep, cle: cleCommune(nom, dep) };
    }
  }
  return meilleure;
}

async function parLots(taches, n) {
  const resultats = [];
  for (let i = 0; i < taches.length; i += n) {
    resultats.push(...(await Promise.all(taches.slice(i, i + n).map((t) => t()))));
  }
  return resultats;
}

/**
 * @param {object} p
 * @param {object} p.index index.json de l'export
 * @param {(dep: string, code: string) => Promise<any[]>} p.lire lignes d'un fichier
 * @param {{lat: number, lon: number}} p.centre
 * @param {number} p.rayonKm
 * @param {string[]} p.codes codes d'activité recherchés
 * @param {boolean} [p.labellisesSeulement]
 * @param {Record<string, object>} [p.maitres] SIRET des Maîtres artisans
 * @returns {Promise<object[]>} établissements triés
 */
export async function chercher({
  index,
  lire,
  centre,
  rayonKm,
  codes,
  labellisesSeulement,
  maitres = {},
}) {
  const F = Object.fromEntries(index.champs.map((c, i) => [c, i]));
  const taches = [];
  for (const [dep, info] of Object.entries(index.departements)) {
    if (distanceEmprise(centre, info.emprise) > rayonKm) continue;
    for (const code of codes) {
      if (info.activites[code]) taches.push(() => lire(dep, code).then((l) => ({ dep, code, l })));
    }
  }
  const resultats = [];
  for (const { dep, code, l } of await parLots(taches, PARALLELE)) {
    for (const ligne of l) {
      const position = { lat: ligne[F.lat], lon: ligne[F.lon] };
      const distance = distanceKm(centre, position);
      if (distance > rayonKm) continue;
      const siret = ligne[F.siret];
      const lab = ligne[F.labels] || '';
      const labels = [
        ...(lab.includes('r') ? ['rge'] : []),
        ...(lab.includes('e') ? ['epv'] : []),
        ...(maitres[siret] ? ['ma'] : []),
      ];
      if (labellisesSeulement && !labels.length) continue;
      resultats.push({
        siret,
        nom: ligne[F.nom],
        enseigne: ligne[F.enseigne],
        adresse: ligne[F.adresse],
        cp: ligne[F.cp],
        commune: ligne[F.commune],
        dep,
        activite: code,
        ...position,
        precis: ligne[F.precis],
        labels,
        distance,
      });
    }
  }
  return resultats.sort(
    (a, b) => Number(!a.labels.length) - Number(!b.labels.length) || a.distance - b.distance,
  );
}

/**
 * Artisans recommandés à afficher dans le bloc « Sponsorisé ».
 * @param {object} p
 * @param {object[]} p.recommandes window.RECOMMANDES
 * @param {string[]} p.codes activités recherchées
 * @param {{dep: string, cle: string}|null} p.commune commune de la maison
 * @param {string} p.jour date du jour AAAA-MM-JJ
 * @param {() => number} [p.hasard]
 */
export function sponsorises({ recommandes, codes, commune, jour, hasard = Math.random }) {
  if (!commune || !Array.isArray(recommandes)) return [];
  const voulus = new Set(codes);
  const candidats = recommandes.filter((r) => {
    if (!/^\d{14}$/.test(r?.siret ?? '')) return false;
    if ((r.debut && jour < r.debut) || (r.fin && jour > r.fin)) return false;
    const cibles = r.activites ?? [];
    // L'activité réelle de l'établissement doit être ciblée par l'option et recherchée
    if (!cibles.includes(r.activite) || !voulus.has(r.activite)) return false;
    return (r.departements ?? []).includes(commune.dep) || (r.communes ?? []).includes(commune.cle);
  });
  // Tirage uniforme (Fisher-Yates) : rotation équitable entre les recommandés
  for (let i = candidats.length - 1; i > 0; i -= 1) {
    const k = Math.floor(hasard() * (i + 1));
    [candidats[i], candidats[k]] = [candidats[k], candidats[i]];
  }
  return candidats.slice(0, MAX_SPONSORISES);
}

/** Date du jour à Paris (AAAA-MM-JJ), comme les dates des options. */
export function jourParis(date = new Date()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(date);
}

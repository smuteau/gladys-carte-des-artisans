// -----------------------------------------------------------------------------
// Action de scène « Chercher un artisan » (manifest `scene_actions`).
//
// Renvoie le premier résultat (labellisés d'abord, puis le plus proche) et le
// nombre d'artisans trouvés, utilisables par les actions suivantes de la scène
// (par exemple un message : {{...nom}}, {{...lien}}). Pas de bloc
// « Sponsorisé » ici : une annonce ne doit jamais prendre la place du premier
// résultat.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { formaterDistance } from './geo.js';
import { titre } from './recherche.js';
import { lienFiche, rayonValide } from './service.js';

const logger = createLogger({ name: 'scenes' });

export const ACTION_CHERCHER = 'chercher_artisan';

const VIDE = {
  trouve: false,
  nombre: 0,
  nom: '',
  telephone: '',
  adresse: '',
  distance: '',
  lien: '',
};

/** Sorties de l'action à partir du résultat de service.rechercher(). */
export function sortiesRecherche(r) {
  if (r.etat === 'rubrique-inconnue') throw new Error(`Métier inconnu : ${r.rubrique}`);
  if (r.etat === 'sans-maison') {
    throw new Error('Position de la maison inconnue : renseignez-la dans Paramètres › Maisons');
  }
  const premier = r.resultats[0];
  if (!premier) return VIDE;
  return {
    trouve: true,
    nombre: r.resultats.length,
    nom: premier.nom,
    telephone: r.enrichies[premier.siret]?.telephone ?? '',
    adresse: `${titre(premier.adresse)}, ${premier.cp} ${titre(premier.commune)}`,
    distance: formaterDistance(premier.distance),
    lien: lienFiche(premier.siret),
  };
}

export function creerActionsScene(service) {
  return {
    async [ACTION_CHERCHER](_gladys, { fields }) {
      logger.info(`Action de scène ${ACTION_CHERCHER} <- ${fields.metier}, ${fields.rayon} km`);
      const r = await service.rechercher({
        rubrique: fields.metier,
        rayon: rayonValide(fields.rayon),
        labellises: fields.labellises === true,
        avecSponsorises: false,
      });
      return sortiesRecherche(r);
    },
  };
}

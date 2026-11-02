// -----------------------------------------------------------------------------
// Lecture des données publiques de la Carte des artisans (cartedesartisans.fr).
//
// Deux familles de fichiers :
//   - l'export mensuel (donnees/export/) : index.json, communes.json et un
//     fichier par département × activité. Il ne change qu'une fois par mois :
//     gardé en mémoire et sur le disque (/data, seul dossier inscriptible du
//     conteneur), et relu seulement quand index.json annonce de nouvelles
//     données ;
//   - les petits fichiers de l'espace d'administration (recommandes.js,
//     maitres-artisans.js, enrichies.js), qui changent plus souvent : relus
//     toutes les 6 heures.
// Rien d'autre n'est envoyé au site que ces lectures (aucune position, aucun
// identifiant) ; en cas d'erreur réseau, la dernière copie connue est gardée.
// -----------------------------------------------------------------------------

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'donnees' });

export const SITE = 'https://cartedesartisans.fr';
export const VERSION_EXPORT = 1;
const AGENT = 'CarteDesArtisans-Gladys (+https://cartedesartisans.fr)';
const DELAI_INDEX = 12 * 3600 * 1000;
const DELAI_ADMIN = 6 * 3600 * 1000;
const MAX_FICHIERS_MEMOIRE = 300;

// Fichiers de l'admin : nom du fichier → variable globale lue
const FICHIERS_ADMIN = {
  recommandes: ['recommandes.js', 'RECOMMANDES', []],
  maitres: ['maitres-artisans.js', 'MAITRES_ARTISANS', {}],
  enrichies: ['enrichies.js', 'ENRICHIES', {}],
};

/** Valeur JSON affectée à window.<nom> dans un fichier .js du site (une affectation par ligne). */
export function lireVariable(texte, nom) {
  const ligne = texte.split('\n').find((l) => l.startsWith(`window.${nom} =`));
  if (!ligne) throw new Error(`window.${nom} introuvable`);
  return JSON.parse(ligne.slice(ligne.indexOf('=') + 1).replace(/;\s*$/, ''));
}

export class SourceDonnees {
  /**
   * @param {object} [options]
   * @param {string} [options.site] adresse du site (tests)
   * @param {string|null} [options.cache] dossier du cache disque, null = mémoire seule
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.maintenant]
   */
  constructor({
    site = SITE,
    cache = process.env.DATA_DIR || '/data',
    fetch = globalThis.fetch,
    maintenant = Date.now,
  } = {}) {
    this.site = site.replace(/\/$/, '');
    this.cache = cache ? path.join(cache, 'cache') : null;
    this.fetch = fetch;
    this.maintenant = maintenant;
    this.indexCourant = null;
    this.indexLu = 0;
    this.fichiers = new Map();
    this.admin = {};
  }

  async telecharger(chemin, format = 'json') {
    const reponse = await this.fetch(`${this.site}/${chemin}`, {
      headers: { 'User-Agent': AGENT, Accept: format === 'json' ? 'application/json' : '*/*' },
    });
    if (reponse.status === 404) return null;
    if (!reponse.ok) throw new Error(`${chemin} : HTTP ${reponse.status}`);
    return format === 'json' ? reponse.json() : reponse.text();
  }

  // Cache disque : best effort (un disque plein ou en lecture seule ne bloque rien)
  async lireDisque(nom) {
    if (!this.cache) return null;
    try {
      return JSON.parse(await readFile(path.join(this.cache, nom), 'utf8'));
    } catch {
      return null;
    }
  }

  async ecrireDisque(nom, donnees) {
    if (!this.cache) return;
    try {
      const fichier = path.join(this.cache, nom);
      await mkdir(path.dirname(fichier), { recursive: true });
      await writeFile(fichier, JSON.stringify(donnees));
    } catch (err) {
      logger.debug(`cache disque indisponible (${err.message})`);
    }
  }

  dossierDonnees(index) {
    return String(index.genere).replace(/[^0-9A-Za-z-]/g, '_');
  }

  /** index.json de l'export (relu au plus toutes les 12 heures). */
  async index() {
    if (this.indexCourant && this.maintenant() - this.indexLu < DELAI_INDEX) {
      return this.indexCourant;
    }
    let index = null;
    try {
      index = await this.telecharger('donnees/export/index.json');
    } catch (err) {
      logger.warn(`index.json illisible, dernière copie gardée (${err.message})`);
    }
    if (index && index.version !== VERSION_EXPORT) {
      logger.error(
        `format d'export ${index.version} non pris en charge : mettez à jour l'intégration`,
      );
      index = null;
    }
    if (index) {
      if (this.indexCourant?.genere !== index.genere) {
        this.fichiers.clear();
        await this.ecrireDisque('index.json', index);
        await this.purgerDisque(this.dossierDonnees(index));
      }
    } else {
      index = this.indexCourant ?? (await this.lireDisque('index.json'));
      if (!index) throw new Error('Données de la Carte des artisans indisponibles');
    }
    this.indexCourant = index;
    this.indexLu = this.maintenant();
    return index;
  }

  // Les fichiers d'un mois précédent ne servent plus
  async purgerDisque(garder) {
    if (!this.cache) return;
    try {
      for (const nom of await readdir(this.cache)) {
        if (nom !== garder && nom !== 'index.json') {
          await rm(path.join(this.cache, nom), { recursive: true, force: true });
        }
      }
    } catch {
      // dossier absent : rien à purger
    }
  }

  /** Fichier de l'export du mois courant (mémoire, puis disque, puis réseau). */
  async fichierExport(index, relatif, defaut) {
    const nom = `${this.dossierDonnees(index)}/${relatif}`;
    if (this.fichiers.has(nom)) {
      // Réinsertion : la Map garde l'ordre d'usage, la plus ancienne entrée part en premier
      const valeur = this.fichiers.get(nom);
      this.fichiers.delete(nom);
      this.fichiers.set(nom, valeur);
      return valeur;
    }
    let valeur = await this.lireDisque(nom);
    if (!valeur) {
      valeur = (await this.telecharger(`donnees/export/${relatif}`)) ?? defaut;
      await this.ecrireDisque(nom, valeur);
    }
    this.fichiers.set(nom, valeur);
    while (this.fichiers.size > MAX_FICHIERS_MEMOIRE) {
      this.fichiers.delete(this.fichiers.keys().next().value);
    }
    return valeur;
  }

  /** Établissements d'une activité dans un département (lignes de index.champs). */
  lignes(index, dep, code) {
    return this.fichierExport(index, `${dep}/${code}.json`, []);
  }

  /** [[NOM, dep, lat, lon], ...] : position moyenne des établissements de chaque commune. */
  communes(index) {
    return this.fichierExport(index, 'communes.json', []);
  }

  /** recommandes / maitres / enrichies, relus au plus toutes les 6 heures. */
  async fichierAdmin(cle) {
    const [fichier, variable, defaut] = FICHIERS_ADMIN[cle];
    const actuel = this.admin[cle];
    if (actuel && this.maintenant() - actuel.lu < DELAI_ADMIN) return actuel.valeur;
    let valeur = actuel?.valeur ?? defaut;
    try {
      const texte = await this.telecharger(`donnees/${fichier}`, 'texte');
      valeur = texte === null ? defaut : lireVariable(texte, variable);
    } catch (err) {
      logger.warn(`${fichier} illisible, dernière copie gardée (${err.message})`);
    }
    this.admin[cle] = { valeur, lu: this.maintenant() };
    return valeur;
  }
}

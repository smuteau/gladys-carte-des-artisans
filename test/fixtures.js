// Données de test : un petit export au format du site (index.json, communes,
// fichiers par département × activité) et un faux site servi sans réseau.

export const MAISON = {
  id: 'h1',
  name: 'Maison',
  selector: 'maison',
  latitude: 43.6,
  longitude: 1.44,
};

export const INDEX = {
  version: 1,
  genere: '2026-10-13T06:00:00',
  source: 'Sirene (test)',
  champs: [
    'siret',
    'nom',
    'enseigne',
    'adresse',
    'cp',
    'commune',
    'lat',
    'lon',
    'precis',
    'labels',
  ],
  rubriques: {
    'maison-depannage.plombier': {
      titre: 'Plombier',
      categorie: 'Dépannage maison',
      codes: ['4322AZ'],
    },
    'maison-renovation.peintre': {
      titre: 'Peintre',
      categorie: 'Rénovation',
      codes: ['4334Z'],
    },
  },
  activites: { '4322AZ': 'Plomberie', '4334Z': 'Peinture' },
  departements: {
    31: { emprise: [42.7, 0.4, 44.0, 2.1], activites: { '4322AZ': 4 } },
    75: { emprise: [48.8, 2.2, 48.9, 2.5], activites: { '4322AZ': 1 } },
  },
};

export const LIGNES = {
  '31/4322AZ': [
    [
      '11111111100011',
      'PLOMBERIE PROCHE',
      '',
      '1 RUE A',
      '31000',
      'TOULOUSE',
      43.601,
      1.441,
      1,
      '',
    ],
    [
      '22222222200022',
      'RGE LOINTAIN',
      'EAU CHAUDE',
      '2 RUE B',
      '31200',
      'TOULOUSE',
      43.65,
      1.45,
      1,
      'r',
    ],
    ['33333333300033', 'TROP LOIN', '', '3 RUE C', '31800', 'SAINT-GAUDENS', 43.1, 0.72, 1, ''],
    ['44444444400044', 'MAITRE DU COIN', '', '4 RUE D', '31000', 'TOULOUSE', 43.61, 1.44, 0, ''],
  ],
  '75/4322AZ': [['55555555500055', 'PARIS', '', '5 RUE E', '75001', 'PARIS', 48.86, 2.34, 1, '']],
};

export const COMMUNES = [
  ['TOULOUSE', '31', 43.6, 1.44],
  ['SAINT-GAUDENS', '31', 43.1, 0.72],
  ['PARIS', '75', 48.86, 2.34],
];

export const RECOMMANDES = [
  {
    siret: '66666666600066',
    nom: 'SPONSO 31',
    activite: '4322AZ',
    commune: 'BLAGNAC',
    dep: '31',
    telephone: '05 00 00 00 00',
    site: 'https://exemple.test',
    debut: '2026-01-01',
    fin: '2099-12-31',
    activites: ['4322AZ'],
    departements: ['31'],
    communes: [],
  },
  {
    siret: '77777777700077',
    nom: 'SPONSO EXPIRE',
    activite: '4322AZ',
    commune: 'TOULOUSE',
    dep: '31',
    debut: '2020-01-01',
    fin: '2020-12-31',
    activites: ['4322AZ'],
    departements: ['31'],
    communes: [],
  },
];

const js = (nom, valeur) => `// en-tête\nwindow.${nom} = ${JSON.stringify(valeur)};\n`;

/** Faux fetch du site ; `appels` garde les chemins demandés. */
export function fauxSite({ index = INDEX, panne = false } = {}) {
  const appels = [];
  const fichiers = {
    'donnees/export/index.json': index,
    'donnees/export/communes.json': COMMUNES,
    ...Object.fromEntries(Object.entries(LIGNES).map(([k, v]) => [`donnees/export/${k}.json`, v])),
    'donnees/recommandes.js': js('RECOMMANDES', RECOMMANDES),
    'donnees/maitres-artisans.js': js('MAITRES_ARTISANS', { 44444444400044: {} }),
    'donnees/enrichies.js': js('ENRICHIES', { 11111111100011: { telephone: '05 11 11 11 11' } }),
  };
  const fetch = async (url) => {
    const chemin = url.replace(/^https:\/\/[^/]+\//, '');
    appels.push(chemin);
    if (panne) throw new Error('réseau coupé');
    const contenu = fichiers[chemin];
    return {
      ok: contenu !== undefined,
      status: contenu === undefined ? 404 : 200,
      json: async () => contenu,
      text: async () => (typeof contenu === 'string' ? contenu : JSON.stringify(contenu)),
    };
  };
  return { fetch, appels };
}

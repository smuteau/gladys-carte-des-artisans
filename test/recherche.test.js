import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chercher,
  cleCommune,
  communeProche,
  jourParis,
  sponsorises,
  titre,
} from '../src/recherche.js';
import { distanceEmprise, distanceKm, formaterDistance } from '../src/geo.js';
import { COMMUNES, INDEX, LIGNES, MAISON, RECOMMANDES } from './fixtures.js';

const centre = { lat: MAISON.latitude, lon: MAISON.longitude };
const lus = [];
const lire = async (dep, code) => {
  lus.push(`${dep}/${code}`);
  return LIGNES[`${dep}/${code}`] ?? [];
};

test('distances', () => {
  assert.ok(
    Math.abs(distanceKm({ lat: 48.8566, lon: 2.3522 }, { lat: 43.6047, lon: 1.4442 }) - 588) < 5,
  );
  assert.equal(distanceEmprise({ lat: 43, lon: 1 }, [42, 0, 44, 2]), 0);
  assert.equal(formaterDistance(0.43), '450 m');
  assert.equal(formaterDistance(2.44), '2,4 km');
  assert.equal(formaterDistance(12.6), '13 km');
});

test('rayon, départements lus, labellisés d’abord puis distance', async () => {
  lus.length = 0;
  const r = await chercher({
    index: INDEX,
    lire,
    centre,
    rayonKm: 10,
    codes: ['4322AZ'],
    maitres: { 44444444400044: {} },
  });
  assert.deepEqual(lus, ['31/4322AZ'], 'Paris est hors de portée : son fichier n’est pas lu');
  assert.deepEqual(
    r.map((e) => e.nom),
    ['MAITRE DU COIN', 'RGE LOINTAIN', 'PLOMBERIE PROCHE'],
    'Saint-Gaudens est hors du rayon ; labellisés d’abord (le plus proche en tête), puis les autres',
  );
  assert.deepEqual(r[0].labels, ['ma']);
  assert.deepEqual(r[1].labels, ['rge']);
});

test('seulement les labellisés', async () => {
  const r = await chercher({
    index: INDEX,
    lire,
    centre,
    rayonKm: 10,
    codes: ['4322AZ'],
    labellisesSeulement: true,
  });
  assert.deepEqual(
    r.map((e) => e.nom),
    ['RGE LOINTAIN'],
  );
});

test('commune la plus proche et clé du site', () => {
  assert.deepEqual(communeProche(COMMUNES, centre), {
    nom: 'TOULOUSE',
    dep: '31',
    cle: 'toulouse|31',
  });
  assert.equal(cleCommune("L'ISLE-JOURDAIN", '32'), 'l isle jourdain|32');
  assert.equal(communeProche(COMMUNES, { lat: 0, lon: 0 }), null);
  assert.equal(titre('SAINT-ETIENNE-DU-ROUVRAY'), 'Saint-Etienne-du-Rouvray');
});

test('bloc sponsorisé : période, activité réelle, zone, au plus 3', () => {
  const commune = { nom: 'TOULOUSE', dep: '31', cle: 'toulouse|31' };
  const jour = '2026-11-02';
  assert.deepEqual(
    sponsorises({ recommandes: RECOMMANDES, codes: ['4322AZ'], commune, jour }).map((r) => r.siret),
    ['66666666600066'],
    'l’option expirée est écartée',
  );
  assert.deepEqual(sponsorises({ recommandes: RECOMMANDES, codes: ['4334Z'], commune, jour }), []);
  assert.deepEqual(
    sponsorises({
      recommandes: RECOMMANDES,
      codes: ['4322AZ'],
      commune: { nom: 'PARIS', dep: '75', cle: 'paris|75' },
      jour,
    }),
    [],
  );
  const parCommune = [{ ...RECOMMANDES[0], departements: [], communes: ['toulouse|31'] }];
  assert.equal(
    sponsorises({ recommandes: parCommune, codes: ['4322AZ'], commune, jour }).length,
    1,
  );
  const activiteNonCiblee = [{ ...RECOMMANDES[0], activites: ['4334Z'] }];
  assert.deepEqual(
    sponsorises({ recommandes: activiteNonCiblee, codes: ['4322AZ', '4334Z'], commune, jour }),
    [],
  );
  const nombreux = Array.from({ length: 5 }, (_, i) => ({
    ...RECOMMANDES[0],
    siret: `6666666660000${i}`,
  }));
  assert.equal(sponsorises({ recommandes: nombreux, codes: ['4322AZ'], commune, jour }).length, 3);
  assert.deepEqual(
    sponsorises({ recommandes: RECOMMANDES, codes: ['4322AZ'], commune: null, jour }),
    [],
  );
});

test('date du jour à Paris', () => {
  assert.equal(jourParis(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
});

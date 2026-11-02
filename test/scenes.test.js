import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { SourceDonnees } from '../src/donnees.js';
import { creerService } from '../src/service.js';
import { ACTION_CHERCHER, creerActionsScene } from '../src/scenes.js';
import { fauxSite, MAISON } from './fixtures.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const declaration = manifest.scene_actions.find((a) => a.key === ACTION_CHERCHER);

function action(houses = [MAISON]) {
  const gladys = createFakeGladys({ houses });
  const service = creerService(gladys, new SourceDonnees({ cache: null, fetch: fauxSite().fetch }));
  return (fields) => creerActionsScene(service)[ACTION_CHERCHER](gladys, { fields });
}

test('premier résultat (labellisés d’abord), jamais un sponsorisé', async () => {
  const sorties = await action()({
    metier: 'maison-depannage.plombier',
    rayon: '10',
    labellises: false,
  });
  assert.deepEqual(Object.keys(sorties).sort(), declaration.outputs.map((o) => o.key).sort());
  assert.equal(sorties.trouve, true);
  assert.equal(sorties.nombre, 3);
  assert.equal(sorties.nom, 'MAITRE DU COIN');
  assert.equal(
    sorties.lien,
    'https://cartedesartisans.fr/fiche.html?siret=44444444400044&mtm_campaign=gladys',
  );
  for (const o of declaration.outputs) {
    const type = o.type === 'number' ? 'number' : o.type === 'boolean' ? 'boolean' : 'string';
    assert.equal(typeof sorties[o.key], type, `sortie ${o.key}`);
  }
});

test('aucun résultat : trouve = false ; maison sans position ou métier inconnu : échec', async () => {
  const vide = await action()({ metier: 'maison-renovation.peintre', rayon: '5' });
  assert.equal(vide.trouve, false);
  assert.equal(vide.nombre, 0);
  await assert.rejects(
    action([])({ metier: 'maison-depannage.plombier' }),
    /Position de la maison/,
  );
  await assert.rejects(action()({ metier: 'inconnu' }), /Métier inconnu/);
});

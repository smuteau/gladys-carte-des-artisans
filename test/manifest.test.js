// -----------------------------------------------------------------------------
// Cohérence entre gladys-assistant-integration.json et le code. Le manifest est
// validé par l'indexeur du store, qui ne peut pas savoir quels gestionnaires
// le code enregistre : ces tests gardent les deux côtés d'accord.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { creerActionsScene } from '../src/scenes.js';
import { creerWidgets } from '../src/widgets.js';
import { DEFAULT_CONFIG } from '../src/config.js';
import { RAYON_DEFAUT, RAYONS } from '../src/service.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const indexJs = await readFile(new URL('../index.js', import.meta.url), 'utf8');

const keysOf = (list) => (list ?? []).map((entry) => entry.key);
const champsMetier = [
  ...manifest.widgets.flatMap((w) => w.settings ?? []),
  ...manifest.scene_actions.flatMap((a) => a.fields ?? []),
];

function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

test('provider : au moins une capacité, Gladys >= 5.1.0, position de la maison déclarée', () => {
  assert.equal(manifest.type, 'provider');
  assert.ok(manifest.widgets.length && manifest.scene_actions.length);
  const [maj, min] = minGladysVersion();
  assert.ok(maj > 5 || (maj === 5 && min >= 1), 'widgets / scene_actions : Gladys 5.1.0 minimum');
  assert.equal(manifest.location, true, 'getHouses() exige "location": true');
  assert.ok(manifest.categories.length >= 1 && manifest.categories.length <= 3);
});

test('chaque action du manifest a un gestionnaire', () => {
  for (const action of manifest.actions ?? []) {
    assert.ok(
      indexJs.includes(`onAction('${action.key}'`),
      `action "${action.key}" sans gestionnaire`,
    );
  }
});

test('actions de scène et widgets : déclarés et gérés, dans les deux sens', () => {
  assert.deepEqual(
    keysOf(manifest.scene_actions).sort(),
    Object.keys(creerActionsScene(null)).sort(),
  );
  assert.deepEqual(keysOf(manifest.widgets).sort(), Object.keys(creerWidgets(null)).sort());
});

test('listes de métiers remplies, identiques, sans doublon', () => {
  const listes = champsMetier.filter((c) => c.key === 'metier').map((c) => c.options);
  assert.equal(listes.length, 2);
  assert.ok(listes[0].length > 50, 'lancer npm run metiers');
  assert.deepEqual(listes[0], listes[1]);
  const valeurs = listes[0].map((o) => o.value);
  assert.equal(new Set(valeurs).size, valeurs.length);
  for (const v of valeurs) assert.match(v, /^[a-z0-9-]+\.[a-z0-9-]+$/);
});

test('rayons proposés = rayons acceptés par le code', () => {
  for (const champ of champsMetier.filter((c) => c.key === 'rayon')) {
    assert.deepEqual(
      champ.options.map((o) => Number(o.value)),
      RAYONS,
    );
    assert.equal(Number(champ.default), RAYON_DEFAUT);
  }
});

test('bloc d’explication purement présentatif, liens https', () => {
  for (const section of manifest.config_schema.filter((f) => f.type === 'section')) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    assert.ok(!(section.key in DEFAULT_CONFIG));
    for (const link of section.links ?? []) assert.match(link.url, /^https:\/\//);
  }
});

test('textes multilingues avec anglais', () => {
  const textes = [];
  const parcourir = (v, cle) => {
    if (Array.isArray(v)) v.forEach((x) => parcourir(x));
    else if (v && typeof v === 'object') {
      if (['label', 'description', 'placeholder'].includes(cle)) textes.push(v);
      else Object.entries(v).forEach(([k, x]) => parcourir(x, k));
    } else if (['label', 'description', 'placeholder'].includes(cle)) {
      assert.fail(`texte "${v}" : objet { en, fr } attendu`);
    }
  };
  parcourir(manifest);
  for (const t of textes) assert.ok(t.en, JSON.stringify(t));
});

test('version du manifest = version du paquet, image étiquetée avec elle', () => {
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`));
});

test('description du catalogue : 10 à 100 caractères par langue', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang} : ${text.length}`);
  }
});

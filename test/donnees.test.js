import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { lireVariable, SourceDonnees } from '../src/donnees.js';
import { fauxSite, INDEX } from './fixtures.js';

test('lecture d’une variable d’un fichier .js du site', () => {
  assert.deepEqual(lireVariable('// x\nwindow.A = {"b":1};\nwindow.B = [2];\n', 'B'), [2]);
  assert.throws(() => lireVariable('rien', 'A'), /introuvable/);
});

test('index et fichiers gardés en mémoire, relus après 12 h', async () => {
  const site = fauxSite();
  let maintenant = 0;
  const source = new SourceDonnees({
    cache: null,
    fetch: site.fetch,
    maintenant: () => maintenant,
  });
  const index = await source.index();
  await source.index();
  await source.lignes(index, '31', '4322AZ');
  await source.lignes(index, '31', '4322AZ');
  assert.deepEqual(site.appels, ['donnees/export/index.json', 'donnees/export/31/4322AZ.json']);
  maintenant = 13 * 3600 * 1000;
  await source.index();
  await source.lignes(index, '31', '4322AZ');
  assert.equal(site.appels.length, 3, 'index relu ; mêmes données : fichiers gardés');
  assert.deepEqual(await source.lignes(index, '31', 'ABSENT'), [], 'fichier absent = aucune ligne');
});

test('nouvelles données : fichiers relus, ancien mois purgé du disque', async () => {
  const dossier = await mkdtemp(path.join(tmpdir(), 'carte-'));
  try {
    let site = fauxSite();
    let maintenant = 0;
    const options = { cache: dossier, maintenant: () => maintenant };
    let source = new SourceDonnees({ ...options, fetch: site.fetch });
    await source.lignes(await source.index(), '31', '4322AZ');

    // Redémarrage du conteneur, réseau coupé : le disque suffit
    site = fauxSite({ panne: true });
    source = new SourceDonnees({ ...options, fetch: site.fetch });
    const index = await source.index();
    assert.equal((await source.lignes(index, '31', '4322AZ')).length, 4);

    // Mois suivant
    site = fauxSite({ index: { ...INDEX, genere: '2026-11-13T06:00:00' } });
    source = new SourceDonnees({ ...options, fetch: site.fetch });
    await source.lignes(await source.index(), '31', '4322AZ');
    assert.ok(site.appels.includes('donnees/export/31/4322AZ.json'));
    assert.deepEqual((await readdir(path.join(dossier, 'cache'))).sort(), [
      '2026-11-13T06_00_00',
      'index.json',
    ]);
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
});

test('format d’export inconnu ou site injoignable sans copie : erreur claire', async () => {
  const autre = new SourceDonnees({
    cache: null,
    fetch: fauxSite({ index: { ...INDEX, version: 2 } }).fetch,
  });
  await assert.rejects(autre.index(), /indisponibles/);
  const panne = new SourceDonnees({ cache: null, fetch: fauxSite({ panne: true }).fetch });
  await assert.rejects(panne.index(), /indisponibles/);
});

test('fichiers de l’admin : relus toutes les 6 h, dernière copie gardée en cas de panne', async () => {
  let site = fauxSite();
  let maintenant = 0;
  const source = new SourceDonnees({
    cache: null,
    fetch: (u) => site.fetch(u),
    maintenant: () => maintenant,
  });
  assert.equal((await source.fichierAdmin('recommandes')).length, 2);
  assert.deepEqual(Object.keys(await source.fichierAdmin('maitres')), ['44444444400044']);
  site = fauxSite({ panne: true });
  maintenant = 7 * 3600 * 1000;
  assert.equal((await source.fichierAdmin('recommandes')).length, 2);
});

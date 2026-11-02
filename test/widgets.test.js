import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { SourceDonnees } from '../src/donnees.js';
import { creerService } from '../src/service.js';
import { contenuWidget, creerWidgets, WIDGET_ARTISANS } from '../src/widgets.js';
import { fauxSite, MAISON } from './fixtures.js';

function preparer(houses = [MAISON]) {
  const gladys = createFakeGladys({ houses });
  const source = new SourceDonnees({ cache: null, fetch: fauxSite().fetch });
  const service = creerService(gladys, source);
  return { gladys, service, widget: creerWidgets(service)[WIDGET_ARTISANS] };
}

const reglages = { metier: 'maison-depannage.plombier', rayon: '10', labellises: false };

test('le contenu est rendu tel quel, sponsorisé en tête et marqué', async () => {
  const { gladys, widget } = preparer();
  const contenu = await widget.get(gladys, { settings: reglages, language: 'fr', units: 'metric' });
  assert.deepEqual(validateWidgetContent(contenu), []);
  const liste = contenu.components.find((c) => c.type === 'card-list');
  assert.deepEqual(
    liste.items.map((i) => i.title),
    ['SPONSO 31', 'MAITRE DU COIN', 'RGE LOINTAIN', 'PLOMBERIE PROCHE'],
  );
  assert.equal(liste.items[0].badge.text.fr, 'Sponsorisé');
  assert.match(liste.items[0].description, /option payante/);
  assert.equal(liste.items[1].badge.text.fr, 'Maître artisan');
  assert.match(liste.items[1].description, /Position approximative/);
  assert.match(
    liste.items[3].description,
    /Tél\. 05 11 11 11 11/,
    'téléphone d’une fiche enrichie',
  );
  assert.equal(
    contenu.components.find((c) => c.type === 'value').value,
    3,
    'le sponsorisé n’est pas compté',
  );
  const carte = contenu.components.find((c) => c.type === 'button').link.url;
  assert.equal(
    carte,
    'https://cartedesartisans.fr/carte.html?mtm_campaign=gladys#rub=maison-depannage.plombier&ville=toulouse|31',
  );
  assert.ok(!carte.includes('43.6'), 'jamais la position de la maison dans un lien');
});

test('aucun résultat, maison sans position, métier disparu : messages valides', async () => {
  const { gladys, widget } = preparer();
  const vide = await widget.get(gladys, {
    settings: { ...reglages, metier: 'maison-renovation.peintre' },
  });
  assert.deepEqual(validateWidgetContent(vide), []);
  assert.ok(vide.components.some((c) => c.type === 'text' && /Aucun artisan/.test(c.text.fr)));

  const sansMaison = preparer([{ ...MAISON, latitude: null, longitude: null }]);
  const c2 = await sansMaison.widget.get(sansMaison.gladys, { settings: reglages });
  assert.deepEqual(validateWidgetContent(c2), []);
  assert.match(c2.components[0].text.fr, /position de votre maison/);

  const c3 = await widget.get(gladys, { settings: { ...reglages, metier: 'disparu.x' } });
  assert.deepEqual(validateWidgetContent(c3), []);
  assert.match(c3.components[0].text.fr, /n’existe plus/);
});

test('au plus 8 entrées, les sponsorisés comptent dans la limite', () => {
  const resultat = (i) => ({
    siret: `1000000000${String(i).padStart(4, '0')}`,
    nom: `ARTISAN ${i}`,
    enseigne: '',
    adresse: '1 RUE',
    cp: '31000',
    commune: 'TOULOUSE',
    dep: '31',
    activite: '4322AZ',
    lat: 43.6,
    lon: 1.44,
    precis: 1,
    labels: [],
    distance: i,
  });
  const sponso = (i) => ({
    siret: `9000000000000${i}`,
    nom: `S${i}`,
    commune: 'TOULOUSE',
    dep: '31',
    activite: '4322AZ',
  });
  const contenu = contenuWidget({
    etat: 'ok',
    rubrique: 'maison-depannage.plombier',
    titre: 'Plombier',
    rayonKm: 10,
    commune: null,
    resultats: Array.from({ length: 20 }, (_, i) => resultat(i)),
    enrichies: {},
    sponsorises: [sponso(1), sponso(2), sponso(3)],
    activites: {},
  });
  assert.deepEqual(validateWidgetContent(contenu), []);
  const liste = contenu.components.find((c) => c.type === 'card-list');
  assert.equal(liste.items.length, 8);
  assert.equal(liste.items.filter((i) => i.badge?.text?.fr === 'Sponsorisé').length, 3);
});

test('le widget passe par le faux Gladys du SDK', async () => {
  const { gladys, widget } = preparer();
  gladys.onWidgetGet(WIDGET_ARTISANS, (demande) => widget.get(gladys, demande));
  const ack = await gladys.fake.widgetGet(WIDGET_ARTISANS, { settings: reglages, language: 'fr' });
  assert.equal(ack.success, true, JSON.stringify(ack.error));
});

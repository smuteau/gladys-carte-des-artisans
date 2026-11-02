// -----------------------------------------------------------------------------
// Remplit les listes « Métier » du manifest (réglage du widget, champ de
// l'action de scène) avec les rubriques de la Carte des artisans.
//
// Les valeurs sont les identifiants « <catégorie>.<rubrique> » du site : ils
// sont stockés par Gladys dans les widgets et les scènes, donc ne doivent
// jamais changer. Une rubrique disparue reste dans la liste (le widget affiche
// alors un message) tant qu'on ne la retire pas à la main.
//
// Usage : node scripts/metiers.mjs [index.json | URL]
//   (par défaut https://cartedesartisans.fr/donnees/export/index.json)
// -----------------------------------------------------------------------------

import { readFile, writeFile } from 'node:fs/promises';

const source = process.argv[2] ?? 'https://cartedesartisans.fr/donnees/export/index.json';
const index = JSON.parse(
  /^https:/.test(source) ? await (await fetch(source)).text() : await readFile(source, 'utf8'),
);
const fichier = new URL('../gladys-assistant-integration.json', import.meta.url);
const manifest = JSON.parse(await readFile(fichier, 'utf8'));

const options = Object.entries(index.rubriques).map(([value, r]) => {
  const texte = `${r.titre} (${r.categorie})`;
  return { value, label: { en: texte, fr: texte } };
});

function remplir(champ) {
  const anciennes = new Map((champ.options ?? []).map((o) => [o.value, o]));
  const nouvelles = new Set(options.map((o) => o.value));
  const disparues = [...anciennes.keys()].filter((v) => !nouvelles.has(v));
  if (disparues.length) console.warn(`Rubriques disparues, gardées : ${disparues.join(', ')}`);
  champ.options = [...options, ...disparues.map((v) => anciennes.get(v))];
}

const champs = [
  ...manifest.widgets.flatMap((w) => w.settings ?? []),
  ...manifest.scene_actions.flatMap((a) => a.fields ?? []),
].filter((c) => c.key === 'metier');
champs.forEach(remplir);

await writeFile(fichier, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${options.length} métiers écrits dans ${champs.length} listes.`);

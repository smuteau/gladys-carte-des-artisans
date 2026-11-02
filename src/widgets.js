// -----------------------------------------------------------------------------
// Widget « Artisans près de chez moi » (manifest `widgets`, Gladys 5.1+).
//
// Réglages de chaque widget : le métier (rubrique de la Carte des artisans),
// le rayon et « labellisés seulement ». Contenu : nombre d'artisans dans le
// rayon, une liste (bloc « Sponsorisé » en tête, chaque entrée marquée, puis
// les résultats : labellisés d'abord, puis les plus proches), une phrase sur
// le classement et un lien vers la carte du site.
// -----------------------------------------------------------------------------

import { createLogger, WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { formaterDistance } from './geo.js';
import { titre } from './recherche.js';
import { lienCarte, lienFiche, lienItineraire, rayonValide, RAYON_DEFAUT } from './service.js';

const logger = createLogger({ name: 'widgets' });

export const WIDGET_ARTISANS = 'artisans_proches';
const MAX_LIGNES = 8; // plafond d'une card-list en liste
const TTL = 3600; // données mensuelles ; le bloc « Sponsorisé » tourne à chaque rechargement

const BADGES = {
  sponso: { text: { fr: 'Sponsorisé', en: 'Sponsored' }, color: WIDGET_COLORS.WARNING },
  rge: { text: 'RGE', color: WIDGET_COLORS.SUCCESS },
  epv: { text: 'EPV', color: WIDGET_COLORS.INFO },
  ma: { text: { fr: 'Maître artisan', en: 'Master craftsman' }, color: WIDGET_COLORS.PRIMARY },
};
const NOMS_LABELS = {
  rge: { fr: 'Reconnu garant de l’environnement (RGE)', en: 'RGE certified (ADEME)' },
  epv: { fr: 'Entreprise du patrimoine vivant', en: 'Living Heritage Company (EPV)' },
  ma: { fr: 'Maître artisan', en: 'Master craftsman' },
};

const couper = (texte, max) => (texte.length > max ? `${texte.slice(0, max - 1)}…` : texte);
const deux = (fr, en = fr) => ({ fr, en });
const https = (url) => (/^https:\/\/[^\s]+$/i.test(url ?? '') ? url : null);

function texteSimple(composant, texte, variante = 'caption') {
  return { type: 'text', variant: variante, text: texte, ...composant };
}

function entreeResultat(e, enrichies, activites) {
  const fiche = enrichies[e.siret];
  const enseigne = e.enseigne && e.enseigne.toLowerCase() !== e.nom.toLowerCase() ? e.enseigne : '';
  const lieu = `${formaterDistance(e.distance)} · ${titre(e.commune)}`;
  const lignes = [
    activites[e.activite] ?? '',
    `${titre(e.adresse)}, ${e.cp} ${titre(e.commune)}`,
    fiche?.telephone ? `Tél. ${fiche.telephone}` : '',
    ...e.labels.map((l) => NOMS_LABELS[l].fr),
    e.precis === 0 ? 'Position approximative (centre de la commune)' : '',
  ].filter(Boolean);
  const site = https(fiche?.site);
  return {
    title: couper(e.nom, 60),
    subtitle: enseigne ? `${couper(enseigne, 40)} · ${lieu}` : lieu,
    ...(e.labels.length ? { badge: BADGES[e.labels[0]] } : {}),
    description: lignes.join('\n'),
    links: [
      { url: lienFiche(e.siret), label: deux('Voir la fiche', 'Details') },
      { url: lienItineraire(e), label: deux('Itinéraire', 'Directions') },
      ...(site ? [{ url: site, label: deux('Site web', 'Website') }] : []),
    ],
  };
}

function entreeSponsorisee(r, activites) {
  const site = https(r.site);
  return {
    title: couper(r.nom, 60),
    subtitle: `${titre(r.commune)} (${r.dep})`,
    badge: BADGES.sponso,
    description: [
      activites[r.activite] ?? '',
      r.telephone ? `Tél. ${r.telephone}` : '',
      'Artisan recommandé (option payante) : affiché à part, sans effet sur l’ordre des résultats.',
    ]
      .filter(Boolean)
      .join('\n'),
    links: [
      { url: lienFiche(r.siret), label: deux('Voir la fiche', 'Details') },
      ...(site ? [{ url: site, label: deux('Site web', 'Website') }] : []),
    ],
  };
}

/** Contenu du widget à partir du résultat de service.rechercher(). */
export function contenuWidget(r) {
  if (r.etat === 'rubrique-inconnue') {
    return {
      ttl_seconds: TTL,
      components: [
        texteSimple(
          {},
          deux(
            'Ce métier n’existe plus sur la Carte des artisans : choisissez-en un autre dans les réglages du widget.',
            'This trade no longer exists on the map: pick another one in the widget settings.',
          ),
          'body',
        ),
      ],
    };
  }
  if (r.etat === 'sans-maison') {
    return {
      ttl_seconds: 300,
      components: [
        texteSimple(
          {},
          deux(
            'Indiquez la position de votre maison dans Gladys (Paramètres › Maisons) pour voir les artisans proches.',
            'Set your house location in Gladys (Settings › Houses) to see nearby craftsmen.',
          ),
          'body',
        ),
      ],
    };
  }
  const sponso = r.sponsorises.map((s) => entreeSponsorisee(s, r.activites));
  const normaux = r.resultats
    .slice(0, MAX_LIGNES - sponso.length)
    .map((e) => entreeResultat(e, r.enrichies, r.activites));
  const components = [
    {
      type: 'value',
      value: r.resultats.length,
      label: couper(`${r.titre}`, 24),
      icon: 'map-pin',
      color: WIDGET_COLORS.PRIMARY,
    },
    texteSimple(
      {},
      deux(
        `À ${r.rayonKm} km · labellisés d’abord, puis les plus proches`,
        `Within ${r.rayonKm} km · certified first, then nearest`,
      ),
    ),
  ];
  if (sponso.length || normaux.length) {
    components.push({ type: 'card-list', display: 'list', items: [...sponso, ...normaux] });
  } else {
    components.push(
      texteSimple(
        {},
        deux(
          `Aucun artisan trouvé dans un rayon de ${r.rayonKm} km : élargissez le rayon dans les réglages.`,
          `No craftsman found within ${r.rayonKm} km: widen the radius in the settings.`,
        ),
        'body',
      ),
    );
  }
  components.push({
    type: 'button',
    label: deux('Voir sur la carte', 'Open the map'),
    icon: 'map',
    style: 'secondary',
    link: { url: lienCarte(r.rubrique, r.commune) },
  });
  return { ttl_seconds: TTL, components };
}

export function creerWidgets(service) {
  return {
    [WIDGET_ARTISANS]: {
      async get(_gladys, { settings = {} }) {
        logger.debug(
          `onWidgetGet <- ${WIDGET_ARTISANS} (${settings.metier}, ${settings.rayon} km)`,
        );
        const r = await service.rechercher({
          rubrique: settings.metier,
          rayon: rayonValide(settings.rayon ?? RAYON_DEFAUT),
          labellises: settings.labellises === true,
        });
        return contenuWidget(r);
      },
    },
  };
}

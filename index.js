// -----------------------------------------------------------------------------
// Point d'entrée de l'intégration « Carte des artisans » pour Gladys Assistant.
//
// Rôle de ce fichier : brancher le SDK sur le service de recherche. Aucune
// logique métier ici :
//   1. instancie le SDK (connexion, authentification, reconnexion : gérées par
//      le SDK, qui lit GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN et
//      GLADYS_INTEGRATION_SELECTOR fournis par le superviseur Gladys) ;
//   2. enregistre les gestionnaires AVANT connect() ;
//   3. se connecte.
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { SourceDonnees } from './src/donnees.js';
import { creerService } from './src/service.js';
import { creerActionsScene } from './src/scenes.js';
import { creerWidgets, WIDGET_ARTISANS } from './src/widgets.js';

const gladys = new GladysIntegration();
const source = new SourceDonnees();
const service = creerService(gladys, source);
const ACTIONS_SCENE = creerActionsScene(service);
const WIDGETS = creerWidgets(service);

// --- Actions de scène --------------------------------------------------------
for (const [cle, gestionnaire] of Object.entries(ACTIONS_SCENE)) {
  gladys.onSceneAction(cle, (fields) => gestionnaire(gladys, { fields }));
}

// --- Widgets du tableau de bord ----------------------------------------------
for (const [cle, widget] of Object.entries(WIDGETS)) {
  gladys.onWidgetGet(cle, (demande) => widget.get(gladys, demande));
}

// --- Bouton « Tester » de l'écran de configuration ---------------------------
gladys.onAction('tester', async () => {
  const index = await source.index();
  const maison = await service.maison();
  const date = String(index.genere).slice(0, 10);
  if (!maison) {
    return {
      fr: `Données du ${date} lues. Position de la maison inconnue : renseignez-la dans Paramètres › Maisons.`,
      en: `Data of ${date} loaded. House location unknown: set it in Settings › Houses.`,
    };
  }
  return {
    fr: `Données du ${date} lues ; recherche autour de « ${maison.nom} ».`,
    en: `Data of ${date} loaded; searching around "${maison.nom}".`,
  };
});

// --- Cycle de vie ------------------------------------------------------------
gladys.on('connected', async () => {
  try {
    await source.index();
    await gladys.setConnectionStatus(true);
  } catch (err) {
    logger.error('Données de la Carte des artisans indisponibles', err);
    await gladys
      .setConnectionStatus(false, {
        fr: 'Le site cartedesartisans.fr ne répond pas : nouvel essai à la prochaine demande.',
        en: 'cartedesartisans.fr does not answer: retrying on the next request.',
      })
      .catch(() => {});
  }
  // Les demandes de rafraîchissement envoyées hors connexion sont perdues
  gladys.requestWidgetRefresh(WIDGET_ARTISANS);
});

gladys.handleShutdown((signal) => {
  logger.info(`${signal} reçu : arrêt`);
});

logger.info('Démarrage de l’intégration Carte des artisans…');
gladys.connect().catch((err) => {
  logger.error('Première connexion impossible', err);
  process.exit(1);
});

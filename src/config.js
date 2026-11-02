// -----------------------------------------------------------------------------
// Configuration de l'intégration : rien à régler (la position vient de la
// maison Gladys, le métier et le rayon des réglages de chaque widget ou de
// chaque action de scène). Le `config_schema` du manifest ne contient qu'un
// bloc d'explication.
// -----------------------------------------------------------------------------

export const DEFAULT_CONFIG = {};

/** Fusionne la configuration reçue avec les valeurs par défaut. */
export function normalizeConfig(raw = {}) {
  return { ...DEFAULT_CONFIG, ...raw };
}

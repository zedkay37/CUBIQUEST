/**
 * Emplacement de sauvegarde : la version en test (`…/CUBIQUEST/next/`) partage le même domaine que la
 * version validée, donc le même localStorage. Construite avec VITE_SAVE_SLOT=next, elle range tout sous
 * des clés suffixées et ne touche jamais à la sauvegarde du joueur.
 *
 * Sous Node (tests, outils), `import.meta.env` n'existe pas : les clés restent les clés d'origine.
 */
export function withSaveSlot(key: string): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  const slot = env?.VITE_SAVE_SLOT?.replace(/[^a-z0-9_-]/gi, '');
  return slot ? `${key}_${slot}` : key;
}

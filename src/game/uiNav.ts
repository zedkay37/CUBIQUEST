/**
 * Navigation des fenêtres du camp (A1.2), en règles pures testées :
 * - un bouton du dock ouvre son écran ; si un autre est ouvert, il est fermé d'abord (un seul à la fois) ;
 *   cliquer sur le bouton de l'écran ouvert le referme ;
 * - Échap ferme la fenêtre du dessus, quelle qu'elle soit.
 */
export type DockTab = 'expeditions' | 'cooking' | 'team' | 'quests' | 'codex';

export function nextDrawer(current: DockTab | null, clicked: DockTab): DockTab | null {
  return current === clicked ? null : clicked;
}

/** Fenêtres qui peuvent être ouvertes en même temps, de la plus haute à la plus basse. */
export interface OpenWindows {
  arrival: boolean;
  recruit: boolean;
  outcome: boolean;
  drawer: boolean;
}

export type WindowKind = keyof OpenWindows;

/** Ce que ferme la touche Échap (null : rien d'ouvert). */
export function escapeTarget(open: OpenWindows): WindowKind | null {
  const order: WindowKind[] = ['arrival', 'recruit', 'outcome', 'drawer'];
  return order.find((k) => open[k]) ?? null;
}

/**
 * Moments forts de l'interface (sprint UI, section 3) : composants réutilisables qu'on peut passer
 * d'un clic ou d'une touche. Chaque moment a sa démonstration dans `?gallery=ui`.
 */
import type React from 'react';

export interface MomentDemo {
  id: string;
  label: string;
  render: (onDone: () => void) => React.ReactNode;
}

export const MOMENT_DEMOS: MomentDemo[] = [];

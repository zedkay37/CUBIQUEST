import { useState } from 'react';
import { FR, GAME_TITLE } from '../i18n/fr';
import { clearJournal, loadJournal } from '../game/journal';
import { BlockButton } from './ui';

/** Journal de test (S07.4) : export en .json et effacement. Le fichier ne quitte l'appareil que si le joueur l'envoie. */
export function JournalPanel() {
  const [count, setCount] = useState(() => loadJournal().length);
  const [confirm, setConfirm] = useState(false);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(loadJournal(), null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${GAME_TITLE.toLowerCase()}-journal.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="voxel-panel p-4 flex flex-col gap-2">
      <h3 className="font-display font-bold text-sm text-[#FAF7F0]">{FR.ui.journal.titre}</h3>
      <p className="text-xs text-[#CBD5E1]">{FR.ui.journal.explication}</p>
      <p className="text-xs text-[#94A3B8]">{FR.ui.journal.lignes(count)}</p>
      <div className="flex flex-wrap gap-2">
        <BlockButton variant="primary" onClick={handleExport} disabled={count === 0}>
          {FR.ui.journal.exporter}
        </BlockButton>
        {!confirm ? (
          <BlockButton variant="secondary" onClick={() => setConfirm(true)} disabled={count === 0}>
            {FR.ui.journal.effacer}
          </BlockButton>
        ) : (
          <BlockButton
            variant="danger"
            onClick={() => {
              clearJournal();
              setCount(0);
              setConfirm(false);
            }}
          >
            {FR.ui.journal.confirmerEffacer}
          </BlockButton>
        )}
      </div>
    </div>
  );
}

import { useId, type ReactElement } from 'react';
import './spectator-view.css';

export interface SpectatorViewProps {
  readonly reason: string;
  readonly publicRound: number;
  readonly publicSummary: string;
  readonly onOpenMenu: () => void;
}

/** Permanent gameplay Disconnect only; the host supplies recipient-safe public text. */
export function SpectatorView({
  reason,
  publicRound,
  publicSummary,
  onOpenMenu,
}: SpectatorViewProps): ReactElement {
  const titleId = useId();
  const roundLabel = Number.isSafeInteger(publicRound) && publicRound > 0
    ? `Round ${publicRound}`
    : 'Round unavailable';

  return (
    <section className="spectator-view" aria-labelledby={titleId}>
      <header>
        <h2 id={titleId}>Permanently Disconnected</h2>
        <p>You are a silent spectator for the rest of this match.</p>
        <p>You can watch public updates and the final reveal. You cannot vote,
          join the Crew, use powers, chat, send reactions, or reveal your role.</p>
      </header>
      <p className="spectator-view__reason">
        {reason.trim() ? reason : 'Disconnect reason unavailable.'}
      </p>
      <div className="spectator-view__context" aria-live="polite" aria-atomic="true">
        <h3>{roundLabel}</h3>
        <p>{publicSummary.trim() ? publicSummary : 'Public summary unavailable.'}</p>
      </div>
      <footer>
        <button type="button" onClick={onOpenMenu}>Open local menu</button>
        <p>The menu is local. The match continues while it is open.</p>
      </footer>
    </section>
  );
}

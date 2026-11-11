import { useId } from 'react';
import type { ReactElement } from 'react';
import './styles.css';

export interface GameMenuProps {
  readonly mode: 'solo' | 'multiplayer';
  readonly onHowToPlay: () => void;
  readonly onSettings: () => void;
  readonly onLeave: () => void;
  readonly onClose: () => void;
}

export function GameMenu(props: GameMenuProps): ReactElement {
  const id = useId();

  return (
    <section className="game-menu" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Game options</h2>
      <p>
        {props.mode === 'multiplayer'
          ? 'The match continues while this menu is open.'
          : 'Choose a local game option.'}
      </p>
      <div className="game-menu__actions">
        <button type="button" onClick={props.onHowToPlay}>How to Play</button>
        <button type="button" onClick={props.onSettings}>Settings</button>
        <button type="button" onClick={props.onLeave} aria-describedby={`${id}-leave`}>
          Leave
        </button>
        <p id={`${id}-leave`}>Leaving opens a separate confirmation step.</p>
        <button type="button" className="game-menu__close" onClick={props.onClose}>
          Close
        </button>
      </div>
    </section>
  );
}

import { useId, type ReactElement } from 'react';
import './styles.css';

export interface SoloSetupProps {
  readonly players: number;
  readonly difficulty: string;
  readonly difficulties: readonly { readonly id: string; readonly label: string }[];
  readonly durationSeconds: number;
  readonly durations: readonly number[];
  readonly readyToStart: boolean;
  readonly unavailableReason: string | null;
  readonly onPlayersChange: (players: number) => void;
  readonly onDifficultyChange: (id: string) => void;
  readonly onDurationChange: (seconds: number) => void;
  readonly onStart: () => void;
  readonly onBack: () => void;
}

export function SoloSetup(props: SoloSetupProps): ReactElement {
  const id = useId();
  const validPlayers = Number.isInteger(props.players) && props.players >= 5 && props.players <= 10;
  function step(delta: number) {
    const next = props.players + delta;
    if (validPlayers && next >= 5 && next <= 10) props.onPlayersChange(next);
  }

  return (
    <section className="solo-setup" aria-labelledby={`${id}-title`}>
      <button type="button" onClick={props.onBack}>Back</button>
      <h1 id={`${id}-title`}>Solo simulation</h1>
      <p>Fair bots use the same rules and information as humans.</p>
      <fieldset>
        <legend>Players</legend>
        <div className="solo-setup__stepper">
          <button type="button" aria-label="Fewer players" disabled={!validPlayers || props.players <= 5} onClick={() => step(-1)}>−</button>
          <output aria-label="Player count" aria-live="polite">{props.players}</output>
          <button type="button" aria-label="More players" disabled={!validPlayers || props.players >= 10} onClick={() => step(1)}>+</button>
        </div>
        <p>5–10 players</p>
      </fieldset>
      <label htmlFor={`${id}-difficulty`}>Bot difficulty</label>
      <select id={`${id}-difficulty`} value={props.difficulties.some(({ id }) => id === props.difficulty) ? props.difficulty : ''}
        disabled={props.difficulties.length === 0}
        onChange={(event) => {
          const value = event.currentTarget.value;
          if (props.difficulties.some(({ id }) => id === value)) props.onDifficultyChange(value);
        }}>
        <option value="" disabled>Select difficulty</option>
        {props.difficulties.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select>
      {props.difficulties.length === 0 && <p>No bot difficulties available.</p>}
      <label htmlFor={`${id}-duration`}>Duration</label>
      <select id={`${id}-duration`} value={props.durations.includes(props.durationSeconds) ? String(props.durationSeconds) : ''}
        disabled={props.durations.length === 0}
        onChange={(event) => {
          const value = props.durations.find((seconds) => String(seconds) === event.currentTarget.value);
          if (value !== undefined) props.onDurationChange(value);
        }}>
        <option value="" disabled>Select duration</option>
        {props.durations.map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
      </select>
      {props.durations.length === 0 && <p>No durations available.</p>}
      {!props.readyToStart && <p id={`${id}-unavailable`} role="status">{props.unavailableReason ?? 'Simulation authority is unavailable.'}</p>}
      <button className="solo-setup__start" type="button" disabled={!props.readyToStart}
        aria-describedby={!props.readyToStart ? `${id}-unavailable` : undefined}
        onClick={() => { if (props.readyToStart) props.onStart(); }}>Start simulation</button>
    </section>
  );
}

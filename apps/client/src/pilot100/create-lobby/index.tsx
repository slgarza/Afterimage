import { useId, type ReactElement } from 'react';
import './styles.css';

export interface LobbyDraft {
  readonly name: string;
  readonly players: number;
  readonly roundSeconds: 30 | 60 | 90 | 120;
  readonly fillWithBots: boolean;
  readonly difficulty: string;
  readonly listed: boolean;
  readonly requirePasscode: boolean;
  readonly passcode: string;
}

export interface CreateLobbyFormProps {
  readonly value: LobbyDraft;
  readonly difficulties: readonly { readonly id: string; readonly label: string }[];
  readonly busy: boolean;
  readonly error: string | null;
  readonly onChange: (value: LobbyDraft) => void;
  readonly onCreate: () => void;
  readonly onClose: () => void;
}

const timers = [30, 60, 90, 120] as const;

export function CreateLobbyForm({ value, difficulties, busy, error, onChange, onCreate, onClose }: CreateLobbyFormProps): ReactElement {
  const id = useId();
  const update = (change: Partial<LobbyDraft>) => onChange({ ...value, ...change });
  const updateTimer = (index: number) => {
    const roundSeconds = timers[index];
    if (roundSeconds !== undefined) update({ roundSeconds });
  };
  const seats = Math.min(10, Math.max(5, Math.round(value.players) || 5));
  const timerIndex = timers.indexOf(value.roundSeconds);
  const safeError = error && value.passcode ? error.split(value.passcode).join('[redacted]') : error;

  return (
    <form className="create-lobby" aria-labelledby={`${id}-title`} aria-busy={busy} onSubmit={(event) => {
      event.preventDefault();
      if (!busy) onCreate();
    }}>
      <header className="create-lobby__header">
        <h2 id={`${id}-title`}>Create lobby</h2>
        <button type="button" onClick={onClose} aria-label="Close create lobby">Close</button>
      </header>
      <fieldset disabled={busy} className="create-lobby__fields">
        <legend>Lobby settings</legend>
        <label htmlFor={`${id}-name`}>Lobby name</label>
        <input id={`${id}-name`} value={value.name} onChange={(event) => update({ name: event.target.value })} />
        <div role="group" aria-labelledby={`${id}-seats`} className="create-lobby__stepper">
          <span id={`${id}-seats`}>Seats</span>
          <button type="button" aria-label="Fewer seats" disabled={seats === 5} onClick={() => update({ players: Math.max(5, seats - 1) })}>−</button>
          <output aria-label="Seat count">{seats}</output>
          <button type="button" aria-label="More seats" disabled={seats === 10} onClick={() => update({ players: Math.min(10, seats + 1) })}>+</button>
        </div>
        <div role="group" aria-labelledby={`${id}-timer`} className="create-lobby__stepper">
          <span id={`${id}-timer`}>Round timer</span>
          <button type="button" aria-label="Shorter round" disabled={timerIndex <= 0} onClick={() => updateTimer(Math.max(0, timerIndex - 1))}>−</button>
          <output aria-label="Round duration">{value.roundSeconds} seconds</output>
          <button type="button" aria-label="Longer round" disabled={timerIndex === timers.length - 1} onClick={() => updateTimer(Math.min(timers.length - 1, timerIndex + 1))}>+</button>
        </div>
        <label className="create-lobby__check"><input type="checkbox" checked={value.fillWithBots} onChange={(event) => update({ fillWithBots: event.target.checked })} />Fill empty seats with bots</label>
        <label htmlFor={`${id}-difficulty`}>Bot difficulty</label>
        <select id={`${id}-difficulty`} value={value.difficulty} disabled={!value.fillWithBots || difficulties.length === 0} onChange={(event) => update({ difficulty: event.target.value })}>
          {!difficulties.some((option) => option.id === value.difficulty) && <option value={value.difficulty} disabled>{difficulties.length ? 'Select a difficulty' : 'Difficulties unavailable'}</option>}
          {difficulties.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <label className="create-lobby__check"><input type="checkbox" checked={value.listed} onChange={(event) => update({ listed: event.target.checked })} />Show in lobby directory</label>
        <label className="create-lobby__check"><input type="checkbox" checked={value.requirePasscode} onChange={(event) => update(event.target.checked ? { requirePasscode: true } : { requirePasscode: false, passcode: '' })} />Require passcode</label>
        {value.requirePasscode && <>
          <label htmlFor={`${id}-passcode`}>Passcode</label>
          <input id={`${id}-passcode`} type="password" autoComplete="off" value={value.passcode} onChange={(event) => update({ passcode: event.target.value })} />
        </>}
      </fieldset>
      {safeError && <p role="alert" className="create-lobby__error">{safeError}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create lobby'}</button>
    </form>
  );
}

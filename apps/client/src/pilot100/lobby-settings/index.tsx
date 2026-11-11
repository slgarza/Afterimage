import { useId } from 'react';
import './styles.css';

export interface LobbySettingsFormProps {
  readonly players: number;
  readonly roundSeconds: 30 | 60 | 90 | 120;
  readonly fillWithBots: boolean;
  readonly editable: boolean;
  readonly busy: boolean;
  readonly onPlayersChange: (players: number) => void;
  readonly onRoundSecondsChange: (seconds: 30 | 60 | 90 | 120) => void;
  readonly onFillWithBotsChange: (enabled: boolean) => void;
  readonly onSave: () => void;
  readonly onClose: () => void;
}

const playerOptions = [5, 6, 7, 8, 9, 10];
const timerOptions = [30, 60, 90, 120] as const;

export function LobbySettingsForm(props: LobbySettingsFormProps): import('react').ReactElement {
  const id = useId();
  const canEdit = props.editable && !props.busy;
  const validPlayers = playerOptions.includes(props.players);

  return (
    <form className="lobby-settings" aria-labelledby={`${id}-title`} aria-busy={props.busy}
      onSubmit={(event) => {
        event.preventDefault();
        if (canEdit && validPlayers) props.onSave();
      }}>
      <h2 id={`${id}-title`}>Lobby settings</h2>
      <p id={`${id}-help`}>
        {props.editable ? 'Configure the lobby before the match starts.' : 'These settings are read-only.'}
      </p>
      <fieldset disabled={!canEdit} aria-describedby={`${id}-help`}>
        <legend>Match configuration</legend>
        <label htmlFor={`${id}-players`}>Players</label>
        <select id={`${id}-players`} value={validPlayers ? props.players : ''}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (canEdit && playerOptions.includes(value)) props.onPlayersChange(value);
          }}>
          {!validPlayers && <option value="" disabled>Unavailable player count ({props.players})</option>}
          {playerOptions.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <p className="lobby-settings-range">5–10 players</p>
        <label htmlFor={`${id}-timer`}>Round duration</label>
        <select id={`${id}-timer`} value={props.roundSeconds}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            const allowed = timerOptions.find((seconds) => seconds === value);
            if (canEdit && allowed !== undefined) props.onRoundSecondsChange(allowed);
          }}>
          {timerOptions.map((value) => <option key={value} value={value}>{value} seconds</option>)}
        </select>
        <p className="lobby-settings-range">30 / 60 / 90 / 120 seconds</p>
        <label className="lobby-settings-toggle">
          <input type="checkbox" checked={props.fillWithBots}
            onChange={(event) => {
              if (canEdit) props.onFillWithBotsChange(event.currentTarget.checked);
            }} />
          Fill empty seats with bots
        </label>
      </fieldset>
      {props.busy && <p role="status">Saving settings…</p>}
      <div className="lobby-settings-actions">
        <button type="button" onClick={props.onClose}>Close</button>
        <button type="submit" disabled={!canEdit || !validPlayers}>Save</button>
      </div>
    </form>
  );
}

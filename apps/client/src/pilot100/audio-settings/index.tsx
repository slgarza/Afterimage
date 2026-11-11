import { useId, type ReactElement } from 'react';
import './styles.css';

export interface AudioSettingsProps {
  readonly musicEnabled: boolean;
  readonly sfxEnabled: boolean;
  readonly hapticsEnabled: boolean;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly hapticsSupported: boolean;
  readonly onMusicEnabledChange: (value: boolean) => void;
  readonly onSfxEnabledChange: (value: boolean) => void;
  readonly onHapticsEnabledChange: (value: boolean) => void;
  readonly onMusicVolumeChange: (value: number) => void;
  readonly onSfxVolumeChange: (value: number) => void;
  readonly onClose: () => void;
}

// Invalid host values have a silent, finite presentation fallback.
function volume(value: number): number {
  return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
}

export function AudioSettings(props: AudioSettingsProps): ReactElement {
  const id = useId();
  return (
    <section className="audio-settings" aria-labelledby={`${id}-title`}>
      <header>
        <h2 id={`${id}-title`}>Audio settings</h2>
        <button type="button" onClick={() => props.onClose()}>Close audio settings</button>
      </header>
      <p>Adjust preferences without previewing audio. Playback requires host support and respects user gestures and system mute.</p>
      <fieldset>
        <legend>Music</legend>
        <label><input type="checkbox" checked={props.musicEnabled} onChange={(event) => props.onMusicEnabledChange(event.currentTarget.checked)} /> Music enabled</label>
        <label htmlFor={`${id}-music`}>Music volume (0–1): {volume(props.musicVolume)}</label>
        <input id={`${id}-music`} type="range" min="0" max="1" step="0.01" value={volume(props.musicVolume)} onChange={(event) => props.onMusicVolumeChange(volume(event.currentTarget.valueAsNumber))} />
      </fieldset>
      <fieldset>
        <legend>Sound effects</legend>
        <label><input type="checkbox" checked={props.sfxEnabled} onChange={(event) => props.onSfxEnabledChange(event.currentTarget.checked)} /> Sound effects enabled</label>
        <label htmlFor={`${id}-sfx`}>Sound effects volume (0–1): {volume(props.sfxVolume)}</label>
        <input id={`${id}-sfx`} type="range" min="0" max="1" step="0.01" value={volume(props.sfxVolume)} onChange={(event) => props.onSfxVolumeChange(volume(event.currentTarget.valueAsNumber))} />
      </fieldset>
      <fieldset>
        <legend>Haptics</legend>
        <label><input type="checkbox" checked={props.hapticsSupported && props.hapticsEnabled} disabled={!props.hapticsSupported} aria-describedby={!props.hapticsSupported ? `${id}-haptics` : undefined} onChange={(event) => {
          if (props.hapticsSupported) props.onHapticsEnabledChange(event.currentTarget.checked);
        }} /> Haptics enabled</label>
        {!props.hapticsSupported && <p id={`${id}-haptics`}>Haptics are unavailable on this device or platform.</p>}
      </fieldset>
    </section>
  );
}

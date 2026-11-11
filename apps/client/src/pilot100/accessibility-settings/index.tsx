import { useId, type ReactElement } from 'react';
import './styles.css';

export interface AccessibilitySettingsProps {
  readonly reduceMotion: boolean;
  readonly systemReduceMotion: boolean;
  readonly onReduceMotionChange: (value: boolean) => void;
  readonly onClose: () => void;
}

export function AccessibilitySettings({
  reduceMotion,
  systemReduceMotion,
  onReduceMotionChange,
  onClose,
}: AccessibilitySettingsProps): ReactElement {
  const id = useId();

  return (
    <section className="accessibility-settings" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Accessibility</h2>
      <label className="accessibility-settings__setting">
        <input
          type="checkbox"
          checked={reduceMotion}
          aria-describedby={`${id}-description`}
          onChange={(event) => onReduceMotionChange(event.currentTarget.checked)}
        />
        Reduce Motion
      </label>
      <p id={`${id}-description`}>
        Your selected preference reduces decorative motion. Labels and essential
        game-state feedback remain.
      </p>
      <dl className="accessibility-settings__system">
        <dt>System motion preference</dt>
        <dd>
          {systemReduceMotion
            ? 'Reduced motion requested'
            : 'No reduced motion requested'}
        </dd>
      </dl>
      <p>This preference does not change your operating-system settings.</p>
      <button type="button" onClick={() => onClose()}>Close accessibility settings</button>
    </section>
  );
}

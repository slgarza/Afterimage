import { useId, type ReactElement } from 'react';
import './styles.css';

export interface AliasProfileEditorProps {
  readonly alias: string;
  readonly avatarLabel: string;
  readonly error: string | null;
  readonly busy: boolean;
  readonly onAliasChange: (alias: string) => void;
  readonly onChooseAvatar: () => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
}

export function AliasProfileEditor(props: AliasProfileEditorProps): ReactElement {
  const id = useId();
  const hasError = props.error !== null;

  return (
    <section className="alias-profile" aria-label="Temporary alias">
      <button className="alias-profile__back" type="button" onClick={props.onBack} aria-label="Back">
        <span aria-hidden="true">←</span>
      </button>
      <form
        className="alias-profile__form"
        aria-label="Edit temporary alias"
        aria-busy={props.busy}
        onSubmit={(event) => {
          event.preventDefault();
          if (!props.busy && !hasError) props.onContinue();
        }}
      >
        <button className="alias-profile__avatar" type="button" onClick={props.onChooseAvatar}>
          <span className="alias-profile__placeholder" role="img" aria-label={props.avatarLabel}>
            <span aria-hidden="true">Avatar unavailable</span>
          </span>
          <span>Tap to change</span>
        </button>
        <label className="alias-profile__sr-only" htmlFor={`${id}-alias`}>Temporary alias</label>
        <input
          className="alias-profile__input"
          id={`${id}-alias`}
          value={props.alias}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          onChange={(event) => props.onAliasChange(event.currentTarget.value)}
        />
        {hasError && <p className="alias-profile__error" id={`${id}-error`} role="alert">{props.error}</p>}
        <button className="alias-profile__continue" type="submit" disabled={props.busy || hasError}>
          Continue
        </button>
      </form>
    </section>
  );
}

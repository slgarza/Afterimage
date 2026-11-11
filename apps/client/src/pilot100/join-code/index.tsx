import { useId } from 'react';
import type { ReactElement } from 'react';
import './styles.css';

export interface JoinCodeFormProps {
  readonly code: string;
  readonly passcode: string;
  readonly passcodeRequired: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onCodeChange: (code: string) => void;
  readonly onPasscodeChange: (passcode: string) => void;
  readonly onJoin: () => void;
  readonly onBack: () => void;
}

export function JoinCodeForm(props: JoinCodeFormProps): ReactElement {
  const id = useId();
  return (
    <form
      className="join-code-form"
      aria-labelledby={`${id}-title`}
      aria-describedby={props.error !== null ? `${id}-error` : undefined}
      aria-busy={props.busy}
      onSubmit={(event) => {
        event.preventDefault();
        if (!props.busy) props.onJoin();
      }}
    >
      <h2 id={`${id}-title`}>Join with code</h2>
      <label htmlFor={`${id}-code`}>Room code</label>
      <input
        id={`${id}-code`}
        value={props.code}
        onChange={(event) => props.onCodeChange(event.currentTarget.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        disabled={props.busy}
      />
      {props.passcodeRequired && (
        <>
          <label htmlFor={`${id}-passcode`}>Passcode</label>
          <input
            id={`${id}-passcode`}
            type="password"
            value={props.passcode}
            onChange={(event) => props.onPasscodeChange(event.currentTarget.value)}
            autoComplete="off"
            disabled={props.busy}
          />
        </>
      )}
      {props.error !== null && <p id={`${id}-error`} role="alert">{props.error}</p>}
      <div className="join-code-form__actions">
        <button type="button" onClick={() => props.onBack()}>Back</button>
        <button type="submit" disabled={props.busy}>Join</button>
      </div>
    </form>
  );
}

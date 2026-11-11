import { useId, type ReactElement } from 'react';
import './styles.css';

export interface RestorePurchasesProps {
  readonly available: boolean;
  readonly state: 'idle' | 'pending' | 'restored' | 'none-found' | 'failed';
  readonly platformLabel: string;
  readonly message: string | null;
  readonly onRestore: () => void;
}

const outcomes: Record<RestorePurchasesProps['state'], string> = {
  idle: 'Ready to request restoration.',
  pending: 'Restoration is pending. Waiting for the store result.',
  restored: 'Purchases restored.',
  'none-found': 'No restorable purchases found.',
  failed: 'Purchases could not be restored.',
};

export function RestorePurchases(props: RestorePurchasesProps): ReactElement {
  const id = useId();
  const disabled = !props.available || props.state === 'pending';

  return (
    <section className="restore-purchases" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Restore purchases</h2>
      <p id={`${id}-scope`}>
        Restoration applies to purchases from {props.platformLabel} using the
        purchaser’s store account on that platform. The native store determines
        the result. Purchases do not transfer between stores or to the web.
      </p>
      {!props.available && (
        <p>Purchase restoration is unavailable on {props.platformLabel}. Restoration is unavailable on the web; use the native app for the original store.</p>
      )}
      <div role="status" aria-live="polite" aria-atomic="true">
        <p>{props.state === 'idle' && !props.available
          ? 'Restoration cannot be requested here.'
          : outcomes[props.state]}</p>
        {props.message !== null && <p>{props.message}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        aria-describedby={`${id}-scope`}
        onClick={() => { if (!disabled) props.onRestore(); }}
      >
        {props.state === 'pending' ? 'Restoring purchases…' : 'Restore purchases'}
      </button>
    </section>
  );
}

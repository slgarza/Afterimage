import type { ButtonHTMLAttributes } from 'react';
import { theme } from '../theme.js';

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly busy?: boolean;
}

export function ActionButton({
  busy = false,
  disabled = false,
  type = 'button',
  style,
  ...attributes
}: ActionButtonProps) {
  return (
    <button
      {...attributes}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy}
      style={{
        backgroundColor: theme.color.surface.elevated,
        color: theme.color.text.primary,
        border: `1px solid ${theme.color.border.control}`,
        borderRadius: '0.25rem',
        padding: '0.5rem 0.75rem',
        font: 'inherit',
        ...style,
      }}
    />
  );
}

export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly hint?: string;
  readonly error?: string;
  readonly name?: string;
  readonly disabled?: boolean;
}

export function TextField({
  id, label, value, onValueChange, hint, error, name, disabled,
}: TextFieldProps) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : '']
    .filter(Boolean).join(' ') || undefined;

  return (
    <div style={{ display: 'grid', gap: '0.375rem', color: theme.color.text.primary, backgroundColor: theme.color.surface.panel }}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        name={name}
        disabled={disabled}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        style={{
          backgroundColor: theme.color.surface.panel,
          color: theme.color.text.primary,
          border: `1px solid ${theme.color.border.control}`,
          borderRadius: '0.25rem',
          padding: '0.5rem',
          font: 'inherit',
        }}
      />
      {hint && <span id={`${id}-hint`} style={{ color: theme.color.text.secondary }}>{hint}</span>}
      {error && <span id={`${id}-error`}>{error}</span>}
    </div>
  );
}

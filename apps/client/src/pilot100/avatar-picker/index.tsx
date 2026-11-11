import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import './styles.css';

export interface AvatarPickerProps {
  readonly choices: readonly {
    readonly id: string;
    readonly label: string;
    readonly src: string | null;
  }[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onClose: () => void;
}

function AvatarMedia({ src }: { readonly src: string | null }): ReactElement {
  const [failed, setFailed] = useState(false);
  return src?.trim() && !failed
    ? <img className="avatar-picker__image" src={src} alt="" onError={() => setFailed(true)} />
    : <span className="avatar-picker__unavailable">Image unavailable</span>;
}

export function AvatarPicker({ choices, selectedId, onSelect, onClose }: AvatarPickerProps): ReactElement {
  const groupId = useId();
  return (
    <section className="avatar-picker" aria-labelledby={`${groupId}-title`}>
      <h2 id={`${groupId}-title`}>Choose an avatar</h2>
      {choices.length === 0 ? <p>No avatars are available.</p> : (
        <fieldset className="avatar-picker__choices">
          <legend>Available avatars</legend>
          {choices.map((choice, index) => (
            <label className="avatar-picker__choice" key={choice.id}>
              <input
                type="radio"
                name={groupId}
                value={choice.id}
                checked={selectedId === choice.id}
                aria-labelledby={`${groupId}-${index}-label`}
                onChange={() => onSelect(choice.id)}
              />
              <span className="avatar-picker__media">
                <AvatarMedia key={choice.src} src={choice.src} />
              </span>
              <span id={`${groupId}-${index}-label`}>{choice.label}</span>
              {selectedId === choice.id && <span className="avatar-picker__selected">Selected</span>}
            </label>
          ))}
        </fieldset>
      )}
      <button className="avatar-picker__close" type="button" onClick={onClose}>Close</button>
    </section>
  );
}

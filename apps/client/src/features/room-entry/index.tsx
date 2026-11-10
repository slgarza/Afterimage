import { useId, useState, type FormEvent } from 'react';

export interface RoomEntryFormProps {
  readonly busy?: boolean;
  readonly onCreate: (input: { displayName: string }) => void;
  readonly onJoin: (input: { roomCode: string; displayName: string }) => void;
}

export function RoomEntryForm({ busy = false, onCreate, onJoin }: RoomEntryFormProps) {
  const id = useId();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [errors, setErrors] = useState<{ displayName?: string; roomCode?: string }>({});
  const nameId = `${id}-name`;
  const codeId = `${id}-code`;

  function changeMode(next: 'create' | 'join') {
    if (busy) return;
    setMode(next);
    setErrors({});
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const name = displayName.trim();
    const code = roomCode.trim().toUpperCase();
    const nextErrors: typeof errors = {};
    if ([...name].length < 1 || [...name].length > 24 || /\p{Cc}/u.test(name)) {
      nextErrors.displayName = 'Enter a display name with 1–24 characters and no control characters.';
    }
    if (mode === 'join' && !/^[A-Z0-9]{6}$/.test(code)) {
      nextErrors.roomCode = 'Enter a room code with exactly six letters (A–Z) or digits (0–9).';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (mode === 'create') onCreate({ displayName: name });
    else onJoin({ roomCode: code, displayName: name });
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Room entry" aria-busy={busy}>
      <div role="group" aria-label="Room entry mode">
        <button type="button" aria-pressed={mode === 'create'} disabled={busy} onClick={() => changeMode('create')}>Create</button>
        <button type="button" aria-pressed={mode === 'join'} disabled={busy} onClick={() => changeMode('join')}>Join</button>
      </div>
      <div>
        <label htmlFor={nameId}>Display name</label>
        <input id={nameId} name="displayName" type="text" required disabled={busy} value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={errors.displayName ? `${nameId}-error` : undefined} />
        {errors.displayName && <p id={`${nameId}-error`}>{errors.displayName}</p>}
      </div>
      {mode === 'join' && <div>
        <label htmlFor={codeId}>Room code</label>
        <input id={codeId} name="roomCode" type="text" required disabled={busy} value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
          aria-invalid={errors.roomCode ? true : undefined}
          aria-describedby={errors.roomCode ? `${codeId}-error` : undefined} />
        {errors.roomCode && <p id={`${codeId}-error`}>{errors.roomCode}</p>}
      </div>}
      <button type="submit" disabled={busy}>{mode === 'create' ? 'Create room' : 'Join room'}</button>
    </form>
  );
}

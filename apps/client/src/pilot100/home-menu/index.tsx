import { useId, useState } from 'react';
import './home-menu.css';

export interface HomeMenuProps {
  readonly mode: 'solo' | 'multiplayer';
  readonly logo: { readonly src: string; readonly alt: string } | null;
  readonly onModeChange: (mode: 'solo' | 'multiplayer') => void;
  readonly onPlay: (mode: 'solo' | 'multiplayer') => void;
}

function HomeLogo({ logo }: { readonly logo: HomeMenuProps['logo'] }) {
  const [failed, setFailed] = useState(false);
  if (!logo?.src.trim() || failed) return <>Afterimage</>;
  return <img className="home-menu__logo" src={logo.src} alt={logo.alt} onError={() => setFailed(true)} />;
}

export function HomeMenu(props: HomeMenuProps): import('react').ReactElement {
  const id = useId();

  return (
    <section className="home-menu" aria-labelledby={`${id}-title`}>
      <div className="home-menu__content">
        <h1 id={`${id}-title`} className="home-menu__title">
          <HomeLogo key={props.logo?.src} logo={props.logo} />
        </h1>
        <fieldset className="home-menu__modes">
          <legend className="home-menu__legend">Play mode</legend>
          <div className="home-menu__segments">
            {(['solo', 'multiplayer'] as const).map((mode) => (
              <label className="home-menu__option" key={mode}>
                <input
                  type="radio"
                  name={`${id}-mode`}
                  value={mode}
                  checked={props.mode === mode}
                  onChange={() => props.onModeChange(mode)}
                />
                <span>{mode === 'solo' ? 'Solo' : 'Multiplayer'}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button className="home-menu__play" type="button" onClick={() => props.onPlay(props.mode)}>
          Play
        </button>
      </div>
    </section>
  );
}

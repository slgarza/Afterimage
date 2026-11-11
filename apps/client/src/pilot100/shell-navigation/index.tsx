import type { ReactElement } from 'react';
import './styles.css';

export interface ShellNavigationProps {
  readonly selected: 'home' | 'how-to-play' | 'achievements' | 'settings';
  readonly hidden: boolean;
  readonly onNavigate: (route: 'home' | 'how-to-play' | 'achievements' | 'settings') => void;
}

const routes = [
  { route: 'home', label: 'Home' },
  { route: 'how-to-play', label: 'How to Play' },
  { route: 'achievements', label: 'Achievements' },
  { route: 'settings', label: 'Settings' },
] as const;

export function ShellNavigation({ selected, hidden, onNavigate }: ShellNavigationProps): ReactElement {
  if (hidden) return <></>;

  return (
    <nav className="shell-navigation" aria-label="Main navigation">
      <ul className="shell-navigation__routes">
        {routes.map(({ route, label }) => (
          <li key={route}>
            <button
              type="button"
              aria-current={selected === route ? 'page' : undefined}
              onClick={() => onNavigate(route)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

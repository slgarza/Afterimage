import { useState, type ReactElement } from 'react';
import './styles.css';

export interface AchievementGridProps {
  readonly achievements: readonly {
    readonly id: string;
    readonly title: string;
    readonly unlocked: boolean;
    readonly icon: { readonly src: string; readonly alt: string } | null;
  }[];
  readonly reducedMotion: boolean;
  readonly onDetails: (id: string) => void;
}

function Artwork({ icon }: {
  readonly icon: AchievementGridProps['achievements'][number]['icon'];
}): ReactElement {
  const [failed, setFailed] = useState(false);
  const label = icon?.alt.trim() || 'Achievement artwork';
  if (!icon?.src.trim() || failed) {
    return <span className="achievement-grid__unavailable" role="img" aria-label={`${label} — unavailable`}>Artwork unavailable</span>;
  }
  return <img className="achievement-grid__art" src={icon.src} alt={label} onError={() => setFailed(true)} />;
}

export function AchievementGrid({ achievements, reducedMotion, onDetails }: AchievementGridProps): ReactElement {
  return (
    <section className="achievement-grid" aria-label="Achievements" data-reduced-motion={reducedMotion}>
      {achievements.length === 0 ? <p>No achievements are available in the supplied catalogue.</p> : (
        <ul className="achievement-grid__list">
          {achievements.map((achievement) => (
            <li key={achievement.id} className="achievement-grid__tile" data-unlocked={achievement.unlocked}>
              <Artwork key={JSON.stringify(achievement.icon)} icon={achievement.icon} />
              <h3>{achievement.title}</h3>
              <p>{achievement.unlocked ? 'Unlocked' : 'Locked'}</p>
              <button type="button" aria-label={`View details: ${achievement.title} — ${achievement.unlocked ? 'Unlocked' : 'Locked'}`} onClick={() => onDetails(achievement.id)}>View details</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

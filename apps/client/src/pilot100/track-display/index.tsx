import { useId, useState, type ReactElement } from 'react';
import './track-display.css';

export interface TrackDisplayProps {
  readonly track: 'repair' | 'sabotage';
  readonly value: number;
  readonly nodes: readonly {
    readonly node: 1 | 2 | 3 | 4 | 5 | 6;
    readonly title: string;
    readonly icon: { readonly src: string; readonly alt: string } | null;
    readonly consequenceActive: boolean;
  }[];
  readonly onNodeDetails: (node: 1 | 2 | 3 | 4 | 5 | 6) => void;
}

function NodeIcon({ icon, title }: {
  readonly icon: TrackDisplayProps['nodes'][number]['icon'];
  readonly title: string;
}): ReactElement {
  const [failed, setFailed] = useState(false);
  if (!icon || !icon.src.trim() || failed) {
    return <span className="track-display__media">{icon?.alt || title} — icon unavailable</span>;
  }
  return <img className="track-display__icon" src={icon.src} alt={icon.alt || title}
    onError={() => setFailed(true)} />;
}

export function TrackDisplay({ track, value, nodes, onNodeDetails }: TrackDisplayProps): ReactElement {
  const headingId = useId();
  const valid = (track === 'repair' || track === 'sabotage')
    && Number.isInteger(value) && value >= 0 && value <= 6
    && nodes.length === 6 && new Set(nodes.map(({ node }) => node)).size === 6
    && nodes.every(({ node, title, consequenceActive }) => Number.isInteger(node)
      && node >= 1 && node <= 6 && typeof title === 'string' && title.trim().length > 0
      && typeof consequenceActive === 'boolean');
  const label = track === 'repair' ? 'Repair' : track === 'sabotage' ? 'Sabotage' : 'Unknown';

  return <section className="track-display" aria-labelledby={headingId}>
    <h2 id={headingId}>{label} progression</h2>
    {!valid ? <p role="alert">Invalid track projection. Progress and node details unavailable.</p> : <>
      <p role="status">{label}: {value} of 6 nodes reached.</p>
      <ol className="track-display__nodes">
        {[...nodes].sort((a, b) => a.node - b.node).map((entry) => {
          // Current is the latest reached node; zero has no current node.
          const current = entry.node === value;
          const reached = entry.node <= value;
          return <li key={entry.node} className="track-display__node"
            data-reached={reached} data-consequence={entry.consequenceActive}>
            <button type="button" aria-current={current ? 'step' : undefined}
              onClick={() => onNodeDetails(entry.node)}>
              <span className="track-display__title">{entry.node}. {entry.title}</span>
              <NodeIcon key={entry.icon?.src ?? 'unavailable'} icon={entry.icon} title={entry.title} />
              <span>{current ? 'Reached · Current node' : reached ? 'Reached' : 'Not reached'}</span>
              {entry.consequenceActive && <strong>Persistent consequence active</strong>}
              <span className="track-display__details">View node details</span>
            </button>
          </li>;
        })}
      </ol>
    </>}
    <p className="track-display__note">Track progression accompanies the separate City Moment event.</p>
  </section>;
}

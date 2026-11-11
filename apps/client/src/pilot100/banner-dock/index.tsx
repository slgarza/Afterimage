import type { CSSProperties, ReactElement } from 'react';
import './banner-dock.css';

export interface BannerDockProps {
  readonly platform: 'web' | 'ios' | 'android';
  readonly adsRemoved: boolean;
  readonly reservedHeight: number;
  readonly state: 'unavailable' | 'loading' | 'loaded' | 'failed';
  readonly label: string;
}

/** Reserves layout space only; the reviewed native adapter owns the ad surface. */
export function BannerDock(props: BannerDockProps): ReactElement {
  const eligible = props.platform !== 'web' && !props.adsRemoved;
  const height = Number.isFinite(props.reservedHeight) && props.reservedHeight > 0
    ? props.reservedHeight
    : 0;

  if (!eligible || height === 0) return <div hidden />;

  const style = { '--afterimage-banner-height': `${height}px` } as CSSProperties;

  return (
    <div className="afterimage-banner-reservation" style={style}>
      <aside
        className="afterimage-banner-dock"
        aria-label={props.label}
        data-state={props.state}
      />
    </div>
  );
}

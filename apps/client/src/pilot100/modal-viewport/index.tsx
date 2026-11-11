import { useId, useLayoutEffect, useRef, type ReactElement, type ReactNode } from 'react';
import './styles.css';

export interface ModalViewportProps {
  readonly background: ReactNode;
  readonly overlay: {
    readonly id: string;
    readonly title: string;
    readonly content: ReactNode;
    readonly dismissible: boolean;
    readonly onDismiss: () => void;
  } | null;
  readonly dock: ReactNode;
  readonly reservedDockHeight: number;
  readonly reducedMotion: boolean;
}

const focusable = 'a[href],button,input,select,textarea,[tabindex],summary,[contenteditable="true"]';

export function ModalViewport(props: ModalViewportProps): ReactElement {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const currentOverlay = useRef(props.overlay);
  currentOverlay.current = props.overlay;
  const isOpen = props.overlay !== null;
  const dockHeight = Number.isFinite(props.reservedDockHeight)
    ? Math.max(0, props.reservedDockHeight) : 0;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    dialog.focus();

    const candidates = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusable))
      .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled')
        && !element.closest('[hidden],[inert],[aria-hidden="true"]')
        && getComputedStyle(element).display !== 'none'
        && getComputedStyle(element).visibility !== 'hidden');
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) dialog.focus();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (currentOverlay.current?.dismissible) currentOverlay.current.onDismiss();
      }
      if (event.key === 'Tab') {
        const elements = candidates();
        const first = elements[0];
        const last = elements.at(-1);
        const active = document.activeElement;
        if (!first || (event.shiftKey && (active === first || active === dialog))
          || (!event.shiftKey && (active === last || active === dialog))) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
          if (!first) dialog.focus();
        }
      }
    };
    document.addEventListener('focusin', containFocus, true);
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('focusin', containFocus, true);
      document.removeEventListener('keydown', keydown, true);
      if (dialog.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  return (
    <div className="modal-viewport" data-reduced-motion={props.reducedMotion}>
      <div className="modal-viewport__background" inert={isOpen} aria-hidden={isOpen || undefined}
        style={{ filter: isOpen ? 'blur(6px) brightness(0.5) saturate(0)' : undefined,
          pointerEvents: isOpen ? 'none' : undefined }}>
        <main className="modal-viewport__content" style={{ paddingBottom: `calc(${dockHeight}px + env(safe-area-inset-bottom, 0px))` }}>
          {props.background}
        </main>
        <div className="modal-viewport__dock" style={{ minHeight: dockHeight }}>{props.dock}</div>
      </div>
      {props.overlay && (
        <dialog ref={dialogRef} className="modal-viewport__dialog" tabIndex={-1}
          aria-modal="true" aria-labelledby={titleId} data-overlay-id={props.overlay.id}
          onCancel={(event) => {
            event.preventDefault();
            if (props.overlay?.dismissible) props.overlay.onDismiss();
          }}>
          <h2 id={titleId}>{props.overlay.title}</h2>
          {props.overlay.content}
        </dialog>
      )}
    </div>
  );
}

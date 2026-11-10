export interface BoardViewProps {
  readonly stability: number;
  readonly corruption: number;
}

function validateMark(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new RangeError('Board marks must be integers from zero through five.');
  }
}

export function BoardView({ stability, corruption }: BoardViewProps) {
  validateMark(stability);
  validateMark(corruption);

  return (
    <div>
      <div
        role="meter"
        aria-label="Stability"
        aria-valuenow={stability}
        aria-valuemin={0}
        aria-valuemax={5}
      >
        <span>Stability</span>: <span>{stability} / 5</span>
      </div>
      <div
        role="meter"
        aria-label="Corruption"
        aria-valuenow={corruption}
        aria-valuemin={0}
        aria-valuemax={5}
      >
        <span>Corruption</span>: <span>{corruption} / 5</span>
      </div>
    </div>
  );
}

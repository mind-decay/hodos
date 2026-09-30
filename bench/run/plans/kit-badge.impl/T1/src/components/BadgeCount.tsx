/**
 * Convention 2: a component's props type is named after it and exported beside
 * it. The tone union is Badge's own, spelled once — a tone the stylesheet has
 * no class for would render a class nothing styles.
 */
export interface BadgeCountProps {
  tone: 'neutral' | 'success' | 'danger';
  count: number;
}

export function BadgeCount({ tone, count }: BadgeCountProps) {
  return (
    <span className={`badge badge--${tone} badge--count`} data-tone={tone} data-count={count}>
      {count}
    </span>
  );
}

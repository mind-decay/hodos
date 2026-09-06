/**
 * Convention 2: a component's props type is named after it and exported beside
 * it, so a consumer can spell the type without guessing.
 */
export interface BadgeProps {
  tone: 'neutral' | 'success' | 'danger';
  children: string;
}

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span className={`badge badge--${tone}`} data-tone={tone}>
      {children}
    </span>
  );
}

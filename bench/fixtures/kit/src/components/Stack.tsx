import type { ReactNode } from 'react';

export interface StackProps {
  gap?: 'tight' | 'loose';
  children: ReactNode;
}

export function Stack({ gap = 'tight', children }: StackProps) {
  return (
    <div className="stack" data-gap={gap}>
      {children}
    </div>
  );
}

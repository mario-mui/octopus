import { ReactNode } from 'react';
import { Card } from 'antd';

export interface PageProps {
  children: ReactNode;
}

/** A simple content surface for plugin pages. */
export function Page({ children }: PageProps) {
  return <Card variant="borderless">{children}</Card>;
}

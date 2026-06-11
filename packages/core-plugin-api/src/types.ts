import { ReactNode } from 'react';
import { FrontendPlugin } from './wiring';

/** @public */
export type ProgressProps = {};

/** @public */
export type NotFoundErrorPageProps = {
  children?: ReactNode;
};

/** @public */
export type ErrorDisplayProps = {
  plugin?: FrontendPlugin;
  error: Error;
  resetError: () => void;
};

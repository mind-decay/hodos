/**
 * Convention 1: the barrel is the library's whole public surface. A component
 * that is not re-exported here is not shipped, and index.test.ts fails if one
 * is missing.
 */
export { Badge } from './components/Badge';
export type { BadgeProps } from './components/Badge';
export { Stack } from './components/Stack';
export type { StackProps } from './components/Stack';

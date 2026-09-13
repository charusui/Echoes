/**
 * Dev-only deep links for visual QA, e.g. `?dev-view=expedition&dev-modal=shop`.
 * Always returns null in production builds.
 */
export function devParam(key: string): string | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

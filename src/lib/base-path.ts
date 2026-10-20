/** GitHub Pages deployment prefix. Keep all internal URLs inside this path. */
export const BASE_PATH = '/myblog';

export function withoutBase(value: string): string {
  if (value === BASE_PATH) return '/';
  return value.startsWith(BASE_PATH + '/') || value.startsWith(BASE_PATH + '?') || value.startsWith(BASE_PATH + '#')
    ? value.slice(BASE_PATH.length) || '/'
    : value;
}

export function withBase(value: string): string {
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(value)) return value;
  const local = value.startsWith('/') ? value : '/' + value;
  return BASE_PATH + withoutBase(local);
}

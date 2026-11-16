export type ColorMode = 'system' | 'light' | 'dark';
export interface Appearance { mode: ColorMode; contrast: boolean }
export const APPEARANCE_KEY = 'elara_appearance_v1';
export function readAppearance(value: string | null): Appearance {
  try {
    const parsed = JSON.parse(value || '{}');
    return { mode: ['system', 'light', 'dark'].includes(parsed.mode) ? parsed.mode : 'system', contrast: parsed.contrast === true };
  } catch { return { mode: 'system', contrast: false }; }
}
// Runs before the first paint; only whitelisted values reach the DOM.
export const APPEARANCE_BOOTSTRAP = `(function(){try{var p=JSON.parse(localStorage.getItem('${APPEARANCE_KEY}')||'{}');var m=['light','dark'].includes(p.mode)?p.mode:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=m;document.documentElement.dataset.contrast=p.contrast===true?'high':'normal'}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})();`;

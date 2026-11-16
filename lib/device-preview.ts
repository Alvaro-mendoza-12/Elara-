export const PREVIEW_DEVICES = {
  desktop: { name: 'Laptop', width: 1280, height: 800 },
  tablet: { name: 'Tablet', width: 768, height: 1024 },
  mobile: { name: 'Celular', width: 390, height: 844 },
} as const;
export type PreviewDevice = keyof typeof PREVIEW_DEVICES;
export function deviceScale(frameWidth: number, frameHeight: number, availableWidth: number, availableHeight: number) {
  return Math.max(.05, Math.min(1, Math.max(1, availableWidth - 32) / frameWidth, Math.max(1, availableHeight - 32) / frameHeight));
}

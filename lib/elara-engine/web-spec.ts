import type { PromptParams } from './text';

type WebSpec = Pick<PromptParams, 'topicSubject' | 'brandName' | 'requestedCount' | 'preferredTheme' | 'accentColor' | 'currencySymbol'>;
export function serializeWebSpec(params: PromptParams): string {
  const { topicSubject, brandName, requestedCount, preferredTheme, accentColor, currencySymbol } = params;
  // Only presentation fields go into the portable prototype, never the raw conversation.
  return encodeURIComponent(JSON.stringify({ topicSubject, brandName, requestedCount, preferredTheme, accentColor, currencySymbol })).replaceAll("'", '%27');
}
export function readWebSpec(html: string): Partial<WebSpec> {
  try {
    const content = html.match(/name="elara-spec"\s+content="([^"]+)"/)?.[1];
    if (!content || content.length > 3000) return {};
    const spec = JSON.parse(decodeURIComponent(content));
    if (!spec || typeof spec !== 'object' || !['dark', 'light'].includes(spec.preferredTheme) ||
      !['$', 'S/', '€'].includes(spec.currencySymbol) ||
      (spec.topicSubject !== null && (typeof spec.topicSubject !== 'string' || spec.topicSubject.length > 200)) ||
      (spec.brandName !== null && (typeof spec.brandName !== 'string' || spec.brandName.length > 60)) ||
      (spec.requestedCount !== null && (!Number.isInteger(spec.requestedCount) || spec.requestedCount < 1 || spec.requestedCount > 40)) ||
      (spec.accentColor !== null && !/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(spec.accentColor))) return {};
    const { topicSubject, brandName, requestedCount, preferredTheme, accentColor, currencySymbol } = spec;
    return { topicSubject, brandName, requestedCount, preferredTheme, accentColor, currencySymbol };
  } catch { return {}; }
}

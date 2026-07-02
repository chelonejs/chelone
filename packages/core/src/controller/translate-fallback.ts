/**
 * Resource-scoped notification key with global fallback. A translator that
 * returns the key unchanged (Chelone i18n's missing-key behavior) means
 * "not translated" — fall back to the global key.
 */
export function resolveNotificationKey(
  translate: ((key: string) => string) | undefined,
  resource: string,
  event: string,
): string {
  const scoped = `resources.${resource}.notifications.${event}`;
  if (translate && translate(scoped) !== scoped) return scoped;
  return `chelone.notification.${event}`;
}

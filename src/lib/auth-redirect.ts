import type { Locale } from "./domain";
import { safeReturnPath } from "./validation";

/** Only call after the auth service has accepted the confirmation token. */
export function confirmationDestination(type: string, locale: Locale, next?: string | null) {
  if (type === "recovery") return `/${locale}/auth?mode=update`;
  const destination = safeReturnPath(next, locale);
  const verifiedPath = `/${locale}/auth/verified`;
  return destination.startsWith(verifiedPath)
    ? verifiedPath
    : `${verifiedPath}?next=${encodeURIComponent(destination)}`;
}

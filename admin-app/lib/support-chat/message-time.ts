export function shouldShowTimeDivider(
  currentCreatedAt: string,
  previousCreatedAt: string | null,
  isConversationStart: boolean,
) {
  if (isConversationStart) return true;
  if (!previousCreatedAt) return false;
  return new Date(currentCreatedAt).getTime() - new Date(previousCreatedAt).getTime() >= 10 * 60_000;
}

import type { SlackContext } from "@/src/types/slack";

export type SlackMiddleware = (
  context: Readonly<SlackContext>,
  next: () => Promise<void>,
) => Promise<void>;

// Middleware is composed here once Slack request handling is introduced.
export const slackMiddleware: readonly SlackMiddleware[] = [];

import { APP_DESCRIPTION, APP_NAME } from "@/src/lib/constants";

/** Static agent metadata only. Runtime AI orchestration is intentionally deferred. */
export const incidentAgent = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  capabilities: [
    "incident context synthesis",
    "deployment correlation",
    "response coordination",
  ],
  implemented: false,
} as const;

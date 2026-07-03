import { ENVIRONMENT_KEYS } from "@/src/lib/constants";

export interface OpenAIServiceConfig {
  apiKey: string;
}

/** Reads configuration lazily so imports remain safe during Vercel builds. */
export function getOpenAIServiceConfig(): OpenAIServiceConfig | null {
  const apiKey = process.env[ENVIRONMENT_KEYS.openAiApiKey];
  return apiKey ? { apiKey } : null;
}

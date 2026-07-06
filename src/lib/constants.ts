export const APP_NAME = "OpsPilot";
export const APP_DESCRIPTION = "An AI incident commander designed for Slack.";
export const HACKATHON_NAME = "Slack Agent Builder Challenge";

export const ENVIRONMENT_KEYS = {
  slackBotToken: "SLACK_BOT_TOKEN",
  slackSigningSecret: "SLACK_SIGNING_SECRET",
  slackAppToken: "SLACK_APP_TOKEN",
  slackRtsEnabled: "SLACK_RTS_ENABLED",
  slackRtsApiUrl: "SLACK_RTS_API_URL",
  slackRtsToken: "SLACK_RTS_TOKEN",
  openAiApiKey: "OPENAI_API_KEY",
  openAiModel: "OPENAI_MODEL",
  demoMode: "DEMO_MODE",
  githubToken: "GITHUB_TOKEN",
  githubOwner: "GITHUB_OWNER",
  githubRepo: "GITHUB_REPO",
} as const;

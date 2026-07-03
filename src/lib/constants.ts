export const APP_NAME = "OpsPilot";
export const APP_DESCRIPTION = "An AI incident commander designed for Slack.";
export const HACKATHON_NAME = "Slack Agent Builder Challenge";

export const ENVIRONMENT_KEYS = {
  slackBotToken: "SLACK_BOT_TOKEN",
  slackSigningSecret: "SLACK_SIGNING_SECRET",
  slackAppToken: "SLACK_APP_TOKEN",
  openAiApiKey: "OPENAI_API_KEY",
  githubToken: "GITHUB_TOKEN",
  githubOwner: "GITHUB_OWNER",
  githubRepo: "GITHUB_REPO",
} as const;

export interface CommandGuideItem {
  label: string;
  description: string;
}

export interface CommandGuideCategory {
  title: string;
  description: string;
  commands: CommandGuideItem[];
}

export const usageModeCommands: CommandGuideItem[] = [
  {
    label: "Open OpsPilot from Slack's agent surface",
    description: "Recommended path for guided prompts, live status, and contextual thread titles.",
  },
  {
    label: "@OpsPilot investigate checkout failures",
    description: "Mention OpsPilot in any channel or thread where responders are working.",
  },
  {
    label: "/opspilot investigate checkout API is failing",
    description: "Launch a workflow with the slash command when you prefer command syntax.",
  },
];

export const incidentResponseCommands: CommandGuideItem[] = [
  {
    label: "@OpsPilot investigate checkout failures",
    description: "Start an incident investigation from a natural-language report.",
  },
  {
    label: "@OpsPilot show evidence",
    description: "Show the evidence supporting the current incident hypothesis.",
  },
  {
    label: "@OpsPilot show timeline",
    description: "Summarize the active incident timeline.",
  },
  {
    label: "@OpsPilot generate postmortem",
    description: "Draft a postmortem from the current incident context.",
  },
  {
    label: "@OpsPilot mark resolved",
    description: "Post a resolved status update for the active incident.",
  },
];

export const repositoryIntelligenceCommands: CommandGuideItem[] = [
  {
    label: "@OpsPilot check my repo for issues",
    description: "Audit recent commits and changed files in the connected repository.",
  },
  {
    label: "@OpsPilot what should I test?",
    description: "Generate a focused validation plan from the latest repo audit.",
  },
  {
    label: "@OpsPilot explain the highest risk change",
    description: "Explain why the riskiest recent change needs review.",
  },
  {
    label: "@OpsPilot write release notes",
    description: "Draft release notes from recent repository changes.",
  },
  {
    label: "@OpsPilot create a rollback runbook",
    description: "Generate a practical rollback and remediation runbook.",
  },
];

export const slashCommandAlternatives: CommandGuideItem[] = [
  {
    label: "/opspilot investigate checkout API is failing",
    description: "Start an incident investigation with a slash command.",
  },
  {
    label: "/opspilot audit repo",
    description: "Run a repository audit in the current Slack channel.",
  },
  {
    label: "/opspilot help",
    description: "Show the Slack help menu.",
  },
];

export const commandGuideCategories: CommandGuideCategory[] = [
  {
    title: "Ways to Use OpsPilot",
    description: "Start in Slack's agent experience, mention OpsPilot, or use slash commands.",
    commands: usageModeCommands,
  },
  {
    title: "Incident Response",
    description: "Use these during outages, degraded services, and active incident threads.",
    commands: incidentResponseCommands,
  },
  {
    title: "Repository Intelligence",
    description: "Use these before deploys or when reviewing recent code changes.",
    commands: repositoryIntelligenceCommands,
  },
  {
    title: "Slash Command Alternatives",
    description: "Use these when you prefer slash commands over mentions.",
    commands: slashCommandAlternatives,
  },
];

export type ParsedOpsPilotCommand =
  | { type: "investigate"; issueText: string }
  | { type: "repo_audit"; query: string }
  | {
      type: "repo_followup";
      intent:
        | "help"
        | "repo_summary"
        | "test_plan"
        | "release_notes"
        | "next_steps"
        | "runbook";
      query: string;
    }
  | { type: "unknown"; commandName: string };

export function parseOpsPilotCommand(text: string): ParsedOpsPilotCommand {
  const normalizedText = text.trim();
  const firstWhitespace = normalizedText.search(/\s/);
  const commandName = (
    firstWhitespace === -1 ? normalizedText : normalizedText.slice(0, firstWhitespace)
  ).toLowerCase();
  const remainder = firstWhitespace === -1 ? "" : normalizedText.slice(firstWhitespace).trim();

  if (commandName === "investigate") {
    return { type: "investigate", issueText: remainder };
  }

  if (commandName === "audit" && (!remainder || remainder === "repo")) {
    return { type: "repo_audit", query: remainder || "audit repo" };
  }

  if (commandName === "help" || !commandName) {
    return { type: "repo_followup", intent: "help", query: normalizedText };
  }

  if (commandName === "summarize" && remainder === "repo") {
    return { type: "repo_followup", intent: "repo_summary", query: normalizedText };
  }

  if (commandName === "test" && remainder === "plan") {
    return { type: "repo_followup", intent: "test_plan", query: normalizedText };
  }

  if (commandName === "release" && remainder === "notes") {
    return { type: "repo_followup", intent: "release_notes", query: normalizedText };
  }

  if (commandName === "next" && remainder === "steps") {
    return { type: "repo_followup", intent: "next_steps", query: normalizedText };
  }

  if (commandName === "runbook" && !remainder) {
    return { type: "repo_followup", intent: "runbook", query: normalizedText };
  }

  return { type: "unknown", commandName };
}

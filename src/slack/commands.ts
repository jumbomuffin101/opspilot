export type ParsedOpsPilotCommand =
  | { type: "investigate"; issueText: string }
  | { type: "repo_audit"; query: string }
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

  return { type: "unknown", commandName };
}

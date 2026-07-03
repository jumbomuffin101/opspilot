export type ParsedOpsPilotCommand =
  | { type: "investigate"; issueText: string }
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

  return { type: "unknown", commandName };
}

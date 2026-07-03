export interface SlackSearchQuery {
  query: string;
  channelIds?: readonly string[];
  oldestTimestamp?: string;
}

export interface SlackSearchResult {
  channelId: string;
  timestamp: string;
  text: string;
  permalink?: string;
}

/** Contract for the future Slack search adapter. No Slack API calls are made yet. */
export interface SlackSearchService {
  search(query: SlackSearchQuery): Promise<readonly SlackSearchResult[]>;
}

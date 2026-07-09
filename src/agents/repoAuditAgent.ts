import { RepoAuditTool } from "@/src/tools/repoAuditTool";
import type { RepoAuditResult } from "@/src/types/tools";

export interface RepoAuditOptions {
  teamId?: string;
}

const repoAuditTool = new RepoAuditTool();

export async function auditRepository(
  requestText: string,
  options: RepoAuditOptions = {},
): Promise<RepoAuditResult> {
  return repoAuditTool.execute({
    issue: requestText || "repository health audit",
    teamId: options.teamId,
  });
}

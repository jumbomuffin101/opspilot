export type DeploymentProvider = "mock" | "vercel" | "render" | "github_actions";

export type ServicePathMapping = Record<string, string[]>;

const DEPLOYMENT_PROVIDERS = new Set<DeploymentProvider>([
  "mock",
  "vercel",
  "render",
  "github_actions",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeServicePaths(value: unknown): ServicePathMapping | null {
  if (!isRecord(value)) return null;

  const normalized: ServicePathMapping = {};
  for (const [service, paths] of Object.entries(value)) {
    if (typeof service !== "string" || service.trim().length === 0) return null;
    if (!Array.isArray(paths) || !paths.every((path) => typeof path === "string")) {
      return null;
    }

    normalized[service.trim()] = paths
      .map((path) => path.trim())
      .filter((path) => path.length > 0);
  }

  return normalized;
}

export function normalizeDeploymentProvider(value: string): DeploymentProvider | null {
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return DEPLOYMENT_PROVIDERS.has(normalized as DeploymentProvider)
    ? (normalized as DeploymentProvider)
    : null;
}

import { mockDeployments } from "@/src/data/mockDeployments";
import type { DeploymentRecord } from "@/src/types/github";

export interface DeploymentToolInput {
  service?: string;
  environment?: string;
}

export function listMockDeployments(input: DeploymentToolInput = {}): DeploymentRecord[] {
  return mockDeployments.filter((deployment) => {
    const matchesService = !input.service || deployment.repository.name === input.service;
    const matchesEnvironment = !input.environment || deployment.environment === input.environment;
    return matchesService && matchesEnvironment;
  });
}

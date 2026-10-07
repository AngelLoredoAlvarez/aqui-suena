import { appName } from "@aqui/config";

export const placeholderMessage = "UI placeholder";

export function greeting(): string {
  return `Hello from ${appName} UI placeholder`;
}

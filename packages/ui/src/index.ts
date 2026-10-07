import { appName } from "@aqui/config";

export const placeholderMessage = "UI placeholder";

export function greeting(): string {
  return `Hello from ${appName} UI placeholder`;
}

export { UiProvider } from "./provider";
export { SharedButton } from "./shared-button";

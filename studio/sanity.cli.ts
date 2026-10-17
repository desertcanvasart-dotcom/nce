import { defineCliConfig } from "sanity/cli";
import { dataset, projectId } from "./env";

export default defineCliConfig({
  api: { projectId, dataset },
  // Hosted at https://nilecruz.sanity.studio (Batch 3 brief, approved by Faris).
  studioHost: "nilecruz",
  deployment: { autoUpdates: true },
});

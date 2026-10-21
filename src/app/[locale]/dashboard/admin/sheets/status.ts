export const SHEET_STATUS: Record<string, { tone: "neutral" | "accent" | "success" | "danger"; text: string }> = {
  received: { tone: "accent", text: "Reading" },
  unknown_sender: { tone: "danger", text: "Choose the operator" },
  preview: { tone: "accent", text: "To review" },
  confirmed: { tone: "success", text: "Confirmed" },
  rejected: { tone: "neutral", text: "Rejected" },
  failed: { tone: "danger", text: "Couldn't read" },
};

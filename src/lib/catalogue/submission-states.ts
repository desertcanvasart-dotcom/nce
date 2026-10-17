/** DASH-ADM-036: the submission states and who may move them where (mirrors app.submission_transition). */
export type SubmissionStatus = "draft" | "submitted" | "changes_requested" | "approved" | "rejected";

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Private draft",
  submitted: "Submitted for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
};

export function operatorCan(status: SubmissionStatus) {
  const open = status === "draft" || status === "changes_requested";
  return { edit: open, submit: open, delete: status === "draft" };
}

export function adminCan(status: SubmissionStatus) {
  const review = status === "submitted";
  return { approve: review, requestChanges: review, reject: review };
}

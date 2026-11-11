export function discoveryCompleted(before: string, after: string) {
  return before === "discovery" && ["architect_review", "customer_validation", "proposal", "baselined"].includes(after);
}
export function proposalCreated(before: string, after: string) {
  return before !== "proposal" && after === "proposal";
}
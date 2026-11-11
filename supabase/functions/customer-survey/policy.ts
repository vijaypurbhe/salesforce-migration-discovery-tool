export function surveyIsOpen(s: { revoked_at: string | null; submitted_at: string | null; expires_at: string }, now = Date.now()) {
  return !s.revoked_at && !s.submitted_at && Date.parse(s.expires_at) > now;
}
export function allowedSurveyQuestion(id: string, ids: string[]) {
  return ids.includes(id) && !["B07", "T08"].includes(id);
}
import { z } from "zod";

const item = z.object({ title: z.string(), detail: z.string(), source: z.string() });
export const aiResultSchema = z.object({
  summary: z.string(), themes: z.array(item),
  risks: z.array(item.extend({ severity: z.enum(["high", "medium", "low"]), mitigation: z.string() })),
  recommendations: z.array(item.extend({ priority: z.enum(["now", "next", "later"]), owner: z.string(), success_criterion: z.string() })),
  unknowns: z.array(z.string()),
});
export type AiResult = z.infer<typeof aiResultSchema>;
export interface AiReview { id: string; notes: string; result: AiResult | null; approved: boolean; model: string | null; created_at: string }
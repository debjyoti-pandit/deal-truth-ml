import { z } from 'zod';

const unitScore = z.coerce.number().transform((value) => Math.min(1, Math.max(0, value)));

export const scoredLabelSchema = z.object({
  id: z.string().min(1),
  score: unitScore,
});

export const classifyItemSchema = z.object({
  id: z.string(),
  labels: z.array(scoredLabelSchema),
});

export const classifyResponseSchema = z.object({
  items: z.array(classifyItemSchema),
});

export const emotionBlockSchema = z.object({
  label: z.string().min(1),
  score: unitScore,
});

export const emotionItemSchema = z.object({
  id: z.string(),
  emotion: z.array(emotionBlockSchema),
  buying_intent: z.array(emotionBlockSchema),
  deal_signals: z.array(emotionBlockSchema),
});

export const emotionResponseSchema = z.object({
  items: z.array(emotionItemSchema),
});

export const candidateInsightSchema = z.object({
  type: z.string(),
  summary: z.string(),
  segment_ids: z.array(z.union([z.string(), z.number()])),
  speaker_role: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const candidatesSchema = z.object({
  pains: z.array(candidateInsightSchema).default([]),
  blockers: z.array(candidateInsightSchema).default([]),
  commitments: z.array(candidateInsightSchema).default([]),
  competitors: z.array(candidateInsightSchema).default([]),
  signals: z.array(candidateInsightSchema).default([]),
  objections: z.array(candidateInsightSchema).default([]),
  reality_checks: z.array(candidateInsightSchema).default([]),
});

export const judgedInsightSchema = z.object({
  summary: z.string(),
  segment_ids: z.array(z.union([z.string(), z.number()])),
  severity: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  supported: z.boolean().optional(),
});

export const analyzeCallSchema = z.object({
  customer_truth: z.array(judgedInsightSchema).default([]),
  objections: z.array(judgedInsightSchema).default([]),
  commitments: z.array(judgedInsightSchema).default([]),
  risks: z.array(judgedInsightSchema).default([]),
  competitors: z.array(judgedInsightSchema).default([]),
  buying_signals: z.array(judgedInsightSchema).default([]),
  reality_checks: z.array(judgedInsightSchema).default([]),
});

export type ClassifyResponse = z.infer<typeof classifyResponseSchema>;
export type EmotionResponse = z.infer<typeof emotionResponseSchema>;
export type Candidates = z.infer<typeof candidatesSchema>;
export type AnalyzeCall = z.infer<typeof analyzeCallSchema>;

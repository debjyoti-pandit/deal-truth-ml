export const SALES_EMOTIONS = [
  'enthusiastic',
  'interested',
  'curious',
  'neutral',
  'uncertain',
  'hesitant',
  'concerned',
  'frustrated',
  'skeptical',
  'rejecting',
] as const;

export const BUYING_INTENT = [
  'strong_positive',
  'positive',
  'neutral',
  'weak',
  'negative',
] as const;

export const DEAL_SIGNALS = [
  'pricing_blocker',
  'security_blocker',
  'budget_blocker',
  'competitor_active',
  'timeline_present',
  'next_step_committed',
] as const;

export type SalesEmotion = (typeof SALES_EMOTIONS)[number];
export type BuyingIntent = (typeof BUYING_INTENT)[number];
export type DealSignal = (typeof DEAL_SIGNALS)[number];

export type LabelCategory = 'signal' | 'objection' | 'commitment' | 'qualification' | 'risk';

export interface SalesLabel {
  id: string;
  display_name: string;
  hypothesis: string;
  category: LabelCategory;
  threshold: number;
}

export const SALES_LABELS: SalesLabel[] = [
  {
    id: 'pain_point',
    display_name: 'Pain point',
    hypothesis:
      'The speaker describes a business problem, inefficiency, or pain the product could address.',
    category: 'signal',
    threshold: 0.55,
  },
  {
    id: 'positive_buying_signal',
    display_name: 'Positive buying signal',
    hypothesis:
      'The speaker expresses commercial interest, willingness to proceed, or desire to buy.',
    category: 'signal',
    threshold: 0.6,
  },
  {
    id: 'negative_buying_signal',
    display_name: 'Negative buying signal',
    hypothesis: 'The speaker expresses reluctance, low interest, or reasons not to buy.',
    category: 'signal',
    threshold: 0.6,
  },
  {
    id: 'pricing_objection',
    display_name: 'Pricing objection',
    hypothesis:
      'The speaker is objecting to or expressing concern about price, cost, budget, or commercial terms.',
    category: 'objection',
    threshold: 0.72,
  },
  {
    id: 'security_blocker',
    display_name: 'Security blocker',
    hypothesis:
      'The speaker says security, compliance, legal, or vendor-review approval blocks progress.',
    category: 'risk',
    threshold: 0.7,
  },
  {
    id: 'technical_blocker',
    display_name: 'Technical blocker',
    hypothesis:
      'The speaker says a technical limitation, integration gap, or architecture issue blocks progress.',
    category: 'risk',
    threshold: 0.7,
  },
  {
    id: 'budget_blocker',
    display_name: 'Budget blocker',
    hypothesis:
      'The speaker says budget is frozen, unavailable, unapproved, or insufficient to buy.',
    category: 'risk',
    threshold: 0.7,
  },
  {
    id: 'timing_blocker',
    display_name: 'Timing blocker',
    hypothesis:
      'The speaker says timing, quarter close, or calendar constraints block a purchase now.',
    category: 'risk',
    threshold: 0.65,
  },
  {
    id: 'competitor_mention',
    display_name: 'Competitor mention',
    hypothesis: 'The speaker mentions another vendor, product, or alternative being evaluated.',
    category: 'qualification',
    threshold: 0.6,
  },
  {
    id: 'competitor_preference',
    display_name: 'Competitor preference',
    hypothesis: 'The speaker prefers or leans toward a competing vendor or product.',
    category: 'qualification',
    threshold: 0.65,
  },
  {
    id: 'decision_maker_identified',
    display_name: 'Decision maker identified',
    hypothesis: 'The speaker identifies who will make or influence the purchase decision.',
    category: 'qualification',
    threshold: 0.6,
  },
  {
    id: 'economic_buyer_identified',
    display_name: 'Economic buyer identified',
    hypothesis: 'The speaker identifies who owns budget or can authorize spend.',
    category: 'qualification',
    threshold: 0.6,
  },
  {
    id: 'purchase_timeline',
    display_name: 'Purchase timeline',
    hypothesis: 'The speaker states when they intend to buy, decide, or complete evaluation.',
    category: 'qualification',
    threshold: 0.6,
  },
  {
    id: 'next_meeting_commitment',
    display_name: 'Next meeting commitment',
    hypothesis: 'The speaker explicitly agrees to a next meeting, demo, or follow-up call.',
    category: 'commitment',
    threshold: 0.7,
  },
  {
    id: 'customer_commitment',
    display_name: 'Customer commitment',
    hypothesis: 'The customer commits to a concrete action, introduction, or deliverable.',
    category: 'commitment',
    threshold: 0.7,
  },
  {
    id: 'seller_commitment',
    display_name: 'Seller commitment',
    hypothesis: 'The seller commits to send materials, schedule work, or complete an action.',
    category: 'commitment',
    threshold: 0.65,
  },
  {
    id: 'feature_requirement',
    display_name: 'Feature requirement',
    hypothesis: 'The speaker states a product capability they require to proceed.',
    category: 'qualification',
    threshold: 0.55,
  },
  {
    id: 'integration_requirement',
    display_name: 'Integration requirement',
    hypothesis: 'The speaker requires integration with a named system, API, or workflow.',
    category: 'qualification',
    threshold: 0.6,
  },
  {
    id: 'customer_question',
    display_name: 'Customer question',
    hypothesis: 'The customer is asking a clarifying or evaluative question.',
    category: 'signal',
    threshold: 0.5,
  },
  {
    id: 'customer_concern',
    display_name: 'Customer concern',
    hypothesis: 'The customer expresses worry, risk, or doubt about adopting the product.',
    category: 'objection',
    threshold: 0.55,
  },
  {
    id: 'customer_praise',
    display_name: 'Customer praise',
    hypothesis:
      'The customer praises the product, demo, or team without necessarily committing to buy.',
    category: 'signal',
    threshold: 0.55,
  },
  {
    id: 'out_of_scope_request',
    display_name: 'Out of scope request',
    hypothesis: 'The speaker asks for something outside the current product or proposed scope.',
    category: 'qualification',
    threshold: 0.6,
  },
  {
    id: 'explicit_rejection',
    display_name: 'Explicit rejection',
    hypothesis: 'The speaker explicitly declines the product, proposal, or next step.',
    category: 'risk',
    threshold: 0.75,
  },
  {
    id: 'clarification_needed',
    display_name: 'Clarification needed',
    hypothesis: 'The speaker says they need more information before they can decide.',
    category: 'qualification',
    threshold: 0.55,
  },
];

export function salesLabelById(id: string): SalesLabel | undefined {
  return SALES_LABELS.find((label) => label.id === id);
}

export function defaultCandidateLabels(): { id: string; hypothesis: string; threshold: number }[] {
  return SALES_LABELS.map((label) => ({
    id: label.id,
    hypothesis: label.hypothesis,
    threshold: label.threshold,
  }));
}

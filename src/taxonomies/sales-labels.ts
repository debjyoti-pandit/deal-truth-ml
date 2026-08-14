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

/**
 * The eight buying-intent dimensions the UI renders as the proof ring.
 *
 * The ring is a claim about evidence, so every segment of it has to be traceable to a label
 * that was actually scored. Anything the 24 labels cannot reach is a dimension the API would
 * have to guess at, and a guessed segment renders identically to a proven one.
 */
export const DIMENSIONS = [
  'pain_identified',
  'business_impact_identified',
  'decision_maker_identified',
  'economic_buyer_identified',
  'timeline_identified',
  'next_meeting_committed',
  'competitor_active',
  'blocker_active',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

/**
 * Every label maps to exactly one dimension, or to `null` for informational-only labels.
 *
 * `null` is a decision, not an omission: those labels are real classifier output that simply
 * is not evidence for any of the eight. Folding them in to look thorough is how a ring starts
 * showing progress that never happened.
 */
const LABEL_DIMENSIONS = {
  // --- Pain and impact -------------------------------------------------------------------
  pain_point: 'pain_identified',
  // The taxonomy has no dedicated impact label (see docs/MODELS.md — this is the known gap).
  // A customer concern is the closest thing to a stated consequence of the current state or
  // of the change, so it carries this dimension until a `business_impact` label exists.
  customer_concern: 'business_impact_identified',

  // --- Qualification ---------------------------------------------------------------------
  decision_maker_identified: 'decision_maker_identified',
  economic_buyer_identified: 'economic_buyer_identified',
  purchase_timeline: 'timeline_identified',

  // --- Commitment ------------------------------------------------------------------------
  next_meeting_commitment: 'next_meeting_committed',
  // A commitment to send a deck or make an introduction is a real commitment but not a booked
  // next meeting. Mapping it here would light the ring segment for a meeting nobody agreed to.
  customer_commitment: null,
  seller_commitment: null,

  // --- Competitors -----------------------------------------------------------------------
  competitor_mention: 'competitor_active',
  competitor_preference: 'competitor_active',

  // --- Blockers --------------------------------------------------------------------------
  // One dimension, several causes: the ring says whether something is blocking, and the
  // contributing label says what. `timing_blocker` belongs here and not under
  // `timeline_identified` — "we can't do this before Q3" is an obstacle, not a stated plan.
  pricing_objection: 'blocker_active',
  security_blocker: 'blocker_active',
  technical_blocker: 'blocker_active',
  budget_blocker: 'blocker_active',
  timing_blocker: 'blocker_active',
  explicit_rejection: 'blocker_active',

  // --- Informational only ----------------------------------------------------------------
  // Sentiment and intent, scored on their own axis. The three axes are never merged, and
  // promoting an intent score into an evidence dimension would merge them by the back door.
  positive_buying_signal: null,
  negative_buying_signal: null,
  customer_praise: null,
  // Requirements describe what the product must do, not how far the deal has progressed.
  feature_requirement: null,
  integration_requirement: null,
  out_of_scope_request: null,
  // Questions and information gaps are conversation texture, not proof of a dimension.
  customer_question: null,
  clarification_needed: null,
} as const satisfies Record<string, Dimension | null>;

export type SalesLabelId = keyof typeof LABEL_DIMENSIONS;

export const DIMENSION_MAP: Readonly<Record<SalesLabelId, Dimension | null>> = LABEL_DIMENSIONS;

/** The dimension a label contributes to; `null` if informational, `undefined` if unknown. */
export function dimensionForLabel(labelId: string): Dimension | null | undefined {
  return Object.prototype.hasOwnProperty.call(DIMENSION_MAP, labelId)
    ? DIMENSION_MAP[labelId as SalesLabelId]
    : undefined;
}

/** Every label that can light a given dimension. Never empty — see test/unit/dimension-map. */
export function labelsForDimension(dimension: Dimension): SalesLabelId[] {
  return (Object.keys(DIMENSION_MAP) as SalesLabelId[]).filter(
    (id) => DIMENSION_MAP[id] === dimension,
  );
}

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

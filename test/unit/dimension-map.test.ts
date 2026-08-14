import { describe, expect, it } from 'vitest';
import {
  DIMENSIONS,
  DIMENSION_MAP,
  SALES_LABELS,
  dimensionForLabel,
  labelsForDimension,
  type Dimension,
} from '../../src/taxonomies/sales-labels';

const mapped = DIMENSION_MAP as Record<string, Dimension | null>;

describe('DIMENSION_MAP covers the label catalogue', () => {
  it('has a key for every label in SALES_LABELS', () => {
    const missing = SALES_LABELS.filter(
      (label) => !Object.prototype.hasOwnProperty.call(DIMENSION_MAP, label.id),
    ).map((label) => label.id);
    expect(missing, 'labels with no dimension decision').toEqual([]);
  });

  it('has no key that is not a real label', () => {
    const ids = new Set(SALES_LABELS.map((label) => label.id));
    const orphans = Object.keys(DIMENSION_MAP).filter((id) => !ids.has(id));
    expect(orphans, 'mapped ids that no longer exist in the catalogue').toEqual([]);
    expect(Object.keys(DIMENSION_MAP)).toHaveLength(SALES_LABELS.length);
  });

  it('maps every value to null or one of DIMENSIONS', () => {
    const allowed = new Set<string>(DIMENSIONS);
    for (const [id, dimension] of Object.entries(mapped)) {
      if (dimension === null) {
        continue;
      }
      expect(allowed.has(dimension), `${id} maps to unknown dimension ${dimension}`).toBe(true);
    }
  });

  it('maps each label to exactly one dimension', () => {
    for (const label of SALES_LABELS) {
      const dimension = dimensionForLabel(label.id);
      expect(dimension, `${label.id} has no decision`).not.toBe(undefined);
      // A single value, never a list: a label that fed two dimensions would double-count one
      // utterance as two independent proofs.
      expect(dimension === null || typeof dimension === 'string').toBe(true);
    }
  });
});

describe('the eight dimensions', () => {
  it('renders exactly the eight the UI knows about', () => {
    expect([...DIMENSIONS]).toEqual([
      'pain_identified',
      'business_impact_identified',
      'decision_maker_identified',
      'economic_buyer_identified',
      'timeline_identified',
      'next_meeting_committed',
      'competitor_active',
      'blocker_active',
    ]);
    expect(new Set(DIMENSIONS).size).toBe(DIMENSIONS.length);
  });

  it('gives every dimension at least one contributing label', () => {
    const starved = DIMENSIONS.filter((dimension) => labelsForDimension(dimension).length === 0);
    expect(starved, 'dimensions the classifier can never light').toEqual([]);
    for (const dimension of DIMENSIONS) {
      const contributors = Object.entries(mapped)
        .filter(([, value]) => value === dimension)
        .map(([id]) => id);
      expect(contributors.length, `${dimension} has no contributing label`).toBeGreaterThanOrEqual(
        1,
      );
      expect(labelsForDimension(dimension).sort()).toEqual(contributors.sort());
    }
  });

  it('keeps informational labels out of the ring', () => {
    // Intent lives on its own axis. Promoting an intent score into an evidence dimension
    // would merge two axes that are scored independently on purpose.
    expect(dimensionForLabel('positive_buying_signal')).toBeNull();
    expect(dimensionForLabel('negative_buying_signal')).toBeNull();
    // A commitment to send something is not a booked next meeting.
    expect(dimensionForLabel('customer_commitment')).toBeNull();
    expect(dimensionForLabel('seller_commitment')).toBeNull();
    expect(dimensionForLabel('next_meeting_commitment')).toBe('next_meeting_committed');
  });

  it('reports an unknown label as undefined, not as informational', () => {
    // `null` means "scored, contributes to nothing". `undefined` means "not in the catalogue".
    // Collapsing the two would let a typo'd label id silently look like a deliberate decision.
    expect(dimensionForLabel('not_a_label')).toBeUndefined();
    expect(dimensionForLabel('customer_question')).toBeNull();
  });

  it('routes blockers to blocker_active and plans to timeline_identified', () => {
    expect(labelsForDimension('blocker_active')).toEqual(
      expect.arrayContaining([
        'security_blocker',
        'technical_blocker',
        'budget_blocker',
        'timing_blocker',
        'pricing_objection',
        'explicit_rejection',
      ]),
    );
    // "We can't before Q3" is an obstacle; "we'll decide in Q3" is a timeline. They are
    // different dimensions and must not collapse into one.
    expect(dimensionForLabel('timing_blocker')).toBe('blocker_active');
    expect(dimensionForLabel('purchase_timeline')).toBe('timeline_identified');
  });
});

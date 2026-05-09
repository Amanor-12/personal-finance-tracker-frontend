export const TIER_ORDER = {
  free: 0,
  plus: 1,
  pro: 2,
};

export const normalizeTier = (tier) => {
  if (tier === 'plus' || tier === 'pro') {
    return tier;
  }

  return 'free';
};

export const hasTierAccess = (currentTier, requiredTier) =>
  TIER_ORDER[normalizeTier(currentTier)] >= TIER_ORDER[normalizeTier(requiredTier)];

export const isPlusTier = (tier) => hasTierAccess(tier, 'plus');

export const isProTier = (tier) => normalizeTier(tier) === 'pro';

export const getTierLabel = (tier) => {
  const normalizedTier = normalizeTier(tier);

  if (normalizedTier === 'pro') {
    return 'Pro';
  }

  if (normalizedTier === 'plus') {
    return 'Plus';
  }

  return 'Free';
};


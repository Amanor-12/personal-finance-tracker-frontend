const billingService = require('../services/billing.service');
const AppError = require('../utils/AppError');

const resourceLabels = {
  accounts: 'active accounts',
  budgets: 'budgets',
  goals: 'goals',
};

const requireBillingFeature = (featureKey, featureLabel) => {
  return async (req, res, next) => {
    try {
      const access = await billingService.getBillingAccess(req.user.id);

      if (access.featureAccess?.[featureKey]) {
        req.billingAccess = access;
        return next();
      }

      return next(
        new AppError(`Rivo Plus or Pro is required to access ${featureLabel}.`, 403, {
          code: 'feature_locked',
          currentPlanId: access.currentPlanId,
          feature: featureKey,
          upgradePlanId: access.upgradePlanId,
        })
      );
    } catch (error) {
      return next(error);
    }
  };
};

const enforcePlanLimit = (resourceKey) => {
  return async (req, res, next) => {
    try {
      const access = await billingService.getBillingAccess(req.user.id);
      const limit = access.limits?.[resourceKey];
      const usage = access.usage?.[resourceKey] || 0;

      req.billingAccess = access;

      if (limit === null || limit === undefined || usage < limit) {
        return next();
      }

      return next(
        new AppError(
          `You have reached the ${resourceLabels[resourceKey] || resourceKey} limit on the free plan.`,
          403,
          {
            code: 'plan_limit_reached',
            currentPlanId: access.currentPlanId,
            limit,
            resource: resourceKey,
            upgradePlanId: access.upgradePlanId,
            usage,
          }
        )
      );
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = {
  enforcePlanLimit,
  requireBillingFeature,
};

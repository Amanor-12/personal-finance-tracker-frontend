import { apiClient } from './apiClient';

const AI_NOT_CONFIGURED_MESSAGE = 'The AI service is not configured on the backend yet.';

const normalizeAction = (action, index) => {
  if (typeof action === 'string') {
    return {
      body: action,
      id: `action-${index}`,
      title: `Action ${index + 1}`,
    };
  }

  return {
    body: action?.body || action?.description || action?.message || '',
    id: action?.id || `action-${index}`,
    title: action?.title || action?.label || `Action ${index + 1}`,
  };
};

const normalizeBriefing = (payload) => {
  const source =
    payload?.briefing ||
    payload?.summary ||
    payload?.report ||
    payload?.result ||
    payload?.data ||
    payload ||
    {};
  const rawActions = source.actions || source.followUps || source.follow_ups || source.nextSteps || [];

  return {
    actions: Array.isArray(rawActions) ? rawActions.map((action, index) => normalizeAction(action, index)).filter((action) => action.body) : [],
    body:
      source.body ||
      source.summary ||
      source.narrative ||
      source.message ||
      source.description ||
      '',
    headline:
      source.headline ||
      source.title ||
      source.label ||
      'AI finance briefing',
    meta: payload?.meta || payload?.metadata || source.meta || {},
  };
};

const normalizeSuggestion = (suggestion, index) => ({
  confidence: suggestion?.confidence === null || suggestion?.confidence === undefined
    ? null
    : Number(suggestion.confidence),
  categoryName:
    suggestion?.categoryName ||
    suggestion?.category_name ||
    suggestion?.suggestedCategory ||
    suggestion?.suggested_category ||
    '',
  categoryType:
    suggestion?.categoryType ||
    suggestion?.category_type ||
    suggestion?.type ||
    '',
  reason:
    suggestion?.reason ||
    suggestion?.rationale ||
    suggestion?.explanation ||
    suggestion?.body ||
    '',
  source: suggestion?.source || suggestion?.provider || '',
  transactionId: (() => {
    const value =
      suggestion?.transactionId ||
      suggestion?.transaction_id ||
      suggestion?.id ||
      `suggestion-${index}`;

    return Number.isFinite(Number(value)) ? Number(value) : value;
  })(),
});

export const aiStore = {
  async getReportBriefing(range = {}) {
    const payload = await apiClient.post(
      '/api/ai/reports/summary',
      {
        end_date: range.endDate || null,
        start_date: range.startDate || null,
      },
      {
        notFoundMessage: AI_NOT_CONFIGURED_MESSAGE,
      }
    );

    return normalizeBriefing(payload);
  },

  async getTransactionSuggestions(transactions = []) {
    const payload = await apiClient.post(
      '/api/ai/transactions/suggestions',
      {
        transactions: transactions.map((transaction) => ({
          account_name: transaction.accountName || '',
          amount: Number(transaction.amount) || 0,
          category_name: transaction.categoryName || '',
          description: transaction.description || '',
          id: transaction.id,
          notes: transaction.notes || '',
          transaction_date: transaction.transactionDate || '',
          type: transaction.type,
        })),
      },
      {
        notFoundMessage: AI_NOT_CONFIGURED_MESSAGE,
      }
    );

    const rawSuggestions =
      payload?.suggestions ||
      payload?.result?.suggestions ||
      payload?.data?.suggestions ||
      payload?.matches ||
      [];

    if (!Array.isArray(rawSuggestions)) {
      return [];
    }

    return rawSuggestions.map((suggestion, index) => normalizeSuggestion(suggestion, index));
  },

  async getGoalGuidance(goalId = null) {
    const payload = await apiClient.post(
      '/api/ai/goals/guidance',
      goalId ? { goal_id: goalId } : {},
      {
        notFoundMessage: AI_NOT_CONFIGURED_MESSAGE,
      }
    );

    const guidance = normalizeBriefing(payload?.guidance || payload);

    return {
      ...guidance,
      meta: payload?.meta || guidance.meta || {},
    };
  },
};

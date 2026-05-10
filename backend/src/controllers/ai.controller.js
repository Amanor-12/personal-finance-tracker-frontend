const aiService = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');

const getReportBriefing = asyncHandler(async (req, res) => {
  const result = await aiService.getReportBriefing(req.user.id, req.body || {});

  res.json(result);
});

const getTransactionSuggestions = asyncHandler(async (req, res) => {
  const result = await aiService.getTransactionSuggestions(req.user.id, req.body || {});

  res.json({
    ...result,
    suggestions: (result.suggestions || []).map((suggestion) => ({
      category_name: suggestion.categoryName,
      category_type: suggestion.categoryType,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
      source: suggestion.source || null,
      transaction_id: suggestion.transactionId,
    })),
  });
});

const getGoalGuidance = asyncHandler(async (req, res) => {
  const result = await aiService.getGoalGuidance(req.user.id, req.body || {});

  res.json(result);
});

module.exports = {
  getGoalGuidance,
  getReportBriefing,
  getTransactionSuggestions,
};

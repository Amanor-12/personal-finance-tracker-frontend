const crypto = require('crypto');

const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { getCategories } = require('./category.service');
const { getGoalById, getGoals } = require('./goal.service');
const reportsService = require('./reports.service');

const MAX_TRANSACTION_SUGGESTIONS = 50;
const AI_PROMPT_VERSION = 'rivo-ai-quality-v2-2026-05-10';
const DEFAULT_OPENAI_MODEL = 'gpt-5.5';
const DEFAULT_OPENAI_REASONING_EFFORT = 'high';
const DEFAULT_OPENAI_MAX_OUTPUT_TOKENS = 1400;
const MIN_PROVIDER_BRIEFING_SCORE = 0.58;
const MIN_FINAL_BRIEFING_SCORE = 0.74;
const MIN_PROVIDER_SUGGESTION_CONFIDENCE = 0.55;
const MIN_HEURISTIC_SUGGESTION_CONFIDENCE = 0.5;
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);
const CATEGORY_INTENTS = {
  expense: [
    {
      aliases: ['rent', 'mortgage', 'utilities', 'housing', 'home', 'electric', 'water', 'internet'],
      key: 'housing',
      keywords: ['apartment', 'bill', 'comcast', 'electric', 'gas bill', 'hoa', 'internet', 'landlord', 'mortgage', 'property', 'rent', 'utility', 'utilities', 'verizon', 'water'],
    },
    {
      aliases: ['groceries', 'grocery', 'food'],
      key: 'groceries',
      keywords: ['aldi', 'costco', 'food', 'grocery', 'instacart', 'kroger', 'market', 'safeway', 'supermarket', 'trader joe', 'walmart', 'whole foods'],
    },
    {
      aliases: ['transport', 'transportation', 'travel', 'commute'],
      key: 'transport',
      keywords: ['bus', 'chevron', 'commute', 'esso', 'fuel', 'gas', 'gasoline', 'lyft', 'metro', 'parking', 'petro', 'shell', 'taxi', 'toll', 'train', 'transit', 'uber'],
    },
    {
      aliases: ['savings', 'saving', 'investments', 'investment'],
      key: 'savings',
      keywords: ['brokerage', 'emergency fund', 'investment', 'ira', 'roth', 'savings', 'transfer'],
    },
    {
      aliases: ['dining', 'restaurants', 'restaurant', 'coffee', 'cafes', 'food'],
      key: 'dining',
      keywords: ['cafe', 'coffee', 'doordash', 'dinner', 'eats', 'lunch', 'restaurant', 'starbucks', 'takeout', 'ubereats'],
    },
    {
      aliases: ['shopping', 'retail', 'general'],
      key: 'shopping',
      keywords: ['amazon', 'best buy', 'mall', 'retail', 'shop', 'shopping', 'store', 'target'],
    },
  ],
  income: [
    {
      aliases: ['salary', 'wages', 'payroll'],
      key: 'salary',
      keywords: ['adp', 'deposit', 'direct deposit', 'pay', 'paycheck', 'payroll', 'salary', 'wage'],
    },
    {
      aliases: ['freelance', 'consulting', 'business'],
      key: 'freelance',
      keywords: ['client', 'consulting', 'contract', 'freelance', 'invoice', 'payout', 'project', 'retainer', 'self employed', 'upwork'],
    },
  ],
};

let aiSchemaPromise;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeKey = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokenize = (value) =>
  normalizeKey(value)
    .split(' ')
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));

const toTokenSet = (value) => new Set(tokenize(value));

const scoreTokenOverlap = (left, right) => {
  if (!left.size || !right.size) {
    return 0;
  }

  let overlap = 0;

  left.forEach((token) => {
    if (right.has(token)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(left.size, right.size);
};

const sha256 = (value) =>
  crypto.createHash('sha256').update(String(value || '')).digest('hex');

const createActionId = (title, index = 0) => {
  const slug = normalizeKey(title).replace(/\s+/g, '-');
  return slug || `action-${index + 1}`;
};

const normalizeReasoningEffort = (value) => {
  const effort = normalizeKey(value).replace(/\s+/g, '');
  const allowedEfforts = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);

  return allowedEfforts.has(effort) ? effort : DEFAULT_OPENAI_REASONING_EFFORT;
};

const supportsReasoningEffort = (model) => /^gpt-5(?:[-.\s]|$)/i.test(String(model || ''));

const getAiConfig = () => {
  const configuredProvider = normalizeKey(
    process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'heuristic')
  );
  const provider =
    configuredProvider === 'openai' && process.env.OPENAI_API_KEY ? 'openai' : 'heuristic';

  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    configuredProvider: configuredProvider || 'heuristic',
    maxOutputTokens: Math.round(
      clamp(Number(process.env.AI_MAX_OUTPUT_TOKENS) || DEFAULT_OPENAI_MAX_OUTPUT_TOKENS, 500, 4000)
    ),
    model: normalizeWhitespace(process.env.OPENAI_MODEL || process.env.AI_MODEL || DEFAULT_OPENAI_MODEL),
    provider,
    reasoningEffort: normalizeReasoningEffort(
      process.env.OPENAI_REASONING_EFFORT || process.env.AI_REASONING_EFFORT || DEFAULT_OPENAI_REASONING_EFFORT
    ),
    timeoutMs: Math.max(3000, Number(process.env.AI_REQUEST_TIMEOUT_MS) || 25000),
  };
};

const getAiRuntimeStatus = () => {
  const config = getAiConfig();

  return {
    activeProvider: config.provider,
    configuredProvider: config.configuredProvider,
    defaultModel: DEFAULT_OPENAI_MODEL,
    model: config.provider === 'openai' ? config.model : null,
    promptVersion: AI_PROMPT_VERSION,
    qualityGates: true,
    structuredOutputs: true,
  };
};

const getUsageStats = (responsePayload = {}) => ({
  completionTokens: Number(responsePayload?.usage?.output_tokens) || null,
  promptTokens: Number(responsePayload?.usage?.input_tokens) || null,
});

const getResponseText = (payload = {}) => {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const segments = [];

  (payload.output || []).forEach((outputItem) => {
    (outputItem.content || []).forEach((contentItem) => {
      if (typeof contentItem?.text === 'string' && contentItem.text.trim()) {
        segments.push(contentItem.text.trim());
      }
    });
  });

  return segments.join('\n').trim();
};

const getResponseRefusal = (payload = {}) => {
  const refusals = [];

  (payload.output || []).forEach((outputItem) => {
    (outputItem.content || []).forEach((contentItem) => {
      if (typeof contentItem?.refusal === 'string' && contentItem.refusal.trim()) {
        refusals.push(contentItem.refusal.trim());
      }
    });
  });

  return refusals.join(' ').trim();
};

const ensureAiSchema = async () => {
  if (!aiSchemaPromise) {
    aiSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_request_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
          feature_key VARCHAR(80) NOT NULL,
          provider VARCHAR(40) NOT NULL,
          model VARCHAR(120),
          request_hash VARCHAR(64),
          used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
          latency_ms INTEGER,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          request_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
          response_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_ai_request_logs_user_feature_created
        ON ai_request_logs (user_id, feature_key, created_at DESC)
      `);
    })().catch((error) => {
      aiSchemaPromise = null;
      throw error;
    });
  }

  await aiSchemaPromise;
};

const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    currency: String(currency || 'USD').toUpperCase(),
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(Number(amount || 0));

const getUserCurrency = async (userId) => {
  const result = await pool.query(
    `
      SELECT currency
      FROM user_preferences
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0]?.currency || 'USD';
};

const summarizeReportSnapshot = (overview) => ({
  activeRecurringCount: overview?.metadata?.activeRecurringCount || 0,
  completedGoals: overview?.metadata?.completedGoals || 0,
  endDate: overview?.dateRange?.endDate || null,
  expenses: Number(overview?.summary?.expenses) || 0,
  income: Number(overview?.summary?.income) || 0,
  net: Number(overview?.summary?.net) || 0,
  overspentBudgets: overview?.metadata?.overspentBudgets || 0,
  savingsRate: Number(overview?.summary?.savingsRate) || 0,
  startDate: overview?.dateRange?.startDate || null,
  topCategories: (overview?.topCategories || []).slice(0, 3).map((category) => ({
    amount: Number(category.amount) || 0,
    category: category.category,
    share: Number(category.share) || 0,
  })),
  topMerchants: (overview?.topMerchants || []).slice(0, 3).map((merchant) => ({
    amount: Number(merchant.amount) || 0,
    count: Number(merchant.count) || 0,
    merchant: merchant.merchant,
  })),
  transactionCount: Number(overview?.summary?.transactionCount) || 0,
});

const normalizeBriefing = (briefing = {}) => ({
  actions: Array.isArray(briefing.actions)
    ? briefing.actions
        .map((action, index) => ({
          body: normalizeWhitespace(action?.body),
          id: normalizeWhitespace(action?.id) || createActionId(action?.title, index),
          title: normalizeWhitespace(action?.title) || `Action ${index + 1}`,
        }))
        .filter((action) => action.body)
        .slice(0, 4)
    : [],
  body: normalizeWhitespace(briefing.body).slice(0, 700),
  headline: normalizeWhitespace(briefing.headline).slice(0, 160) || 'AI finance briefing',
});

const getBriefingText = (briefing) =>
  [briefing?.headline, briefing?.body, ...(briefing?.actions || []).flatMap((action) => [action.title, action.body])]
    .filter(Boolean)
    .join(' ');

const hasUnsupportedFinancialAdvice = (text) =>
  [
    /\b(buy|sell|hold)\s+(stocks?|bonds?|crypto|etfs?|funds?|securities)\b/i,
    /\bguaranteed?\s+(return|profit|gain|outcome|approval)\b/i,
    /\b(tax|legal)\s+advice\b/i,
  ].some((pattern) => pattern.test(text));

const dedupeBriefingActions = (actions) => {
  const seen = new Set();

  return actions
    .filter((action) => action?.body)
    .filter((action) => {
      const key = normalizeKey(action.id || action.title || action.body);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 4);
};

const mergeBriefings = (providerBriefing, fallbackBriefing) => {
  const normalizedProvider = normalizeBriefing(providerBriefing);
  const normalizedFallback = normalizeBriefing(fallbackBriefing);

  return normalizeBriefing({
    actions: dedupeBriefingActions([
      ...normalizedProvider.actions,
      ...normalizedFallback.actions,
    ]),
    body: normalizedProvider.body || normalizedFallback.body,
    headline:
      normalizedProvider.headline && normalizedProvider.headline !== 'AI finance briefing'
        ? normalizedProvider.headline
        : normalizedFallback.headline,
  });
};

const evaluateBriefingQuality = ({ briefing, hasData, minimumActions = 1 }) => {
  const normalized = normalizeBriefing(briefing);
  const text = getBriefingText(normalized);
  const checks = {
    actionCoverage: normalized.actions.length >= minimumActions,
    groundedNumbers: !hasData || /(?:\d|[$%])/.test(text),
    hasBody: normalized.body.length >= (hasData ? 90 : 50),
    hasHeadline: normalized.headline.length >= 12 && normalized.headline !== 'AI finance briefing',
    safeAdvice: !hasUnsupportedFinancialAdvice(text),
  };
  const score =
    (checks.hasHeadline ? 0.18 : 0) +
    (checks.hasBody ? 0.24 : 0) +
    (checks.actionCoverage ? 0.24 : 0) +
    (checks.groundedNumbers ? 0.22 : 0) +
    (checks.safeAdvice ? 0.12 : 0);

  return {
    checks,
    score: Number(score.toFixed(2)),
  };
};

const buildHeuristicReportBriefing = ({ currency, overview }) => {
  const summary = overview.summary;
  const metadata = overview.metadata;
  const topCategory = overview.topCategories[0] || null;
  const topMerchant = overview.topMerchants[0] || null;
  const actions = [];
  let headline = 'Cash flow stayed stable in the selected range.';

  if (summary.transactionCount === 0) {
    return {
      actions: [
        {
          body: 'Add real income and expense activity before asking for a narrative read of this workspace.',
          id: 'add-activity',
          title: 'Add activity to this range',
        },
      ],
      body: 'No transactions fall inside the selected range yet, so the workspace does not have enough activity for a meaningful briefing.',
      headline: 'Not enough activity yet for a briefing.',
    };
  }

  if (summary.net < 0) {
    headline = `Expenses exceeded income by ${formatMoney(Math.abs(summary.net), currency)}.`;
  } else if (topCategory && topCategory.share >= 40) {
    headline = `${topCategory.category} is carrying ${Math.round(topCategory.share)}% of expense spend.`;
  } else if (metadata.overspentBudgets > 0) {
    headline = `${metadata.overspentBudgets} budget${metadata.overspentBudgets === 1 ? '' : 's'} are over limit right now.`;
  } else if (summary.savingsRate >= 20) {
    headline = `Cash flow stayed healthy with a ${Math.round(summary.savingsRate)}% savings rate.`;
  }

  if (summary.net < 0) {
    actions.push({
      body: `The selected window closed ${formatMoney(Math.abs(summary.net), currency)} below breakeven. Reduce variable spend or raise inflow before pressure compounds.`,
      id: 'repair-cash-flow',
      title: 'Repair cash flow first',
    });
  } else if (summary.net > 0) {
    actions.push({
      body: `${formatMoney(summary.net, currency)} remained after expenses. Route that surplus into the next goal or reserve target before it gets reabsorbed into discretionary spend.`,
      id: 'route-surplus',
      title: 'Deliberately route the surplus',
    });
  }

  if (topCategory && topCategory.share >= 30) {
    actions.push({
      body: `${topCategory.category} drove ${Math.round(topCategory.share)}% of expense activity. Review the largest line items in that category before looking elsewhere.`,
      id: 'review-top-category',
      title: `Review ${topCategory.category}`,
    });
  }

  if (metadata.overspentBudgets > 0) {
    actions.push({
      body: `${metadata.overspentBudgets} budget${metadata.overspentBudgets === 1 ? '' : 's'} are already above plan. Tighten those categories or move the limits to reflect current reality.`,
      id: 'rebalance-budgets',
      title: 'Rebalance overspent budgets',
    });
  }

  if (metadata.monthlyRecurringTotal > 0) {
    actions.push({
      body: `${formatMoney(metadata.monthlyRecurringTotal, currency)} is committed to recurring payments each month. Audit renewals and cancel anything that no longer earns its place.`,
      id: 'audit-recurring',
      title: 'Audit fixed monthly commitments',
    });
  }

  if (topMerchant && topMerchant.count >= 2) {
    actions.push({
      body: `${topMerchant.merchant} appears ${topMerchant.count} times in the range. Repeated merchant exposure is often the fastest place to find cleanup opportunities.`,
      id: 'review-merchant',
      title: `Review ${topMerchant.merchant}`,
    });
  }

  const bodyParts = [
    `${formatMoney(summary.income, currency)} came in and ${formatMoney(summary.expenses, currency)} went out across ${summary.transactionCount} transaction${summary.transactionCount === 1 ? '' : 's'}.`,
    summary.net >= 0
      ? `${formatMoney(summary.net, currency)} remained after expenses, which kept the window net positive.`
      : `${formatMoney(Math.abs(summary.net), currency)} more left the workspace than came in, which puts the current range under pressure.`,
  ];

  if (topCategory) {
    bodyParts.push(`${topCategory.category} is the largest expense category at ${Math.round(topCategory.share)}% of spend.`);
  }

  if (metadata.monthlyRecurringTotal > 0) {
    bodyParts.push(`Recurring commitments are consuming ${formatMoney(metadata.monthlyRecurringTotal, currency)} per month before flexible spending begins.`);
  }

  return {
    actions: actions.slice(0, 4),
    body: bodyParts.join(' '),
    headline,
  };
};

const normalizeCategoryRecord = (category) => ({
  id: Number(category.id),
  key: `${category.type}:${normalizeKey(category.name)}`,
  name: category.name,
  type: category.type,
});

const buildCategoryIntentMap = (categories) => {
  const entries = [];

  categories.forEach((category) => {
    const categoryName = normalizeKey(category.name);
    const intents = CATEGORY_INTENTS[category.type] || [];

    intents.forEach((intent) => {
      const aliasScore = intent.aliases.reduce((bestScore, alias) => {
        const aliasKey = normalizeKey(alias);

        if (!aliasKey) {
          return bestScore;
        }

        if (categoryName === aliasKey) {
          return 1;
        }

        if (categoryName.includes(aliasKey) || aliasKey.includes(categoryName)) {
          return Math.max(bestScore, 0.85);
        }

        const categoryTokens = toTokenSet(categoryName);
        const aliasTokens = toTokenSet(aliasKey);
        return Math.max(bestScore, scoreTokenOverlap(categoryTokens, aliasTokens));
      }, 0);

      if (aliasScore >= 0.45) {
        entries.push([`${category.type}:${intent.key}`, { category, score: aliasScore }]);
      }
    });
  });

  const intentMap = new Map();

  entries.forEach(([key, value]) => {
    const existing = intentMap.get(key);

    if (!existing || value.score > existing.score) {
      intentMap.set(key, value);
    }
  });

  return intentMap;
};

const getHistoricalCategoryExamples = async (userId, transactionType) => {
  const result = await pool.query(
    `
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.notes,
        t.transaction_date,
        a.name AS account_name,
        c.name AS category_name,
        c.type AS category_type
      FROM transactions t
      INNER JOIN categories c
        ON c.id = t.category_id
        AND c.user_id = t.user_id
      LEFT JOIN accounts a
        ON a.id = t.account_id
        AND a.user_id = t.user_id
      WHERE
        t.user_id = $1
        AND t.type = $2
        AND t.status <> 'excluded'
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT 250
    `,
    [userId, transactionType]
  );

  return result.rows.map((row) => {
    const merchant = normalizeKey(row.description);
    const text = normalizeKey([row.description, row.notes, row.account_name].filter(Boolean).join(' '));

    return {
      accountName: row.account_name || '',
      amount: Number(row.amount) || 0,
      categoryName: row.category_name,
      categoryType: row.category_type,
      id: Number(row.id),
      merchant,
      text,
      tokens: toTokenSet(text),
      transactionDate: row.transaction_date,
    };
  });
};

const buildHistorySuggestion = (transaction, historicalExamples, categoryLookup) => {
  const comparableExamples = historicalExamples.filter((example) => example.id !== Number(transaction.id));

  if (!comparableExamples.length) {
    return null;
  }

  const text = normalizeKey(
    [transaction.description, transaction.notes, transaction.account_name].filter(Boolean).join(' ')
  );
  const merchant = normalizeKey(transaction.description);
  const tokens = toTokenSet(text);
  const categoryScores = new Map();

  comparableExamples.forEach((example) => {
    const lookupKey = `${example.categoryType}:${normalizeKey(example.categoryName)}`;
    const matchingCategory = categoryLookup.get(lookupKey);

    if (!matchingCategory || matchingCategory.type !== transaction.type) {
      return;
    }

    let score = 0;
    let reason = '';

    if (text && example.text === text) {
      score = 0.99;
      reason = 'It closely matches a past transaction that already lives in this category.';
    } else if (merchant && example.merchant && merchant === example.merchant) {
      score = 0.93;
      reason = 'The merchant wording matches a past transaction already categorized this way.';
    } else {
      const overlap = scoreTokenOverlap(tokens, example.tokens);

      if (overlap >= 0.45) {
        score = 0.55 + overlap * 0.35;
        reason = 'Similar wording has historically been classified into this category.';
      }
    }

    if (!score) {
      return;
    }

    const existing = categoryScores.get(lookupKey) || {
      category: matchingCategory,
      reason,
      sampleCount: 0,
      score: 0,
    };

    existing.score = Math.max(existing.score, score);
    existing.sampleCount += 1;
    existing.reason = existing.reason || reason;
    categoryScores.set(lookupKey, existing);
  });

  const bestMatch = [...categoryScores.values()].sort((left, right) => {
    const leftScore = left.score + Math.min(0.08, Math.max(0, left.sampleCount - 1) * 0.02);
    const rightScore = right.score + Math.min(0.08, Math.max(0, right.sampleCount - 1) * 0.02);

    return rightScore - leftScore;
  })[0];

  if (!bestMatch) {
    return null;
  }

  return {
    categoryName: bestMatch.category.name,
    categoryType: bestMatch.category.type,
    confidence: clamp(
      bestMatch.score + Math.min(0.08, Math.max(0, bestMatch.sampleCount - 1) * 0.02),
      0,
      0.99
    ),
    reason:
      bestMatch.sampleCount > 1
        ? `${bestMatch.reason} ${bestMatch.sampleCount} similar transaction patterns reinforce the match.`
        : bestMatch.reason,
    source: 'history',
    transactionId: Number(transaction.id),
  };
};

const buildKeywordSuggestion = (transaction, categoryIntentMap, categoryLookup) => {
  const searchableText = normalizeKey(
    [transaction.description, transaction.notes, transaction.account_name].filter(Boolean).join(' ')
  );

  if (!searchableText) {
    return null;
  }

  const intents = CATEGORY_INTENTS[transaction.type] || [];
  const tokenSet = toTokenSet(searchableText);
  let bestMatch = null;

  intents.forEach((intent) => {
    const categoryIntent = categoryIntentMap.get(`${transaction.type}:${intent.key}`);

    if (!categoryIntent) {
      return;
    }

    const matchedKeywords = intent.keywords.filter((keyword) => searchableText.includes(normalizeKey(keyword)));
    const aliasTokens = intent.aliases.flatMap((alias) => tokenize(alias));
    const directTokenOverlap = scoreTokenOverlap(tokenSet, new Set(aliasTokens));
    const keywordScore = matchedKeywords.length
      ? clamp(0.58 + matchedKeywords.length * 0.09, 0, 0.9)
      : directTokenOverlap >= 0.45
        ? clamp(0.5 + directTokenOverlap * 0.25, 0, 0.82)
        : 0;

    if (!keywordScore) {
      return;
    }

    const candidate = categoryLookup.get(
      `${categoryIntent.category.type}:${normalizeKey(categoryIntent.category.name)}`
    );

    if (!candidate) {
      return;
    }

    const nextMatch = {
      categoryName: candidate.name,
      categoryType: candidate.type,
      confidence: clamp(keywordScore + categoryIntent.score * 0.08, 0, 0.92),
      reason: matchedKeywords.length
        ? `The wording points to ${candidate.name.toLowerCase()} activity through keywords like ${matchedKeywords.slice(0, 2).join(' and ')}.`
        : `The transaction wording aligns with the ${candidate.name.toLowerCase()} category.`,
      source: 'keywords',
      transactionId: Number(transaction.id),
    };

    if (!bestMatch || nextMatch.confidence > bestMatch.confidence) {
      bestMatch = nextMatch;
    }
  });

  return bestMatch;
};

const buildDirectNameSuggestion = (transaction, categoryLookup) => {
  const searchableText = normalizeKey(
    [transaction.description, transaction.notes, transaction.account_name].filter(Boolean).join(' ')
  );

  if (!searchableText) {
    return null;
  }

  const candidates = [...categoryLookup.values()].filter((category) => category.type === transaction.type);
  const textTokens = toTokenSet(searchableText);
  let bestMatch = null;

  candidates.forEach((category) => {
    const categoryName = normalizeKey(category.name);
    const categoryTokens = toTokenSet(categoryName);
    const overlap = scoreTokenOverlap(textTokens, categoryTokens);

    if (!overlap) {
      return;
    }

    const nextMatch = {
      categoryName: category.name,
      categoryType: category.type,
      confidence: clamp(0.45 + overlap * 0.25, 0, 0.72),
      reason: `The transaction wording directly overlaps with the ${category.name.toLowerCase()} category name.`,
      source: 'direct-name',
      transactionId: Number(transaction.id),
    };

    if (!bestMatch || nextMatch.confidence > bestMatch.confidence) {
      bestMatch = nextMatch;
    }
  });

  return bestMatch;
};

const chooseHeuristicSuggestion = ({ categoryLookup, categoryIntentMap, historicalExamples, transaction }) => {
  const suggestions = [
    buildHistorySuggestion(transaction, historicalExamples, categoryLookup),
    buildKeywordSuggestion(transaction, categoryIntentMap, categoryLookup),
    buildDirectNameSuggestion(transaction, categoryLookup),
  ].filter(Boolean);

  if (!suggestions.length) {
    return null;
  }

  suggestions.sort((left, right) => right.confidence - left.confidence);
  const bestSuggestion = suggestions[0];
  const currentCategoryKey =
    transaction.category_name && transaction.type
      ? `${transaction.type}:${normalizeKey(transaction.category_name)}`
      : '';

  if (
    currentCategoryKey &&
    currentCategoryKey === `${bestSuggestion.categoryType}:${normalizeKey(bestSuggestion.categoryName)}`
  ) {
    return null;
  }

  if (bestSuggestion.confidence < MIN_HEURISTIC_SUGGESTION_CONFIDENCE) {
    return null;
  }

  return bestSuggestion;
};

const callOpenAiStructuredOutput = async ({ config, input, schema }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = Date.now();
  const requestBody = {
    input,
    max_output_tokens: config.maxOutputTokens,
    model: config.model,
    text: {
      format: {
        name: schema.name,
        schema: schema.schema,
        strict: true,
        type: 'json_schema',
      },
    },
  };

  if (supportsReasoningEffort(config.model)) {
    requestBody.reasoning = {
      effort: config.reasoningEffort,
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/responses`, {
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(
        payload?.error?.message || 'The AI provider returned an unexpected response.',
        response.status || 502
      );
    }

    const refusal = getResponseRefusal(payload);

    if (refusal) {
      throw new AppError(`The AI provider refused the request: ${refusal}`, 502);
    }

    const outputText = getResponseText(payload);

    if (!outputText) {
      throw new AppError('The AI provider returned an empty response.', 502);
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new AppError('The AI provider returned malformed structured output.', 502);
    }

    return {
      latencyMs: Date.now() - startedAt,
      parsed,
      usage: getUsageStats(payload),
    };
  } finally {
    clearTimeout(timer);
  }
};

const recordAiRequest = async ({
  completionTokens = null,
  featureKey,
  latencyMs = null,
  model = null,
  promptTokens = null,
  provider,
  requestSummary = {},
  responseSummary = {},
  usedFallback,
  userId,
}) => {
  await ensureAiSchema();

  await pool.query(
    `
      INSERT INTO ai_request_logs (
        user_id,
        feature_key,
        provider,
        model,
        request_hash,
        used_fallback,
        latency_ms,
        prompt_tokens,
        completion_tokens,
        request_summary,
        response_summary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
    `,
    [
      userId,
      featureKey,
      provider,
      model,
      sha256(JSON.stringify(requestSummary)),
      Boolean(usedFallback),
      latencyMs,
      promptTokens,
      completionTokens,
      JSON.stringify(requestSummary || {}),
      JSON.stringify(responseSummary || {}),
    ]
  );
};

const buildReportPrompt = ({ currency, overview }) => [
  {
    content: [
      {
        text: [
          'You are Rivo\'s senior finance operations analyst for a production personal finance app.',
          'Return only JSON that satisfies the provided schema.',
          'Use only the structured workspace data. Never invent balances, dates, categories, merchants, or counts.',
          'Every numeric claim must be directly supported by the input values. If the data is thin, say that clearly instead of pretending certainty.',
          'Write for a real customer: concise, specific, operational, and calm. No legal, tax, investment, or debt product advice.',
          `Prompt version: ${AI_PROMPT_VERSION}.`,
        ].join(' '),
        type: 'input_text',
      },
    ],
    role: 'system',
  },
  {
    content: [
      {
        text: JSON.stringify(
          {
            currency,
            report: summarizeReportSnapshot(overview),
            response_rules: {
              actions_max: 4,
              body_style: '2-4 compact sentences',
              required_quality: 'Include the strongest cash-flow signal, the evidence behind it, and concrete next actions.',
              headline_style: 'One short sentence with the strongest finding',
              unsupported: ['generic motivation', 'invented advice', 'claims not visible in the input'],
            },
          },
          null,
          2
        ),
        type: 'input_text',
      },
    ],
    role: 'user',
  },
];

const reportBriefingSchema = {
  name: 'finance_report_briefing',
  schema: {
    additionalProperties: false,
    properties: {
      actions: {
        items: {
          additionalProperties: false,
          properties: {
            body: { type: 'string' },
            id: { type: 'string' },
            title: { type: 'string' },
          },
          required: ['id', 'title', 'body'],
          type: 'object',
        },
        maxItems: 4,
        type: 'array',
      },
      body: { type: 'string' },
      headline: { type: 'string' },
    },
    required: ['headline', 'body', 'actions'],
    type: 'object',
  },
};

const buildTransactionsPrompt = ({ categories, heuristicSuggestions, transactions }) => {
  const categoryOptions = categories.map((category) => ({
    name: category.name,
    type: category.type,
  }));
  const reviewRows = transactions.map((transaction) => ({
    account_name: transaction.account_name || '',
    amount: Number(transaction.amount) || 0,
    current_category_name: transaction.category_name || '',
    description: transaction.description || '',
    id: Number(transaction.id),
    notes: transaction.notes || '',
    transaction_date: transaction.transaction_date || '',
    type: transaction.type,
  }));
  const heuristicByTransaction = Object.fromEntries(
    heuristicSuggestions.map((suggestion) => [
      suggestion.transactionId,
      {
        category_name: suggestion.categoryName,
        category_type: suggestion.categoryType,
        confidence: Number(suggestion.confidence.toFixed(2)),
        reason: suggestion.reason,
      },
    ])
  );

  return [
    {
      content: [
        {
          text: [
            'You are Rivo\'s senior bookkeeping review assistant.',
            'Return only JSON that satisfies the provided schema.',
            'Choose only from the provided categories and preserve the transaction type exactly.',
            `Return a suggestion only when confidence is at least ${MIN_PROVIDER_SUGGESTION_CONFIDENCE}.`,
            'Do not return a suggestion when the current category already looks correct or when evidence is weak.',
            'Use heuristic hints as evidence, but override them only when merchant wording, notes, or history clearly support a better category.',
            'Reasons must cite the evidence in the selected transaction, not generic bookkeeping language.',
            `Prompt version: ${AI_PROMPT_VERSION}.`,
          ].join(' '),
          type: 'input_text',
        },
      ],
      role: 'system',
    },
    {
      content: [
        {
          text: JSON.stringify(
            {
              categories: categoryOptions,
              heuristic_hints: heuristicByTransaction,
              transactions: reviewRows,
            },
            null,
            2
          ),
          type: 'input_text',
        },
      ],
      role: 'user',
    },
  ];
};

const transactionSuggestionSchema = {
  name: 'transaction_category_suggestions',
  schema: {
    additionalProperties: false,
    properties: {
      suggestions: {
        items: {
          additionalProperties: false,
          properties: {
            category_name: { type: 'string' },
            category_type: { enum: ['income', 'expense'], type: 'string' },
            confidence: { maximum: 1, minimum: 0, type: 'number' },
            reason: { type: 'string' },
            transaction_id: { type: 'integer' },
          },
          required: ['transaction_id', 'category_name', 'category_type', 'confidence', 'reason'],
          type: 'object',
        },
        maxItems: MAX_TRANSACTION_SUGGESTIONS,
        type: 'array',
      },
    },
    required: ['suggestions'],
    type: 'object',
  },
};

const normalizeProviderSuggestions = ({ categoryLookup, suggestions, transactions }) => {
  const transactionIds = new Set(transactions.map((transaction) => Number(transaction.id)));
  const currentCategories = new Map(
    transactions.map((transaction) => [
      Number(transaction.id),
      transaction.category_name
        ? `${transaction.type}:${normalizeKey(transaction.category_name)}`
        : '',
    ])
  );

  return (Array.isArray(suggestions) ? suggestions : [])
    .map((suggestion) => {
      const transactionId = Number(suggestion.transaction_id);
      const key = `${suggestion.category_type}:${normalizeKey(suggestion.category_name)}`;
      const matchingCategory = categoryLookup.get(key);

      if (!transactionIds.has(transactionId) || !matchingCategory) {
        return null;
      }

      if (currentCategories.get(transactionId) === key) {
        return null;
      }

      const confidence = clamp(Number(suggestion.confidence) || 0, 0, 1);
      const reason = normalizeWhitespace(suggestion.reason);

      if (confidence < MIN_PROVIDER_SUGGESTION_CONFIDENCE || reason.length < 12) {
        return null;
      }

      return {
        categoryName: matchingCategory.name,
        categoryType: matchingCategory.type,
        confidence,
        reason,
        source: 'openai',
        transactionId,
      };
    })
    .filter(Boolean);
};

const normalizeGoal = (goal) => {
  const targetAmount = Number(goal.target_amount) || 0;
  const currentAmount = Number(goal.current_amount) || 0;
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const daysRemaining =
    goal.days_remaining === null || goal.days_remaining === undefined
      ? goal.target_date
        ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
        : null
      : Number(goal.days_remaining);
  const monthlyPace =
    goal.target_date && remainingAmount > 0
      ? remainingAmount / Math.max(1, Math.ceil(Math.max(daysRemaining || 1, 1) / 30))
      : null;

  return {
    currentAmount,
    daysRemaining,
    goalType: goal.goal_type,
    id: Number(goal.id),
    monthlyPace,
    remainingAmount,
    status: goal.status,
    targetAmount,
    targetDate: goal.target_date,
    title: goal.title,
  };
};

const buildHeuristicGoalGuidance = ({ currency, focusGoal, goals, reportOverview }) => {
  const normalizedGoals = goals.map(normalizeGoal);
  const activeGoals = normalizedGoals.filter((goal) => goal.status !== 'Completed');
  const dueSoonGoals = activeGoals.filter(
    (goal) => goal.daysRemaining !== null && goal.daysRemaining >= 0 && goal.daysRemaining <= 30
  );
  const paceFocus =
    [...activeGoals]
      .filter((goal) => goal.monthlyPace)
      .sort((left, right) => right.monthlyPace - left.monthlyPace)[0] || null;
  const largestRemaining =
    [...activeGoals].sort((left, right) => right.remainingAmount - left.remainingAmount)[0] || null;
  const summary = reportOverview.summary;
  const actions = [];
  let headline = 'Goal momentum is stable.';

  if (!normalizedGoals.length) {
    return {
      actions: [
        {
          body: 'Create a savings or payoff target before asking for milestone guidance.',
          id: 'create-goal',
          title: 'Create the first goal',
        },
      ],
      body: 'There are no goals in this workspace yet, so the milestone guidance layer does not have an active target to work from.',
      headline: 'No active goals to guide yet.',
    };
  }

  if (focusGoal && activeGoals.some((goal) => goal.id === Number(focusGoal.id))) {
    headline = `${focusGoal.title} is the current milestone to watch.`;
  } else if (dueSoonGoals.length) {
    headline = `${dueSoonGoals.length} goal${dueSoonGoals.length === 1 ? ' needs' : 's need'} attention in the next 30 days.`;
  } else if (paceFocus) {
    headline = `${paceFocus.title} needs ${formatMoney(paceFocus.monthlyPace, currency)} per month to stay on track.`;
  }

  if (dueSoonGoals.length) {
    actions.push({
      body: `${dueSoonGoals.length} target${dueSoonGoals.length === 1 ? '' : 's'} are due inside the next 30 days. Review dates, contribution pace, and whether the target still reflects reality.`,
      id: 'review-due-soon',
      title: 'Review due-soon goals',
    });
  }

  if (paceFocus) {
    actions.push({
      body: `${paceFocus.title} still needs ${formatMoney(paceFocus.remainingAmount, currency)} and benefits most from a ${formatMoney(paceFocus.monthlyPace, currency)} monthly contribution rhythm.`,
      id: 'fund-pace-focus',
      title: `Fund ${paceFocus.title}`,
    });
  }

  if (largestRemaining) {
    actions.push({
      body: `${largestRemaining.title} carries the largest remaining gap at ${formatMoney(largestRemaining.remainingAmount, currency)}. Break it into milestones instead of treating it like one monolithic target.`,
      id: 'split-largest-goal',
      title: 'Break down the largest remaining target',
    });
  }

  if (summary.net > 0) {
    actions.push({
      body: `${formatMoney(summary.net, currency)} remained after expenses in the recent reporting window. Route part of that surplus into the next goal contribution instead of waiting for month end.`,
      id: 'route-surplus-to-goals',
      title: 'Use recent surplus intentionally',
    });
  }

  return {
    actions: actions.slice(0, 4),
    body: [
      `${normalizedGoals.length} goal${normalizedGoals.length === 1 ? '' : 's'} are being tracked, with ${activeGoals.length} still active.`,
      dueSoonGoals.length
        ? `${dueSoonGoals.length} target${dueSoonGoals.length === 1 ? '' : 's'} are close enough to need active monitoring.`
        : 'No goal is immediately due, which leaves room to focus on pacing and contribution discipline.',
      summary.net > 0
        ? 'The recent reporting window stayed net positive, which gives the workspace room to fund milestones more deliberately.'
        : 'Recent cash flow is not strongly positive, so goal pacing should stay grounded in realistic surplus rather than aspiration.',
    ].join(' '),
    headline,
  };
};

const goalGuidanceSchema = {
  name: 'goal_guidance_briefing',
  schema: {
    additionalProperties: false,
    properties: {
      actions: {
        items: {
          additionalProperties: false,
          properties: {
            body: { type: 'string' },
            id: { type: 'string' },
            title: { type: 'string' },
          },
          required: ['id', 'title', 'body'],
          type: 'object',
        },
        maxItems: 4,
        type: 'array',
      },
      body: { type: 'string' },
      headline: { type: 'string' },
    },
    required: ['headline', 'body', 'actions'],
    type: 'object',
  },
};

const buildGoalsPrompt = ({ currency, focusGoal, goals, reportOverview }) => [
  {
    content: [
      {
        text: [
          'You are Rivo\'s senior milestone planning analyst for a production personal finance app.',
          'Return only JSON that satisfies the provided schema.',
          'Use only the provided goal and report snapshot data. Never invent goals, balances, target dates, or contribution amounts.',
          'Prioritize the next operational decision: what target needs attention, why, and what the customer can review next.',
          'If cash-flow evidence is weak, say that directly and avoid overconfident contribution advice.',
          'No legal, tax, investment, or credit advice.',
          `Prompt version: ${AI_PROMPT_VERSION}.`,
        ].join(' '),
        type: 'input_text',
      },
    ],
    role: 'system',
  },
  {
    content: [
      {
        text: JSON.stringify(
          {
            currency,
            focus_goal_id: focusGoal ? Number(focusGoal.id) : null,
            goals: goals.map(normalizeGoal),
            report_snapshot: summarizeReportSnapshot(reportOverview),
            response_rules: {
              actions_max: 4,
              body_style: '2-4 compact sentences',
              required_quality: 'Name the goal evidence that supports each recommendation.',
            },
          },
          null,
          2
        ),
        type: 'input_text',
      },
    ],
    role: 'user',
  },
];

const getReportBriefing = async (userId, payload = {}) => {
  const [currency, overview] = await Promise.all([
    getUserCurrency(userId),
    reportsService.getReportsOverview(userId, payload),
  ]);
  const fallbackBriefing = normalizeBriefing(buildHeuristicReportBriefing({ currency, overview }));
  const config = getAiConfig();
  let meta = {
    model: config.provider === 'openai' ? config.model : null,
    promptVersion: AI_PROMPT_VERSION,
    provider: config.provider,
    usedFallback: config.provider !== 'openai',
  };

  if (config.provider === 'openai') {
    try {
      const providerResponse = await callOpenAiStructuredOutput({
        config,
        input: buildReportPrompt({ currency, overview }),
        schema: reportBriefingSchema,
      });
      const providerBriefing = normalizeBriefing(providerResponse.parsed);
      const hasReportData = Number(overview?.summary?.transactionCount) > 0;
      const minimumActions = hasReportData ? 2 : 1;
      const providerQuality = evaluateBriefingQuality({
        briefing: providerBriefing,
        hasData: hasReportData,
        minimumActions,
      });
      const mergedBriefing =
        providerQuality.score >= MIN_PROVIDER_BRIEFING_SCORE
          ? mergeBriefings(providerBriefing, fallbackBriefing)
          : fallbackBriefing;
      const finalQuality = evaluateBriefingQuality({
        briefing: mergedBriefing,
        hasData: hasReportData,
        minimumActions,
      });
      const usedQualityFallback =
        providerQuality.score < MIN_PROVIDER_BRIEFING_SCORE ||
        finalQuality.score < MIN_FINAL_BRIEFING_SCORE;
      const briefing = usedQualityFallback ? fallbackBriefing : mergedBriefing;

      meta = {
        ...meta,
        latencyMs: providerResponse.latencyMs,
        provider: 'openai',
        quality: {
          checks: finalQuality.checks,
          finalScore: finalQuality.score,
          providerScore: providerQuality.score,
        },
        reasoningEffort: config.reasoningEffort,
        usedFallback: usedQualityFallback,
      };

      await recordAiRequest({
        completionTokens: providerResponse.usage.completionTokens,
        featureKey: 'report_briefing',
        latencyMs: providerResponse.latencyMs,
        model: config.model,
        promptTokens: providerResponse.usage.promptTokens,
        provider: 'openai',
        requestSummary: summarizeReportSnapshot(overview),
        responseSummary: {
          actionCount: briefing.actions.length,
          headline: briefing.headline,
          promptVersion: AI_PROMPT_VERSION,
          quality: meta.quality,
        },
        usedFallback: usedQualityFallback,
        userId,
      }).catch(() => null);

      return {
        briefing,
        meta,
      };
    } catch (error) {
      meta = {
        ...meta,
        error: error.message,
        provider: config.configuredProvider,
        usedFallback: true,
      };
    }
  }

  await recordAiRequest({
    featureKey: 'report_briefing',
    model: config.provider === 'openai' ? config.model : null,
    provider: config.provider === 'openai' ? config.configuredProvider : 'heuristic',
    requestSummary: summarizeReportSnapshot(overview),
    responseSummary: {
      actionCount: fallbackBriefing.actions.length,
      headline: fallbackBriefing.headline,
      promptVersion: AI_PROMPT_VERSION,
    },
    usedFallback: true,
    userId,
  }).catch(() => null);

  return {
    briefing: fallbackBriefing,
    meta,
  };
};

const validateSuggestionPayload = (payload = {}) => {
  const transactions = Array.isArray(payload.transactions) ? payload.transactions : null;

  if (!transactions) {
    throw new AppError('Transactions must be provided as an array.', 400);
  }

  if (!transactions.length) {
    throw new AppError('Select at least one transaction before asking for AI suggestions.', 400);
  }

  if (transactions.length > MAX_TRANSACTION_SUGGESTIONS) {
    throw new AppError(`AI review is limited to ${MAX_TRANSACTION_SUGGESTIONS} transactions at a time.`, 400);
  }

  return transactions.map((transaction, index) => {
    if (!Number.isInteger(Number(transaction?.id))) {
      throw new AppError(`Transaction ${index + 1} is missing a valid id.`, 400);
    }

    if (!['income', 'expense'].includes(transaction?.type)) {
      throw new AppError(`Transaction ${index + 1} must include a valid type.`, 400);
    }

    return {
      account_name: normalizeWhitespace(transaction.account_name),
      amount: Number(transaction.amount) || 0,
      category_name: normalizeWhitespace(transaction.category_name),
      description: normalizeWhitespace(transaction.description),
      id: Number(transaction.id),
      notes: normalizeWhitespace(transaction.notes),
      transaction_date: normalizeWhitespace(transaction.transaction_date),
      type: transaction.type,
    };
  });
};

const getTransactionSuggestions = async (userId, payload = {}) => {
  const transactions = validateSuggestionPayload(payload);
  const uniqueTypes = [...new Set(transactions.map((transaction) => transaction.type))];
  const [categories] = await Promise.all([getCategories(userId)]);
  const normalizedCategories = categories.map(normalizeCategoryRecord);
  const categoryLookup = new Map(normalizedCategories.map((category) => [category.key, category]));
  const categoryIntentMap = buildCategoryIntentMap(normalizedCategories);
  const historyByTypeEntries = await Promise.all(
    uniqueTypes.map(async (transactionType) => [
      transactionType,
      await getHistoricalCategoryExamples(userId, transactionType),
    ])
  );
  const historyByType = new Map(historyByTypeEntries);
  const heuristicSuggestions = transactions
    .map((transaction) =>
      chooseHeuristicSuggestion({
        categoryIntentMap,
        categoryLookup,
        historicalExamples: historyByType.get(transaction.type) || [],
        transaction,
      })
    )
    .filter(Boolean);
  const config = getAiConfig();
  let suggestions = heuristicSuggestions.map((suggestion) => ({
    ...suggestion,
    source: suggestion.source || 'heuristic',
  }));
  let meta = {
    heuristicCount: heuristicSuggestions.length,
    model: config.provider === 'openai' ? config.model : null,
    promptVersion: AI_PROMPT_VERSION,
    provider: config.provider,
    usedFallback: config.provider !== 'openai',
  };

  if (config.provider === 'openai') {
    try {
      const providerResponse = await callOpenAiStructuredOutput({
        config,
        input: buildTransactionsPrompt({
          categories: normalizedCategories,
          heuristicSuggestions,
          transactions,
        }),
        schema: transactionSuggestionSchema,
      });
      const providerSuggestions = normalizeProviderSuggestions({
        categoryLookup,
        suggestions: providerResponse.parsed.suggestions,
        transactions,
      });
      const providerMap = new Map(
        providerSuggestions.map((suggestion) => [suggestion.transactionId, suggestion])
      );
      const mergedSuggestions = transactions
        .map((transaction) => {
          const providerSuggestion = providerMap.get(transaction.id);
          const heuristicSuggestion = suggestions.find((item) => item.transactionId === transaction.id);

          if (!providerSuggestion) {
            return heuristicSuggestion;
          }

          if (!heuristicSuggestion) {
            return providerSuggestion;
          }

          return providerSuggestion.confidence >= heuristicSuggestion.confidence - 0.05
            ? providerSuggestion
            : heuristicSuggestion;
        })
        .filter(Boolean);

      suggestions = mergedSuggestions;
      meta = {
        ...meta,
        heuristicCount: heuristicSuggestions.length,
        latencyMs: providerResponse.latencyMs,
        provider: 'openai',
        reasoningEffort: config.reasoningEffort,
        usedFallback: providerSuggestions.length === 0,
      };

      await recordAiRequest({
        completionTokens: providerResponse.usage.completionTokens,
        featureKey: 'transaction_review',
        latencyMs: providerResponse.latencyMs,
        model: config.model,
        promptTokens: providerResponse.usage.promptTokens,
        provider: 'openai',
        requestSummary: {
          transactionCount: transactions.length,
          transactionTypes: uniqueTypes,
        },
        responseSummary: {
          heuristicCount: heuristicSuggestions.length,
          promptVersion: AI_PROMPT_VERSION,
          providerSuggestionCount: providerSuggestions.length,
          suggestionCount: suggestions.length,
        },
        usedFallback: providerSuggestions.length === 0,
        userId,
      }).catch(() => null);

      return {
        meta,
        suggestions,
      };
    } catch (error) {
      meta = {
        ...meta,
        error: error.message,
        provider: config.configuredProvider,
        usedFallback: true,
      };
    }
  }

  await recordAiRequest({
    featureKey: 'transaction_review',
    model: config.provider === 'openai' ? config.model : null,
    provider: config.provider === 'openai' ? config.configuredProvider : 'heuristic',
    requestSummary: {
      transactionCount: transactions.length,
      transactionTypes: uniqueTypes,
    },
    responseSummary: {
      heuristicCount: heuristicSuggestions.length,
      promptVersion: AI_PROMPT_VERSION,
      suggestionCount: suggestions.length,
    },
    usedFallback: true,
    userId,
  }).catch(() => null);

  return {
    meta,
    suggestions,
  };
};

const getGoalGuidance = async (userId, payload = {}) => {
  const [currency, goals, reportOverview] = await Promise.all([
    getUserCurrency(userId),
    getGoals(userId),
    reportsService.getReportsOverview(userId, {}),
  ]);
  const focusGoal = payload.goal_id
    ? await getGoalById(userId, Number(payload.goal_id)).catch(() => null)
    : null;
  const fallbackGuidance = normalizeBriefing(
    buildHeuristicGoalGuidance({
      currency,
      focusGoal,
      goals,
      reportOverview,
    })
  );
  const config = getAiConfig();
  let meta = {
    model: config.provider === 'openai' ? config.model : null,
    promptVersion: AI_PROMPT_VERSION,
    provider: config.provider,
    usedFallback: config.provider !== 'openai',
  };

  if (config.provider === 'openai') {
    try {
      const providerResponse = await callOpenAiStructuredOutput({
        config,
        input: buildGoalsPrompt({
          currency,
          focusGoal,
          goals,
          reportOverview,
        }),
        schema: goalGuidanceSchema,
      });
      const providerGuidance = normalizeBriefing(providerResponse.parsed);
      const hasGoalData = goals.length > 0;
      const minimumActions = hasGoalData ? 2 : 1;
      const providerQuality = evaluateBriefingQuality({
        briefing: providerGuidance,
        hasData: hasGoalData,
        minimumActions,
      });
      const mergedGuidance =
        providerQuality.score >= MIN_PROVIDER_BRIEFING_SCORE
          ? mergeBriefings(providerGuidance, fallbackGuidance)
          : fallbackGuidance;
      const finalQuality = evaluateBriefingQuality({
        briefing: mergedGuidance,
        hasData: hasGoalData,
        minimumActions,
      });
      const usedQualityFallback =
        providerQuality.score < MIN_PROVIDER_BRIEFING_SCORE ||
        finalQuality.score < MIN_FINAL_BRIEFING_SCORE;
      const guidance = usedQualityFallback ? fallbackGuidance : mergedGuidance;

      meta = {
        ...meta,
        latencyMs: providerResponse.latencyMs,
        provider: 'openai',
        quality: {
          checks: finalQuality.checks,
          finalScore: finalQuality.score,
          providerScore: providerQuality.score,
        },
        reasoningEffort: config.reasoningEffort,
        usedFallback: usedQualityFallback,
      };

      await recordAiRequest({
        completionTokens: providerResponse.usage.completionTokens,
        featureKey: 'goal_guidance',
        latencyMs: providerResponse.latencyMs,
        model: config.model,
        promptTokens: providerResponse.usage.promptTokens,
        provider: 'openai',
        requestSummary: {
          activeGoals: goals.filter((goal) => goal.status !== 'Completed').length,
          focusGoalId: focusGoal ? Number(focusGoal.id) : null,
          goalCount: goals.length,
        },
        responseSummary: {
          actionCount: guidance.actions.length,
          headline: guidance.headline,
          promptVersion: AI_PROMPT_VERSION,
          quality: meta.quality,
        },
        usedFallback: usedQualityFallback,
        userId,
      }).catch(() => null);

      return {
        guidance,
        meta,
      };
    } catch (error) {
      meta = {
        ...meta,
        error: error.message,
        provider: config.configuredProvider,
        usedFallback: true,
      };
    }
  }

  await recordAiRequest({
    featureKey: 'goal_guidance',
    model: config.provider === 'openai' ? config.model : null,
    provider: config.provider === 'openai' ? config.configuredProvider : 'heuristic',
    requestSummary: {
      activeGoals: goals.filter((goal) => goal.status !== 'Completed').length,
      focusGoalId: focusGoal ? Number(focusGoal.id) : null,
      goalCount: goals.length,
    },
    responseSummary: {
      actionCount: fallbackGuidance.actions.length,
      headline: fallbackGuidance.headline,
      promptVersion: AI_PROMPT_VERSION,
    },
    usedFallback: true,
    userId,
  }).catch(() => null);

  return {
    guidance: fallbackGuidance,
    meta,
  };
};

module.exports = {
  ensureAiSchema,
  getAiRuntimeStatus,
  getGoalGuidance,
  getReportBriefing,
  getTransactionSuggestions,
};

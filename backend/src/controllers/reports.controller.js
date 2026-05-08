const reportsService = require('../services/reports.service');
const asyncHandler = require('../utils/asyncHandler');

const getOverview = asyncHandler(async (req, res) => {
  const reports = await reportsService.getReportsOverview(req.user.id, req.query);

  res.json({
    reports,
  });
});

const getForecast = asyncHandler(async (req, res) => {
  const forecast = await reportsService.getForecast(req.user.id, req.query);

  res.json({
    forecast,
  });
});

module.exports = {
  getForecast,
  getOverview,
};

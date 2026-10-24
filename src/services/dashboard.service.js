/**
 * DashboardService
 *
 * All dashboard data is computed via MongoDB aggregation pipelines.
 * Role scoping is applied in the $match stage of each pipeline.
 */

import Lead from '../models/Lead.js';

/**
 * Build the base $match stage for role scoping.
 * @param {object} user
 * @returns {object}
 */
function roleMatch(user) {
  if (user.role === 'ADMIN') return {};
  return {
    $or: [
      { createdBy: user._id },
      { assignedTo: user._id },
    ],
  };
}

/**
 * Dashboard stat cards:
 * - Total leads
 * - Count and percentage per status
 * - Conversion rate (Converted / Total)
 *
 * @param {object} user
 * @returns {Promise<object>}
 */
export async function getStats(user) {
  const match = roleMatch(user);

  const result = await Lead.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const total = result[0]?.total[0]?.count ?? 0;
  const byStatus = result[0]?.byStatus ?? [];

  const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));

  const statuses = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];
  const statusStats = statuses.map((status) => ({
    status,
    count: statusMap[status] ?? 0,
    percentage: total > 0 ? Math.round(((statusMap[status] ?? 0) / total) * 100) : 0,
  }));

  const converted = statusMap['Converted'] ?? 0;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  return { total, statuses: statusStats, conversionRate };
}

/**
 * Leads created per day over the last 30 days.
 * Missing days are filled with zero counts.
 *
 * @param {object} user
 * @returns {Promise<Array<{ date: string, count: number }>>}
 */
export async function getTrends(user) {
  const match = roleMatch(user);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const result = await Lead.aggregate([
    {
      $match: {
        ...match,
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dataMap = Object.fromEntries(result.map((r) => [r._id, r.count]));

  // Fill in missing days with 0
  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    days.push({ date: key, count: dataMap[key] ?? 0 });
  }

  return days;
}

/**
 * Leads grouped by service interested.
 *
 * @param {object} user
 * @returns {Promise<Array<{ service: string, count: number }>>}
 */
export async function getServiceBreakdown(user) {
  const match = roleMatch(user);

  const result = await Lead.aggregate([
    { $match: match },
    { $group: { _id: '$serviceInterested', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return result.map((r) => ({ service: r._id, count: r.count }));
}

/**
 * Follow-ups:
 * - overdue: followUpDate < today (start of day)
 * - today: followUpDate is today
 * - upcoming: followUpDate in next 7 days
 *
 * @param {object} user
 * @returns {Promise<{ overdue: object[], today: object[], upcoming: object[] }>}
 */
export async function getFollowUps(user) {
  const match = roleMatch(user);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 59, 59, 999);

  const sevenDaysOut = new Date(todayEnd);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const result = await Lead.aggregate([
    {
      $match: {
        ...match,
        followUpDate: { $ne: null, $exists: true },
        status: { $nin: ['Converted', 'Lost'] },
      },
    },
    {
      $facet: {
        overdue: [
          { $match: { followUpDate: { $lt: todayStart } } },
          { $sort: { followUpDate: 1 } },
          { $limit: 20 },
          { $project: { name: 1, email: 1, company: 1, status: 1, followUpDate: 1 } },
        ],
        today: [
          { $match: { followUpDate: { $gte: todayStart, $lte: todayEnd } } },
          { $sort: { followUpDate: 1 } },
          { $limit: 20 },
          { $project: { name: 1, email: 1, company: 1, status: 1, followUpDate: 1 } },
        ],
        upcoming: [
          { $match: { followUpDate: { $gt: todayEnd, $lte: sevenDaysOut } } },
          { $sort: { followUpDate: 1 } },
          { $limit: 20 },
          { $project: { name: 1, email: 1, company: 1, status: 1, followUpDate: 1 } },
        ],
      },
    },
  ]);

  return {
    overdue: result[0]?.overdue ?? [],
    today: result[0]?.today ?? [],
    upcoming: result[0]?.upcoming ?? [],
  };
}

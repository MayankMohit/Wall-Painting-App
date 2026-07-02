import { connectDB } from '@/lib/db';
import { User, Job, Submission, GeneratedFile, AuditLog, Invite, Notification } from '@/lib/models';
import { fileGenQueue, notifyQueue, assetCleanupQueue } from '@/lib/queues';
import { STORAGE_LIMIT_BYTES } from '@/lib/storage';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';

// All date bucketing happens in the user's local timezone so "per day" charts
// line up with calendar days in India, not UTC.
const TZ = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FILL_DAYS = 180;

const RANGE_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null };

const LOGIN_ACTIONS = ['AUTH_LOGIN', 'AUTH_LOGIN_OTP', 'AUTH_LOGIN_INVITE'];

// YYYY-MM-DD in IST (en-CA locale formats as ISO date)
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const dayKey = (d: Date) => dayFmt.format(d);

const byDayStage = (dateField: string) => ({
  $group: {
    _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}`, timezone: TZ } },
    n  : { $sum: 1 },
  },
});

// Zero-fill a continuous day series between from..now so sparse data doesn't
// render as broken chart segments.
function fillDays<T extends Record<string, number>>(
  from : Date,
  blank: T,
  rows : Map<string, Partial<T>>
): ({ date: string } & T)[] {
  const out: ({ date: string } & T)[] = [];
  const now = Date.now();
  for (let t = from.getTime(); t <= now; t += DAY_MS) {
    const date = dayKey(new Date(t));
    out.push({ date, ...blank, ...(rows.get(date) ?? {}) });
  }
  return out;
}

export const GET = withRole(['admin'], { audit: 'ADMIN_ANALYTICS_VIEW' })(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get('range') ?? '30d';
    const range = rangeParam in RANGE_DAYS ? rangeParam : '30d';
    const days  = RANGE_DAYS[range];

    await connectDB();

    const now = new Date();
    let from: Date;
    let prevFrom: Date | null = null;
    if (days !== null) {
      from     = new Date(now.getTime() - days * DAY_MS);
      prevFrom = new Date(from.getTime() - days * DAY_MS);
    } else {
      // "all" — start at the first user ever, capped so day series stay bounded
      const first = await User.findOne().sort({ createdAt: 1 }).select('createdAt').lean();
      const earliest = first?.createdAt?.getTime() ?? now.getTime() - 30 * DAY_MS;
      from = new Date(Math.max(earliest, now.getTime() - MAX_FILL_DAYS * DAY_MS));
    }
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);

    const inRange     = { $gte: from };
    const inPrevRange = prevFrom ? { $gte: prevFrom, $lt: from } : null;

    const [
      usersPerDay,
      jobsPerDay,
      jobsCompletedPerDay,
      subsPerDay,
      subStatus,
      subStatusPrev,
      turnaround,
      turnaroundPrev,
      jobsByStatus,
      jobDuration,
      painterBoard,
      ownerJobs,
      ownerSubs,
      ownerStorage,
      fileFacets,
      auditFacets,
      activePainterIds,
      newPaintersCur,
      newPaintersPrev,
      inviteStats,
      notifStats,
      queueCounts,
    ] = await Promise.all([
      // ── growth ──────────────────────────────────────────────────────────
      User.aggregate([
        { $match: { createdAt: inRange } },
        { $group: {
          _id: {
            d   : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
            role: '$role',
          },
          n: { $sum: 1 },
        } },
      ]),
      Job.aggregate([{ $match: { createdAt: inRange } }, byDayStage('createdAt')]),
      Job.aggregate([{ $match: { endDate: { $ne: null, ...inRange } } }, byDayStage('endDate')]),
      Submission.aggregate([{ $match: { submittedAt: inRange } }, byDayStage('submittedAt')]),

      // ── submissions ─────────────────────────────────────────────────────
      Submission.aggregate([
        { $match: { submittedAt: inRange } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
      inPrevRange
        ? Submission.aggregate([
            { $match: { submittedAt: inPrevRange } },
            { $group: { _id: '$status', n: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      Submission.aggregate([
        { $match: { submittedAt: inRange, approvedAt: { $exists: true, $ne: null } } },
        { $project: { mins: { $dateDiff: { startDate: '$submittedAt', endDate: '$approvedAt', unit: 'minute' } } } },
        { $facet: {
          avg    : [{ $group: { _id: null, avgMins: { $avg: '$mins' } } }],
          buckets: [{
            $bucket: {
              groupBy   : '$mins',
              boundaries: [0, 60, 240, 720, 1440, 4320, 1_000_000_000],
              default   : 'other',
              output    : { n: { $sum: 1 } },
            },
          }],
        } },
      ]),
      inPrevRange
        ? Submission.aggregate([
            { $match: { submittedAt: inPrevRange, approvedAt: { $exists: true, $ne: null } } },
            { $project: { mins: { $dateDiff: { startDate: '$submittedAt', endDate: '$approvedAt', unit: 'minute' } } } },
            { $group: { _id: null, avgMins: { $avg: '$mins' } } },
          ])
        : Promise.resolve([]),

      // ── jobs ────────────────────────────────────────────────────────────
      Job.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Job.aggregate([
        { $match: { endDate: { $ne: null } } },
        { $project: { d: { $dateDiff: { startDate: '$startDate', endDate: '$endDate', unit: 'day' } } } },
        { $group: { _id: null, avgDays: { $avg: '$d' } } },
      ]),

      // ── leaderboards ────────────────────────────────────────────────────
      Submission.aggregate([
        { $match: { submittedAt: inRange } },
        { $group: {
          _id     : '$painterId',
          total   : { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        } },
        { $sort: { approved: -1, total: -1 } },
        { $limit: 8 },
      ]),
      Job.aggregate([
        { $match: { createdAt: inRange } },
        { $group: { _id: '$ownerId', jobs: { $sum: 1 } } },
      ]),
      Submission.aggregate([
        { $match: { submittedAt: inRange } },
        { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job' } },
        { $unwind: '$job' },
        { $group: { _id: '$job.ownerId', submissions: { $sum: 1 } } },
      ]),
      // storage is a quota concept → always all-time
      GeneratedFile.aggregate([
        { $match: { status: 'ready', fileSize: { $exists: true } } },
        { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job' } },
        { $unwind: '$job' },
        { $group: { _id: '$job.ownerId', bytes: { $sum: '$fileSize' } } },
      ]),

      // ── files (all-time) ────────────────────────────────────────────────
      GeneratedFile.aggregate([
        { $facet: {
          storageByType: [
            { $match: { status: 'ready', fileSize: { $exists: true } } },
            { $group: { _id: '$fileType', bytes: { $sum: '$fileSize' }, count: { $sum: 1 } } },
          ],
          downloadsByType: [
            { $group: { _id: '$fileType', downloads: { $sum: '$downloadCount' } } },
          ],
          genOutcome: [
            { $group: { _id: '$status', n: { $sum: 1 } } },
          ],
        } },
      ]),

      // ── activity (AuditLog holds non-GET actions only; failures included) ─
      AuditLog.aggregate([
        { $match: { timestamp: inRange } },
        { $facet: {
          perDay: [{
            $group: {
              _id   : { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: TZ } },
              total : { $sum: 1 },
              failed: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
            },
          }],
          byCategory: [
            { $project: { cat: { $arrayElemAt: [{ $split: ['$action', '_'] }, 0] } } },
            { $group: { _id: '$cat', n: { $sum: 1 } } },
            { $sort: { n: -1 } },
          ],
          heatmap: [{
            $group: {
              _id: {
                dow : { $dayOfWeek: { date: '$timestamp', timezone: TZ } },
                hour: { $hour: { date: '$timestamp', timezone: TZ } },
              },
              n: { $sum: 1 },
            },
          }],
          logins: [
            { $match: { action: { $in: LOGIN_ACTIONS } } },
            { $group: {
              _id    : { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: TZ } },
              success: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
              failed : { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
            } },
          ],
        } },
      ]),
      AuditLog.distinct('userId', { timestamp: { $gte: sevenDaysAgo }, userRole: 'painter' }),

      // ── KPIs ────────────────────────────────────────────────────────────
      User.countDocuments({ role: 'painter', createdAt: inRange }),
      inPrevRange
        ? User.countDocuments({ role: 'painter', createdAt: inPrevRange })
        : Promise.resolve(null),

      // ── invites ─────────────────────────────────────────────────────────
      Invite.aggregate([
        { $match: { createdAt: inRange } },
        { $group: {
          _id    : null,
          issued : { $sum: 1 },
          claimed: { $sum: { $cond: [{ $ne: ['$lastUsedAt', null] }, 1, 0] } },
          revoked: { $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] } },
          expired: { $sum: { $cond: [
            { $and: [
              { $eq: ['$lastUsedAt', null] },
              { $eq: ['$status', 'active'] },
              { $lt: ['$expiresAt', '$$NOW'] },
            ] }, 1, 0] } },
        } },
      ]),

      // ── notifications (7-day TTL → fixed 7d window) ─────────────────────
      Notification.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: {
          _id : null,
          sent: { $sum: 1 },
          read: { $sum: { $cond: [{ $ne: ['$readAt', null] }, 1, 0] } },
        } },
      ]),

      // ── queues (best-effort — Redis may be down) ────────────────────────
      Promise.all([
        fileGenQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed').catch(() => ({})),
        notifyQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed').catch(() => ({})),
        assetCleanupQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed').catch(() => ({})),
      ]),
    ]);

    // ── growth series (merged, zero-filled) ───────────────────────────────
    const growthMap = new Map<string, Partial<{ painters: number; owners: number; jobs: number; submissions: number }>>();
    const bump = (date: string, key: 'painters' | 'owners' | 'jobs' | 'submissions', n: number) => {
      const row = growthMap.get(date) ?? {};
      row[key] = (row[key] ?? 0) + n;
      growthMap.set(date, row);
    };
    for (const r of usersPerDay) {
      const { d, role } = r._id as { d: string; role: string };
      if (role === 'painter') bump(d, 'painters', r.n);
      else if (role === 'owner') bump(d, 'owners', r.n);
    }
    for (const r of jobsPerDay) bump(r._id as string, 'jobs', r.n);
    for (const r of subsPerDay) bump(r._id as string, 'submissions', r.n);
    const growth = fillDays(from, { painters: 0, owners: 0, jobs: 0, submissions: 0 }, growthMap);

    // ── submissions section ───────────────────────────────────────────────
    const statusCount = (agg: { _id: string; n: number }[], s: string) => agg.find((r) => r._id === s)?.n ?? 0;
    const approved  = statusCount(subStatus, 'approved');
    const rejected  = statusCount(subStatus, 'rejected');
    const pending   = statusCount(subStatus, 'pending');
    const subsTotal = approved + rejected + pending;
    const decided   = approved + rejected;
    const approvalRate = decided > 0 ? approved / decided : null;

    const prevApproved = statusCount(subStatusPrev, 'approved');
    const prevRejected = statusCount(subStatusPrev, 'rejected');
    const prevDecided  = prevApproved + prevRejected;
    const approvalRatePrev = inPrevRange && prevDecided > 0 ? prevApproved / prevDecided : null;

    const avgMins = turnaround[0]?.avg?.[0]?.avgMins as number | undefined;
    const avgTurnaroundHours = avgMins != null ? avgMins / 60 : null;
    const prevAvgMins = turnaroundPrev[0]?.avgMins as number | undefined;
    const avgTurnaroundHoursPrev = prevAvgMins != null ? prevAvgMins / 60 : null;

    const BUCKET_LABELS: Record<string, string> = {
      '0': '<1h', '60': '1–4h', '240': '4–12h', '720': '12–24h', '1440': '1–3d', '4320': '>3d',
    };
    const rawBuckets = (turnaround[0]?.buckets ?? []) as { _id: number | string; n: number }[];
    const turnaroundBuckets = Object.entries(BUCKET_LABELS).map(([bound, label]) => ({
      label,
      n: rawBuckets.find((b) => String(b._id) === bound)?.n ?? 0,
    }));

    // ── jobs section ──────────────────────────────────────────────────────
    const jobStatus = {
      active   : statusCount(jobsByStatus, 'active'),
      completed: statusCount(jobsByStatus, 'completed'),
      invoiced : statusCount(jobsByStatus, 'invoiced'),
    };
    const jcMap = new Map<string, Partial<{ created: number; completed: number }>>();
    for (const r of jobsPerDay) jcMap.set(r._id as string, { ...jcMap.get(r._id as string), created: r.n });
    for (const r of jobsCompletedPerDay) jcMap.set(r._id as string, { ...jcMap.get(r._id as string), completed: r.n });
    const jobsCreatedVsCompleted = fillDays(from, { created: 0, completed: 0 }, jcMap);
    const avgJobDurationDays = (jobDuration[0]?.avgDays as number | undefined) ?? null;

    // ── leaderboards (resolve names in one query) ─────────────────────────
    const ownerAgg = new Map<string, { jobs: number; submissions: number; bytes: number }>();
    const ownerRow = (id: string) => {
      if (!ownerAgg.has(id)) ownerAgg.set(id, { jobs: 0, submissions: 0, bytes: 0 });
      return ownerAgg.get(id)!;
    };
    for (const r of ownerJobs)    ownerRow(String(r._id)).jobs = r.jobs;
    for (const r of ownerSubs)    ownerRow(String(r._id)).submissions = r.submissions;
    for (const r of ownerStorage) ownerRow(String(r._id)).bytes = r.bytes;

    const nameIds = [
      ...painterBoard.map((r) => String(r._id)),
      ...ownerAgg.keys(),
    ];
    const nameDocs = nameIds.length
      ? await User.find({ _id: { $in: nameIds } }).select('name').lean()
      : [];
    const names = new Map(nameDocs.map((u) => [String(u._id), u.name]));

    const painters = painterBoard.map((r) => ({
      id      : String(r._id),
      name    : names.get(String(r._id)) ?? 'Unknown',
      total   : r.total as number,
      approved: r.approved as number,
    }));
    const owners = [...ownerAgg.entries()]
      .map(([id, v]) => ({ id, name: names.get(id) ?? 'Unknown', ...v }))
      .sort((a, b) => b.submissions - a.submissions || b.jobs - a.jobs)
      .slice(0, 8);
    const ownersQuota = [...ownerAgg.entries()]
      .filter(([, v]) => v.bytes > 0)
      .map(([id, v]) => ({ id, name: names.get(id) ?? 'Unknown', bytes: v.bytes, limit: STORAGE_LIMIT_BYTES }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);

    // ── files section ─────────────────────────────────────────────────────
    const ff = fileFacets[0] ?? { storageByType: [], downloadsByType: [], genOutcome: [] };
    const storageByType = (ff.storageByType as { _id: string; bytes: number; count: number }[])
      .map((r) => ({ type: r._id, bytes: r.bytes, count: r.count }));
    const downloadsByType = (ff.downloadsByType as { _id: string; downloads: number }[])
      .map((r) => ({ type: r._id, downloads: r.downloads }));
    const genOutcome = {
      ready     : statusCount(ff.genOutcome, 'ready'),
      failed    : statusCount(ff.genOutcome, 'failed'),
      generating: statusCount(ff.genOutcome, 'generating'),
    };

    // ── activity section ──────────────────────────────────────────────────
    const af = auditFacets[0] ?? { perDay: [], byCategory: [], heatmap: [], logins: [] };
    const actMap = new Map<string, Partial<{ total: number; failed: number }>>();
    for (const r of af.perDay as { _id: string; total: number; failed: number }[]) {
      actMap.set(r._id, { total: r.total, failed: r.failed });
    }
    const actionsPerDay = fillDays(from, { total: 0, failed: 0 }, actMap);

    const loginMap = new Map<string, Partial<{ success: number; failed: number }>>();
    for (const r of af.logins as { _id: string; success: number; failed: number }[]) {
      loginMap.set(r._id, { success: r.success, failed: r.failed });
    }
    const loginsPerDay = fillDays(from, { success: 0, failed: 0 }, loginMap);

    const byCategory = (af.byCategory as { _id: string; n: number }[])
      .map((r) => ({ category: r._id ?? 'OTHER', n: r.n }));
    const heatmap = (af.heatmap as { _id: { dow: number; hour: number }; n: number }[])
      .map((r) => ({ dow: r._id.dow, hour: r._id.hour, n: r.n }));

    // ── invites / notifications ───────────────────────────────────────────
    const inv = inviteStats[0] ?? { issued: 0, claimed: 0, revoked: 0, expired: 0 };
    const noti = notifStats[0] ?? { sent: 0, read: 0 };

    return ok({
      range,
      from       : from.toISOString(),
      generatedAt: now.toISOString(),
      growth,
      submissions: {
        total: subsTotal, pending, approved, rejected,
        approvalRate, approvalRatePrev,
        avgTurnaroundHours, avgTurnaroundHoursPrev,
        turnaroundBuckets,
        funnel: [
          { stage: 'Created',  n: subsTotal },
          { stage: 'Reviewed', n: decided },
          { stage: 'Approved', n: approved },
        ],
      },
      jobs: {
        byStatus          : jobStatus,
        createdVsCompleted: jobsCreatedVsCompleted,
        avgDurationDays   : avgJobDurationDays,
      },
      leaderboards: { painters, owners },
      files       : { storageByType, downloadsByType, genOutcome, ownersQuota },
      activity    : {
        perDay          : actionsPerDay,
        byCategory,
        logins          : loginsPerDay,
        heatmap,
        activePainters7d: activePainterIds.filter(Boolean).length,
      },
      invites: {
        issued : inv.issued,
        claimed: inv.claimed,
        revoked: inv.revoked,
        expired: inv.expired,
        acceptanceRate: inv.issued > 0 ? inv.claimed / inv.issued : null,
      },
      notifications: {
        sent7d  : noti.sent,
        read7d  : noti.read,
        readRate: noti.sent > 0 ? noti.read / noti.sent : null,
      },
      queues: {
        fileGen     : queueCounts[0],
        notify      : queueCounts[1],
        assetCleanup: queueCounts[2],
      },
      kpis: {
        newPainters    : newPaintersCur,
        newPaintersPrev,
      },
    });
  }
);

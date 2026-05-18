# Scalability & Caching Strategies

---

## Scalability Design

### Multi-Tenancy (Multiple Companies/Owners)

All queries filter by `companyId`:

```typescript
// Example: Painter can only see jobs from their company
app.get('/api/jobs', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const user = await User.findById(userId);

  const jobs = await Job.find({
    $or: [
      { companyId: user.companyId },
      { ownerId: userId }
    ]
  }).limit(20);

  res.json({ jobs });
});
```

---

## Pagination

```typescript
app.get('/api/jobs', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const jobs = await Job
    .find({ companyId })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Job.countDocuments({ companyId });

  res.json({
    jobs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});
```

---

## Queue Distribution (Bull)

```typescript
// Each job type processed separately
const watermarkQueue = new Queue('watermarking', { redis });
const excelQueue = new Queue('excel-generation', { redis });
const pdfQueue = new Queue('pdf-generation', { redis });
const emailQueue = new Queue('email', { redis });

// Multiple workers can run in parallel
watermarkQueue.process(5, workerFunction); // 5 concurrent
excelQueue.process(2, workerFunction);     // 2 concurrent
pdfQueue.process(2, workerFunction);       // 2 concurrent
emailQueue.process(10, workerFunction);    // 10 concurrent
```

---

## Caching Strategies

### 1. In-Memory Cache (Node.js)

```typescript
// lib/cache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 min default

export const cacheService = {
  get<T>(key: string): T | undefined {
    return cache.get(key);
  },

  set<T>(key: string, value: T, ttl = 600) {
    cache.set(key, value, ttl);
  },

  del(key: string) {
    cache.del(key);
  },

  flush() {
    cache.flushAll();
  }
};

// Usage
app.get('/api/jobs/:jobId', async (req, res) => {
  const cacheKey = `job:${req.params.jobId}`;
  
  let job = cacheService.get(cacheKey);
  if (job) return res.json(job);

  job = await Job.findById(req.params.jobId);
  cacheService.set(cacheKey, job, 600); // 10 min

  res.json(job);
});

// Invalidate on update
app.put('/api/jobs/:jobId', async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.jobId, req.body, {
    new: true
  });

  cacheService.del(`job:${req.params.jobId}`);
  res.json(job);
});
```

---

### 2. RTK Query Caching (Frontend)

```typescript
// Automatic request deduplication & caching
const submissionsApi = createApi({
  endpoints: (builder) => ({
    getSubmissions: builder.query({
      query: (jobId) => `/submissions?jobId=${jobId}`,
      keepUnusedDataFor: 300, // Keep 5 min after component unmounts
      pollingInterval: 60000 // Auto-refetch every 60s if subscribed
    })
  })
});

// Usage
const { data: submissions } = useGetSubmissionsQuery(jobId);
```

---

### 3. Response Caching Headers

```typescript
app.get('/api/public-data', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  res.json(data);
});

app.get('/api/private-data', authMiddleware, (req, res) => {
  res.set('Cache-Control', 'private, max-age=300'); // 5 min
  res.json(data);
});
```

---

### 4. Redis Caching (Optional, for distributed systems)

```typescript
// Upstash Redis (free tier: 10K commands/day)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL
});

export async function getCachedJob(jobId: string) {
  const cached = await redis.get(`job:${jobId}`);
  if (cached) return cached;

  const job = await Job.findById(jobId);
  await redis.setex(`job:${jobId}`, 600, JSON.stringify(job));

  return job;
}
```

---

## Performance Targets

- **Page Load**: < 2s
- **API Response**: < 500ms
- **File Generation**: < 30s (PDF), < 15s (Excel)
- **Image Watermarking**: < 5s per image
- **Database Query**: < 100ms (with indexes)

---

## Scalability Checklist

- ✅ Multi-tenancy (multiple companies/owners)
- ✅ Pagination (20 items per page)
- ✅ Caching (in-memory, Redis, RTK Query)
- ✅ Background jobs (Bull queue, separate workers)
- ✅ Database indexes (optimized queries)
- ✅ Lean queries (only fetch needed fields)
- ✅ Horizontal scaling ready (stateless API)

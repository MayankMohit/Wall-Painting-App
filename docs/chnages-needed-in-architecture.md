
## How the file generation flow works end-to-end without BackgroundJobs

```
Owner clicks "Generate Excel"
        │
        ▼
POST /api/jobs/:jobId/files/generate
  1. Check idempotency (Redis key) — prevent double-generation
  2. Create GeneratedFiles doc: { status: 'generating', jobId, fileType, generatedBy }
  3. fileGenQueue.add('excel', { fileId: doc._id, jobId }) → returns BullMQ job
  4. Return 202: { taskId: bullmqJob.id, fileId: doc._id }
        │
        ▼
Client polls GET /generation-status/:taskId
  → query BullMQ job state directly (no Mongo)
  → return { status, progress, error }
        │
        ▼
fileGenWorker runs:
  1. job.updateProgress(10)
  2. Fetch all approved submissions + watermarkedUrls from Mongo
  3. job.updateProgress(40)
  4. ExcelJS builds the file
  5. job.updateProgress(80)
  6. Upload to R2
  7. job.updateProgress(100)
  8. Update GeneratedFiles doc: { status: 'ready', r2Path, r2Url, fileSize }
  9. notify.emit('file.ready', { recipientId: ownerId })
        │
        ▼
Client polls one more time → BullMQ state is 'completed'
  → frontend invalidates RTK Query cache for /files
  → GeneratedFiles doc now has status: 'ready'
  → owner clicks Download → GET /files/:fileId/download → R2 signed URL
```

`GeneratedFiles` is where the business-layer file status lives (`generating` → `ready`). BullMQ is where the queue-layer job status lives (`waiting` → `active` → `completed`). They serve different masters. No shadow collection needed.

---

## The Job can be one of the three types

- `Wall Painting`, `Shutter Painting`, `Van Painting`
- Need to make adjustments according to this new requirement.
- Needs a lot of work on job routes and upload/sign route and cloudinary.ts.

## Can select the order of painters before the generation of files (whose submissions, we want to see at top of the file.)

## A cron job to ping database every 5 mins

# --- Observability (optional but recommended) ---
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
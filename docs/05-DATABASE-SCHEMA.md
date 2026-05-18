# Database Schema

---

## MongoDB Collections

### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: 'painter' | 'owner' | 'admin',
  name: String,
  phone: String,
  companyId: ObjectId (optional, for painters),
  fcmTokens: [String],
  profileImage: String (optional, Cloudinary URL),
  status: 'active' | 'inactive' | 'suspended',
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Jobs Collection
```javascript
{
  _id: ObjectId,
  jobNumber: String (unique),
  companyId: ObjectId,
  clientId: ObjectId,
  ownerId: ObjectId,
  jobName: String,
  location: String,
  description: String,
  status: 'draft' | 'active' | 'completed' | 'invoiced',
  startDate: Date,
  endDate: Date,
  budget: Number,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.jobs.createIndex({ jobNumber: 1 }, { unique: true });
db.jobs.createIndex({ companyId: 1, status: 1 });
db.jobs.createIndex({ ownerId: 1 });
```

### 3. Submissions Collection
```javascript
{
  _id: ObjectId,
  painterId: ObjectId,
  jobId: ObjectId,
  generatedNumber: String (unique), // #0001, #0002, etc.
  location: String,
  paintingSize: String,
  images: [{
    cloudinaryId: String,
    cloudinaryUrl: String,
    watermarkedUrl: String,
    uploadedAt: Date
  }],
  status: 'pending' | 'approved' | 'rejected' | 'archived',
  submittedAt: Date,
  canEditUntil: Date,
  approvedAt: Date,
  approvedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.submissions.createIndex({ painterId: 1, jobId: 1 });
db.submissions.createIndex({ jobId: 1, status: 1 });
db.submissions.createIndex({ generatedNumber: 1 }, { unique: true });
```

### 4. GeneratedFiles Collection
```javascript
{
  _id: ObjectId,
  jobId: ObjectId,
  fileType: 'excel' | 'pdf_photos',
  fileName: String,
  r2Path: String,
  r2Url: String,
  fileSize: Number,
  status: 'generating' | 'ready' | 'archived',
  generatedBy: ObjectId,
  generatedAt: Date,
  expiresAt: Date,
  downloadCount: Number,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.generatedFiles.createIndex({ jobId: 1, fileType: 1 });
db.generatedFiles.createIndex({ generatedAt: -1 });
db.generatedFiles.createIndex({ expiresAt: 1 });
```

### 5. BackgroundJobs Collection
```javascript
{
  _id: ObjectId,
  jobType: 'watermarking' | 'excel' | 'pdf_generation' | 'email',
  submissionId: ObjectId,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: Number (0-100),
  error: String,
  retryCount: Number,
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.backgroundJobs.createIndex({ jobType: 1, status: 1 });
db.backgroundJobs.createIndex({ createdAt: -1 });
```

### 6. Companies Collection
```javascript
{
  _id: ObjectId,
  name: String,
  ownerId: ObjectId,
  address: String,
  city: String,
  phone: String,
  email: String,
  status: 'active' | 'inactive',
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.companies.createIndex({ ownerId: 1 });
```

---

## Database Optimization

```javascript
// Indexes for frequently accessed queries
db.jobs.createIndex({ companyId: 1, status: 1 });
db.submissions.createIndex({ jobId: 1, status: 1 });
db.submissions.createIndex({ painterId: 1 });
db.generatedFiles.createIndex({ jobId: 1 });

// Lean queries (plain JS, faster)
const submissions = await Submission
  .find({ jobId })
  .select('generatedNumber location paintingSize') // Only needed fields
  .lean();
```

---

## Data Storage

| Data | Storage | Size Limit | Cost |
|------|---------|------------|------|
| User accounts, jobs, submissions | MongoDB Atlas | 5GB free | Free tier |
| Original images | Cloudinary | 25GB/month free | Free tier |
| Watermarked images, PDFs, Excel | Cloudflare R2 | 5GB forever free | Free tier |
| Session cache, job queue | Redis (Upstash) | 10K commands/day free | Free tier |

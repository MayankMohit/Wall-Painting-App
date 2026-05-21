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
  fcmTokens: [String],
  status: 'active' | 'inactive' | 'suspended',
  // Owner-only: reusable letterhead for File PDF generation (persisted on first use,
  // pre-filled in UI on subsequent generates)
  letterhead: {
    companyName: String,
    address: String,
  } | null,
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Jobs Collection
```javascript
{
  _id: ObjectId,
  companyName: String,
  ownerId: ObjectId,
  description: String (optional),
  status: 'active' | 'completed' | 'invoiced',
  painters: [ObjectId] (only painter type user),
  submissions: [ObjectId],
  generatedExcel: ObjectId (generated file) | null,
  generatedPDFFile: ObjectId (generated file) | null,
  generatedPDFPhotos: ObjectId (generated file) | null,
  nextGeneratedNumber: Number,
  startDate: Date,
  endDate: Date,
  createdAt: Date,
  updatedAt: Date
}

```

### 3. Submissions Collection
```javascript
{
  _id: ObjectId,
  painterId: ObjectId,
  jobId: ObjectId,
  photoNo: Int,
  location: String,
  sizes: [pairs of number],
  images: [OblectId],
  status: 'pending' | 'approved' | 'rejected',
  submittedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  revokedAt: Date,
  rejectionReason: String,
  revokeNote: String,
  createdAt: Date,
  updatedAt: Date
}

```

### 4. GeneratedFiles Collection
```javascript
{
  _id: ObjectId,
  jobId: ObjectId,
  fileType: 'excel' | 'pdf_file' | 'pdf_photos',
  fileName: String,
  r2Path: String,
  r2Url: String,
  fileSize: Number,
  status: 'generating' | 'ready',
  generatedBy: ObjectId,
  generatedAt: Date,
  expiresAt: Date,
  downloadCount: Number,
  createdAt: Date,
  updatedAt: Date
}

```

### 5. BackgroundJobs Collection
```javascript
{
  _id: ObjectId,
  jobType: 'watermarking' | 'excel_gen' | 'pdf_file_gen' | 'pdf_photo_gen' | 'email',
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: Number (0-100),
  error: String,
  retryCount: Number,
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

```

### 6. Photos Collection
```javascript
{
  _id: ObjectId,
  jobId: ObjectId,
  cloudinaryId: String,
  cloudinaryUrl: String,
  r2Path: String,
  watermarkedUrl: String (default to null),
  generatedNumber: String (unique), // 0001, 0002
  createdAt: Date,
  updatedAt: Date
}

```

---

## Data Storage

| Data | Storage | Size Limit | Cost |
|------|---------|------------|------|
| User accounts, jobs, submissions | MongoDB Atlas | 5GB free | Free tier |
| Original images | Cloudinary | 25GB/month free | Free tier |
| Watermarked images, PDFs, Excel | Cloudflare R2 | 10GB forever free | Free tier |
| Session cache, job queue | Redis (Upstash) | 10K commands/day free | Free tier |

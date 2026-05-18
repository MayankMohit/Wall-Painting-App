# Complete API Specification

---

## Authentication APIs

```
POST /api/auth/register
  Body: { email, password, role, name, phone }
  Response: { token, user }

POST /api/auth/login
  Body: { email, password }
  Response: { token, user }

POST /api/auth/logout
  Response: { success: true }

POST /api/auth/verify
  Headers: { Authorization: "Bearer <token>" }
  Response: { user, valid: true }
```

---

## Submission APIs (Painter)

```
POST /api/submissions
  Description: Create new painting submission
  Body: {
    jobId: String,
    location: String,
    paintingSize: String,
    images: [{ cloudinaryId, cloudinaryUrl }]
  }
  Response: {
    _id,
    generatedNumber: "#0001",
    canEditUntil: Date,
    watermarkingStatus: "queued"
  }

GET /api/submissions?jobId=<jobId>&status=pending
  Description: Get submissions (paginated)
  Response: { submissions: [], total, page, pageSize }

GET /api/submissions/:submissionId
  Description: Get submission with images
  Response: { submission with all details }

PUT /api/submissions/:submissionId
  Description: Edit submission (within 2-hour window)
  Body: { location?, paintingSize?, images? }
  Response: { updatedSubmission }
  Error: 409 if edit period expired

DELETE /api/submissions/:submissionId
  Description: Delete submission (within edit period)
  Response: { success: true }
```

---

## Job APIs (Owner/Admin)

```
POST /api/jobs
  Body: { jobNumber, jobName, companyId, location, budget }
  Response: { job }

GET /api/jobs?companyId=<id>&status=active
  Response: { jobs: [], total, page }

GET /api/jobs/:jobId
  Response: { job with submission stats }

PUT /api/jobs/:jobId
  Body: { jobName?, location?, status? }
  Response: { updatedJob }

GET /api/jobs/:jobId/submissions?page=1
  Response: { submissions: [], total, page }

GET /api/jobs/:jobId/statistics
  Response: {
    totalSubmissions,
    approvedSubmissions,
    pendingSubmissions,
    completionPercentage
  }
```

---

## File Generation APIs

```
POST /api/generate/excel
  Description: Trigger Excel file generation
  Body: { jobId }
  Response: { jobId, status: "queued", fileId }

POST /api/generate/photos-pdf
  Description: Trigger watermarked photos PDF generation
  Body: { jobId }
  Response: { jobId, status: "queued", fileId }

GET /api/generate/status/:generatedFileId
  Description: Check generation progress
  Response: { status: "completed" | "processing", progress: 65 }

GET /api/jobs/:jobId/files
  Description: List all generated files for job
  Response: {
    files: [
      { 
        _id,
        fileType: "excel" | "pdf_photos",
        fileName,
        r2Url,
        generatedAt,
        downloadCount
      }
    ]
  }
```

---

## Photos APIs

```
GET /api/photos/:jobId
  Description: Get all photos for a job
  Response: {
    photos: [
      {
        _id,
        submissionId,
        generatedNumber: "#0001",
        originalUrl: String (Cloudinary),
        watermarkedUrl: String (R2),
        location,
        paintingSize
      }
    ]
  }

GET /api/photos/:jobId/download-pdf
  Description: Download all watermarked photos as PDF (1 per page)
  Response: PDF file stream
  Headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="photos.pdf"'
  }

POST /api/photos/sign
  Description: Get Cloudinary upload signature
  Body: { submissionId }
  Response: { signature, timestamp, publicId, cloudName }
```

---

## File Management APIs

```
GET /api/files?jobId=<id>&fileType=excel
  Description: List files (paginated)
  Response: { files: [], total, page }

GET /api/files/:fileId/download
  Description: Get download link (R2 signed URL)
  Response: { downloadUrl, expiresIn: 3600 }

DELETE /api/files/:fileId
  Description: Delete generated file (owner only)
  Response: { success: true }
```

---

## Notification APIs

```
POST /api/notifications/fcm-token
  Description: Register FCM device token
  Body: { token: String }
  Response: { success: true }

POST /api/notifications/send-test
  Description: Send test notification (admin)
  Body: { userId, title, body }
  Response: { success: true }

GET /api/notifications?limit=20
  Description: Get user notifications (if stored in DB)
  Response: { notifications: [] }
```

---

## Owner Submission Management

```
PUT /api/owner/submissions/:submissionId
  Description: Edit submission as owner (anytime)
  Body: { location?, paintingSize?, images? }
  Response: { updatedSubmission }

DELETE /api/owner/submissions/:submissionId
  Description: Delete submission as owner
  Response: { success: true }

POST /api/owner/submissions/:submissionId/approve
  Description: Approve submission
  Body: { notes? }
  Response: { approvedSubmission }
  Action: Sends FCM + Email to painter

POST /api/owner/submissions/:submissionId/reject
  Description: Reject submission
  Body: { rejectionReason }
  Response: { rejectedSubmission }
  Action: Sends FCM + Email to painter
```

---

## Company APIs (Owner Only)

```
POST /api/companies
  Description: Create company
  Body: { name, address, city, phone, email }
  Response: { company }

GET /api/companies?ownerId=<id>
  Description: Get owner's companies
  Response: { companies: [], total }

GET /api/companies/:companyId
  Description: Get company details
  Response: { company with job count and stats }

PUT /api/companies/:companyId
  Description: Update company
  Body: { name?, address?, phone?, email? }
  Response: { updatedCompany }

DELETE /api/companies/:companyId
  Description: Delete company
  Response: { success: true }
```

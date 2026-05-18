# File Generation Pipeline

---

## Excel File Generation

```
POST /api/generate/excel with { jobId }
    ↓
Queue Job: type='excel', status='processing'
    ↓
Worker Process:
1. Fetch all submissions for job
2. Create ExcelJS workbook
3. Add columns:
   - Serial # (1, 2, 3, ...)
   - Photo # (#0001, #0002, ...)
   - Location
   - Size
4. Add data rows
5. Write to buffer
    ↓
Upload to R2: /2026/05/17/excel/job_xyz.xlsx
    ↓
Create GeneratedFile entry
    ↓
Return: { fileId, downloadUrl }
```

---

## Watermarked Photos PDF Generation

```
POST /api/generate/photos-pdf with { jobId }
    ↓
Queue Job: type='pdf_generation', status='processing'
    ↓
Worker Process:
1. Fetch all approved submissions for job
2. Create PDFKit document
3. For each submission:
   - Add new page
   - Fetch watermarked image from R2
   - Embed image (A4 size)
   - Add text: "Photo #: #0001" at bottom
4. Generate PDF buffer
    ↓
Upload to R2: /2026/05/17/pdf_photos/job_xyz_photos.pdf
    ↓
Create GeneratedFile entry
    ↓
Return: { fileId, downloadUrl }

User Can: Download and print → Cut out photos → Paste into hard files
```

---

## Watermarking Process (Background)

```
Painter submits images
    ↓
For each image:
  Queue watermarking job
    ↓
  Worker fetches image from Cloudinary
    ↓
  Load with Jimp library
    ↓
  Add watermark: generatedNumber (#0001)
    ↓
  Upload watermarked to R2
    ↓
  Update Submission.images[].watermarkedUrl
    ↓
  Mark BackgroundJob complete
```

---

## Cloudflare R2 Configuration

```javascript
// R2 bucket structure
wallpaint-files/
├── 2026/
│   ├── 05/
│   │   ├── 17/
│   │   │   ├── excel/
│   │   │   │   ├── job_xyz_abc.xlsx
│   │   │   │   └── job_def_ghi.xlsx
│   │   │   ├── pdf_photos/
│   │   │   │   ├── job_xyz_photos.pdf
│   │   │   │   └── job_def_photos.pdf
│   │   │   └── images/
│   │   │       ├── watermarked_#0001.jpg
│   │   │       └── watermarked_#0002.jpg
```

---

## Upload Service

```typescript
// services/r2Service.ts
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  fileType: 'excel' | 'pdf_photos' | 'image'
): Promise<{ path: string; publicUrl: string }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const filePath = `${year}/${month}/${day}/${fileType}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Key: filePath,
    Body: fileBuffer,
    ContentType: getContentType(fileName)
  });

  await s3Client.send(command);

  // Generate signed URL valid for 24 hours
  const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Key: filePath
  }), { expiresIn: 86400 });

  return { path: filePath, publicUrl: signedUrl };
}
```

---

## Storage Costs

```
Free Tier (5GB forever):
- ✅ Unlimited file uploads
- ✅ Unlimited downloads
- ✅ Unlimited API requests
- ✅ Signed URLs (24-hour expiry)

If exceeds 5GB:
- $0.015 per GB (vs S3: $0.023)
- First 5GB forever free
```

# Backend Architecture

---

## Core Services

### 1. Authentication Service
```typescript
// services/authService.ts
export const authService = {
  async register(email: string, password: string, role: UserRole) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await User.create({
      email,
      password: hashedPassword,
      role,
      status: 'active'
    });
  },

  async login(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error('Invalid credentials');

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return { token, user };
  }
};
```

### 2. Submission Service
```typescript
// services/submissionService.ts
export const submissionService = {
  async createSubmission(painterId: string, jobId: string, data: SubmissionData) {
    // Generate unique number for watermarking
    const generatedNumber = await this.generateUniqueNumber();

    const submission = await Submission.create({
      painterId,
      jobId,
      generatedNumber,
      location: data.location,
      paintingSize: data.paintingSize,
      images: data.images,
      status: 'pending',
      submittedAt: new Date(),
      canEditUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    });

    // Queue watermarking job
    await watermarkQueue.add({
      submissionId: submission._id,
      images: data.images,
      generatedNumber
    });

    // Send FCM notification to owner
    await notificationService.notifyOwner(
      jobId,
      'New painting submission received'
    );

    return submission;
  },

  async generateUniqueNumber(): Promise<string> {
    const count = await Submission.countDocuments();
    return `#${(count + 1).toString().padStart(4, '0')}`;
  }
};
```

### 3. File Generation Service
```typescript
// services/fileGenerationService.ts
export const fileGenerationService = {
  async generateExcel(jobId: string) {
    const submissions = await Submission.find({ jobId });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Paintings');

    // Headers
    worksheet.columns = [
      { header: 'Serial #', key: 'serial', width: 12 },
      { header: 'Photo #', key: 'photoNumber', width: 12 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Size', key: 'size', width: 15 }
    ];

    // Data rows
    submissions.forEach((sub, idx) => {
      worksheet.addRow({
        serial: idx + 1,
        photoNumber: sub.generatedNumber,
        location: sub.location,
        size: sub.paintingSize
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  },

  async generatePhotosPDF(jobId: string) {
    // PDF with all watermarked photos, one per page
    const submissions = await Submission.find({ jobId });
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    for (const submission of submissions) {
      for (const image of submission.images) {
        // Add new page
        doc.addPage();

        // Fetch watermarked image
        const imageBuffer = await fetch(image.watermarkedUrl)
          .then((r) => r.buffer());

        // Embed image
        const pdfImage = await doc.registerFont('temp', imageBuffer);
        doc.image(imageBuffer, 50, 50, { width: 500, height: 400 });

        // Add generated number at bottom
        doc.fontSize(12)
          .text(`Photo #: ${submission.generatedNumber}`, 50, 500);
      }
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }
};
```

### 4. Watermarking Service (Background Job)
```typescript
// services/watermarkingService.ts
import Jimp from 'jimp';

export const watermarkingService = {
  async watermarkImage(
    cloudinaryUrl: string,
    generatedNumber: string
  ): Promise<string> {
    // Fetch image
    const imageBuffer = await fetch(cloudinaryUrl)
      .then((r) => r.buffer());

    // Load with Jimp
    let image = await Jimp.read(imageBuffer);

    // Create watermark text
    const watermarkText = generatedNumber;
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

    // Add text to bottom-right
    image = image.print(
      font,
      image.bitmap.width - 200,
      image.bitmap.height - 60,
      watermarkText
    );

    // Convert to buffer
    const watermarkedBuffer = await image
      .quality(85)
      .getBuffer('image/jpeg');

    // Upload to R2
    return await r2Service.uploadImage(
      watermarkedBuffer,
      `watermarked_${generatedNumber}.jpg`
    );
  }
};
```

### 5. R2 File Storage Service
```typescript
// services/r2Service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!
});

export const r2Service = {
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: 'pdf' | 'excel' | 'image'
  ): Promise<{ path: string; url: string }> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const filePath = `${year}/${month}/${day}/${fileType}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: filePath,
      Body: fileBuffer,
      ContentType: this.getContentType(fileName)
    });

    await s3Client.send(command);

    // Generate signed URL (valid for 24 hours)
    const getCommand = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: filePath
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 86400
    });

    return { path: filePath, url: signedUrl };
  },

  getContentType(fileName: string): string {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.xlsx'))
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))
      return 'image/jpeg';
    if (fileName.endsWith('.png')) return 'image/png';
    return 'application/octet-stream';
  }
};
```

### 6. Notification Service
```typescript
// services/notificationService.ts
import { getMessaging } from 'firebase-admin/messaging';
import { Resend } from 'resend';

const messaging = getMessaging();
const resend = new Resend(process.env.RESEND_API_KEY);

export const notificationService = {
  async notifyOwner(
    ownerId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    const owner = await User.findById(ownerId);
    if (!owner?.fcmTokens?.length) return;

    // Send FCM push notification
    const message = {
      notification: { title, body },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon.png',
          badge: '/badge.png',
          click_action: process.env.NEXT_PUBLIC_APP_URL
        }
      }
    };

    for (const token of owner.fcmTokens) {
      try {
        await messaging.send({
          ...message,
          token
        });
      } catch (error) {
        // Remove invalid token
        await User.updateOne(
          { _id: ownerId },
          { $pull: { fcmTokens: token } }
        );
      }
    }
  },

  async sendEmail(to: string, subject: string, html: string) {
    return await resend.emails.send({
      from: 'notifications@wallpainter.app',
      to,
      subject,
      html
    });
  },

  async notifyPainter(
    painterId: string,
    event: 'submission_approved' | 'submission_rejected' | 'new_job'
  ) {
    const painter = await User.findById(painterId);

    const messages: Record<string, { title: string; body: string }> = {
      submission_approved: {
        title: 'Submission Approved ✓',
        body: 'Your painting submission has been approved!'
      },
      submission_rejected: {
        title: 'Submission Rejected',
        body: 'Your painting submission needs revision'
      },
      new_job: {
        title: 'New Job Available',
        body: 'A new job has been assigned to you'
      }
    };

    const msg = messages[event];

    // Send FCM
    await this.notifyOwner(painterId, msg.title, msg.body);

    // Send Email
    await this.sendEmail(
      painter!.email,
      msg.title,
      `<p>${msg.body}</p>`
    );
  }
};
```

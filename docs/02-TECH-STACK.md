# Tech Stack & Setup Guide

---

## Quick Setup Guide

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- Cloudflare R2 account (free tier)
- Firebase project (free tier)
- Resend account (free tier)

### Project Initialization (Already Done ✅)

```bash
# Create Next.js project with src/app structure
npx create-next-app@latest wall-painting-app \
  --typescript \
  --tailwind \
  --src-dir \
  --app \
  --no-eslint \
  --no-git

cd wall-painting-app

# Install core dependencies
npm install zustand
npm install @reduxjs/toolkit react-redux
npm install react-hook-form zod
npm install axios
npm install bcryptjs jsonwebtoken

# Install image/file libraries
npm install jimp exceljs pdfkit
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Install notification libraries
npm install firebase-admin firebase
npm install resend

# Install database
npm install mongoose

# Install queue
npm install bull redis

# Install utilities
npm install next-cors helmet
npm install dotenv

# Install for development
npm install -D @types/node @types/bcryptjs @types/jsonwebtoken
npm install -D @types/pdfkit @types/jimp
```

### Tailwind CSS v4+ Setup

No config file needed! Tailwind v4 uses sensible defaults. Just update your CSS imports:

```css
/* src/globals.css */
@import "tailwindcss";
```

Customize via CSS when needed:
```css
@import "tailwindcss";

@theme {
  --color-primary: #0050b3;
  --color-secondary: #ff7a45;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

### Environment Setup

Create `.env.local` file in project root:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/wall-painting-db

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Cloudflare R2
CLOUDFLARE_R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY=your-access-key
CLOUDFLARE_R2_SECRET_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET=wall-painting-files

# Redis (Upstash)
UPSTASH_REDIS_URL=https://default:password@host:port

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email

# Firebase Web
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# Resend
RESEND_API_KEY=your-resend-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment Architecture

### Tech Stack (Free Tier)

| Component | Service | Free Tier | Link |
|-----------|---------|-----------|------|
| **Hosting** | Vercel | 100GB bandwidth/mo | vercel.com |
| **Database** | MongoDB Atlas | 5GB storage | mongodb.com/cloud |
| **Images** | Cloudinary | 25GB/month | cloudinary.com |
| **File Storage** | Cloudflare R2 | 5GB forever | r2.dev |
| **Cache/Queue** | Upstash Redis | 10K commands/day | upstash.com |
| **Email** | Resend | 100/day | resend.com |
| **Push Notifications** | Firebase FCM | Unlimited | firebase.google.com |
| **Domain** | Custom | Paid | namecheap.com |
| **SSL** | Vercel | Included | Automatic |

---

## Updated npm Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "next": "^14.0.0"
  }
}
```

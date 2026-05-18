# Configuration Files

---

## next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization for external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/*/image/upload/**'
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com'
      }
    ]
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'Wall Painting Contractor App',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  },

  // TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false
  },

  // ESLint during build
  eslint: {
    ignoreDuringBuilds: false
  },

  // Compression
  compress: true,

  // Production optimizations
  poweredByHeader: false,

  // Security headers
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    // Target and library
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",

    // Module resolution
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,

    // Path aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    // Type checking
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Emit
    "noEmit": true,
    "outDir": "./.next/types",

    // Module features
    "allowJs": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,

    // Incremental builds
    "incremental": true,

    // Bundler features
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "strictBindCallApply": true,
    "alwaysStrict": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist"
  ]
}
```

---

## globals.css (Tailwind v4+ Setup)

```css
@import "tailwindcss";

/* Custom theme variables (optional) */
@theme {
  --color-primary: #0050b3;
  --color-secondary: #ff7a45;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --radius: 0.5rem;
}

/* Custom utilities (optional) */
@layer utilities {
  .btn-primary {
    @apply px-4 py-2 rounded bg-primary text-white font-semibold hover:opacity-90;
  }
  
  .btn-secondary {
    @apply px-4 py-2 rounded bg-secondary text-white font-semibold hover:opacity-90;
  }
}
```

---

## Deployment Flow

```
Local Development
    ↓
GitHub Push (main branch)
    ↓
GitHub Actions: Run tests, build, lint
    ↓
✅ Vercel Auto Deploy
    ↓
Production Live
    ↓
MongoDB ←→ Cloudinary ←→ R2 ←→ Redis
```

---

## GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

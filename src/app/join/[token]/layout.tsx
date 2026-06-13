import type { Metadata } from 'next';

// Open Graph / link-preview metadata for the WhatsApp invite. The join page itself
// is a client component (it auto-claims), so the OG tags live here in a server layout.
// Previews only render for the public https URL — localhost links won't preview.
export function generateMetadata(): Metadata {
  const base = process.env.NEXT_PUBLIC_APP_URL || undefined;
  const title = 'You’ve been added to a job on Wallo';
  const description = 'Tap to open your job and start uploading your work.';

  return {
    metadataBase: base ? new URL(base) : undefined,
    title,
    description,
    // NOTE: deliberately NOT setting robots:noindex — WhatsApp/Facebook's preview
    // crawler skips the preview card for noindex pages. Invite tokens are random and
    // never linked publicly, so search-indexing isn't a real risk anyway.
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Wallo',
      images: [{ url: '/app-icon.png', width: 512, height: 512, alt: 'Wallo' }],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/app-icon.png'],
    },
  };
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}

// Client-only normalizer for gallery picks, shared by the new/edit submission
// pages. Many Android phones save gallery photos as HEIC/HEIF, which Chrome on
// Android cannot decode — the preview <img> renders a broken tile and
// browser-image-compression later throws at submit. Every picked file is
// decode-tested here; HEIC gets transparently converted to JPEG (heic2any is
// lazy-loaded so painters who never pick HEIC pay nothing), and files that
// still can't be read (e.g. cloud-only Google Photos that failed to download)
// are skipped with a count the page can surface.

const HEIC_EXT_RE = /\.(heic|heif)$/i;

function looksHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || HEIC_EXT_RE.test(file.name);
}

async function isDecodable(file: Blob): Promise<boolean> {
  if (typeof createImageBitmap === 'function') {
    try {
      (await createImageBitmap(file)).close();
      return true;
    } catch {
      return false;
    }
  }
  // Older browsers: fall back to an <img> decode probe
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(true); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    img.src = url;
  });
}

async function heicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any');
  const out  = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : out;
  return new File([blob], file.name.replace(HEIC_EXT_RE, '') + '.jpg', { type: 'image/jpeg' });
}

export interface NormalizedPick {
  files: File[];
  /** Photos that couldn't be read or converted — excluded from the selection. */
  skipped: number;
}

export async function normalizePickedImages(picked: File[]): Promise<NormalizedPick> {
  const files: File[] = [];
  let skipped = 0;
  // Sequential on purpose — decoding many 12 MP photos in parallel can OOM
  // low-end phones.
  for (const file of picked) {
    if (await isDecodable(file)) {
      files.push(file);
      continue;
    }
    if (looksHeic(file)) {
      try {
        const jpeg = await heicToJpeg(file);
        if (await isDecodable(jpeg)) {
          files.push(jpeg);
          continue;
        }
      } catch { /* conversion failed — fall through to skip */ }
    }
    skipped++;
  }
  return { files, skipped };
}

export function skippedMessage(skipped: number): string {
  return skipped === 1
    ? "1 photo couldn't be read on this phone and was skipped. Try picking it again or use a different photo."
    : `${skipped} photos couldn't be read on this phone and were skipped. Try picking them again or use different photos.`;
}

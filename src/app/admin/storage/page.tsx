'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------- types ----------

interface CloudinaryData {
  plan?: string;
  last_updated?: string;
  storage?:        { usage: number; limit: number };
  bandwidth?:      { usage: number; limit: number };
  objects?:        { usage: number };
  transformations?: { usage: number };
  resources?: number;
  photoCount?: number;
  printBytes?: number;
  thumbnailBytes?: number;
  error?: string;
}

interface FileTypeBreakdown { bytes: number; count: number }

interface R2Data {
  bucket?:      string;
  objectCount?: number;
  totalBytes?:  number;
  breakdown?: {
    excel?:      FileTypeBreakdown;
    pdf_file?:   FileTypeBreakdown;
    pdf_photos?: FileTypeBreakdown;
  };
  error?: string;
}

interface MongoData {
  dataSize?:    number;
  storageSize?: number;
  collections?: number;
  objects?:     number;
  indexes?:     number;
  indexSize?:   number;
  error?: string;
}

interface StorageResponse {
  cloudinary: CloudinaryData;
  r2:         R2Data;
  mongodb:    MongoData;
}

// ---------- helpers ----------

function fmtGBVal(bytes?: number): string {
  if (bytes == null || isNaN(bytes)) return '0';
  const gb = bytes / 1e9;
  if (gb >= 0.1) return gb.toFixed(1);
  return gb.toFixed(2);
}

function fmtGB(bytes?: number): string {
  if (bytes == null || isNaN(bytes)) return '—';
  return `${(bytes / 1e9).toFixed(1)} GB`;
}

function fmtMB(bytes?: number): string {
  if (bytes == null || isNaN(bytes)) return '—';
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

// Returns separate value + unit strings for the big display number
function fmtStorageParts(bytes?: number): { value: string; unit: string } {
  if (bytes == null || isNaN(bytes)) return { value: '0', unit: 'B' };
  if (bytes >= 1e9) return { value: (bytes / 1e9).toFixed(1), unit: 'GB' };
  if (bytes >= 1e6) return { value: (bytes / 1e6).toFixed(1), unit: 'MB' };
  if (bytes >= 1e3) return { value: (bytes / 1e3).toFixed(1), unit: 'KB' };
  return { value: String(bytes), unit: 'B' };
}

function fmtStorage(bytes?: number): string {
  if (bytes == null || isNaN(bytes)) return '—';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function fmtNum(n?: number): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

function pct(used?: number, limit?: number): number | null {
  if (!used || !limit || limit === 0) return null;
  return Math.min(100, (used / limit) * 100);
}

function pctColor(used?: number, limit?: number, good = 'text-blue-500'): string {
  const p = pct(used, limit);
  if (p == null) return 'text-slate-400';
  if (p >= 80) return 'text-red-500';
  if (p >= 60) return 'text-yellow-500';
  return good;
}

function barColor(used?: number, limit?: number, good = 'bg-blue-500'): string {
  const p = pct(used, limit);
  if (p == null) return good;
  if (p >= 80) return 'bg-red-500';
  if (p >= 60) return 'bg-yellow-500';
  return good;
}

// ---------- sub-components ----------

function BreakdownRow({
  dot, label, bytes, count,
}: {
  dot: string; label: string; bytes?: number; count?: number;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs text-slate-600 truncate">{label}</span>
        {count != null && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">×{fmtNum(count)}</span>
        )}
      </div>
      <span className="text-xs font-bold text-slate-700 ml-3 flex-shrink-0">{fmtStorage(bytes)}</span>
    </div>
  );
}

function ServiceBar({
  used, limit, good,
}: {
  used?: number; limit?: number; good: string;
}) {
  const p = pct(used, limit);
  const filled = p ?? (used != null && used > 0 ? 100 : 0);
  const color  = p != null ? barColor(used, limit, good) : good;
  const opacity = p == null ? 'opacity-25' : '';
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden my-3">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${color} ${opacity}`}
        style={{ width: `${filled}%` }}
      />
    </div>
  );
}

function BandwidthSection({ usage, limit }: { usage: number; limit: number }) {
  const bwLimit = limit || 25 * 1e9;
  const bwPct   = pct(usage, bwLimit);
  return (
    <div className="pt-4 border-t border-slate-100">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bandwidth</p>
        <span className={`text-xs font-bold ${pctColor(usage, bwLimit, 'text-blue-500')}`}>
          {bwPct != null ? `${bwPct.toFixed(1)}%` : '0%'}
        </span>
      </div>
      <div className="flex items-baseline justify-between mt-1 mb-1.5">
        <span className="text-sm font-bold text-slate-700">{fmtGB(usage)}</span>
        <span className="text-xs text-slate-400">/ {fmtGB(bwLimit)}</span>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all ${barColor(usage, bwLimit, 'bg-blue-400')}`}
          style={{ width: `${Math.min(100, (usage / bwLimit) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function UnavailableCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-(--surface) p-5 rounded-(--r-md) border border-(--border) opacity-60">
      <p className="text-[10px] font-(--mono) font-bold tracking-wider text-(--ink-3) uppercase">{subtitle}</p>
      <h3 className="text-[18px] font-bold text-(--ink) mt-1">{title}</h3>
      <div className="mt-6 flex items-center gap-2 text-slate-400 text-sm">
        Service unavailable — credentials not configured
      </div>
    </div>
  );
}

// ---------- main ----------

export default function AdminStoragePage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;

  const [data,        setData]        = useState<StorageResponse | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await fetch('/api/admin/storage', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.data) { setData(json.data); setLastFetched(new Date()); }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStorage(); }, [fetchStorage]);

  const cd = data?.cloudinary;
  const r2 = data?.r2;
  const mg = data?.mongodb;

  const MONGO_LIMIT = 512 * 1e6; // 512 MB in decimal — matches Atlas UI label
  // Fallback if Cloudinary's API omits or zeroes the limit (free plan = 25 GB)
  const CD_LIMIT = cd?.storage?.limit || 25 * 1e9;

  // Totals for the summary card
  const cdUsed    = cd?.storage?.usage ?? 0;
  const r2Used    = r2?.totalBytes ?? 0;
  const mgUsed    = mg?.dataSize   ?? 0;
  const totalUsed = cdUsed + r2Used + mgUsed;

  const cdShare = totalUsed > 0 ? (cdUsed / totalUsed) * 100 : 0;
  const r2Share = totalUsed > 0 ? (r2Used / totalUsed) * 100 : 0;
  const mgShare = totalUsed > 0 ? (mgUsed / totalUsed) * 100 : 0;

  return (
    <div className="space-y-5 px-4 py-6 lg:px-8 lg:py-8 bg-(--paper) min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-(--border) pb-5">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.025em] text-(--ink)">Storage</h1>
          <p className="text-[13px] text-(--ink-3) mt-1">
            {lastFetched
              ? `Live data · last refreshed ${lastFetched.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })} IST`
              : 'Querying storage providers…'}
          </p>
        </div>
        <button
          onClick={fetchStorage}
          disabled={isLoading}
          className="h-9 px-4 rounded-full border border-(--border-2) bg-(--surface) text-[13px] font-semibold text-(--ink-2) hover:border-(--border-3) disabled:opacity-50 transition-[border-color] cursor-pointer"
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {isLoading && !data ? (
        <div className="py-24 text-center text-[13px] text-(--ink-4) animate-pulse">Querying storage providers…</div>
      ) : (
        <>
          {/* ── Summary dark card ── */}
          {data && (
            <div className="bg-(--ink) rounded-(--r-md) p-6 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                Total Across Backends
              </p>
              <div className="flex items-end justify-between mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tight">{fmtGBVal(totalUsed)}</span>
                  <span className="text-xl font-bold text-slate-400">GB used</span>
                </div>
                <span className="text-sm text-slate-500">3 backends</span>
              </div>

              {/* Stacked bar */}
              <div className="h-3 rounded-full overflow-hidden flex bg-slate-700/60 mb-4">
                {cdShare > 0 && (
                  <div className="bg-blue-500 h-3 transition-all duration-700" style={{ width: `${cdShare}%` }} />
                )}
                {r2Share > 0 && (
                  <div className="bg-orange-500 h-3 transition-all duration-700" style={{ width: `${r2Share}%` }} />
                )}
                {mgShare > 0 && (
                  <div className="bg-emerald-500 h-3 transition-all duration-700" style={{ width: `${mgShare}%` }} />
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { color: 'bg-blue-500',    label: 'Cloudinary',    used: cdUsed },
                  { color: 'bg-orange-500',  label: 'Cloudflare R2', used: r2Used },
                  { color: 'bg-emerald-500', label: 'MongoDB',       used: mgUsed },
                ].map(({ color, label, used }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-xs text-slate-300">
                      {label}
                      <span className="text-slate-500 ml-1.5">{fmtGB(used)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Service cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Cloudinary */}
            {cd?.error ? (
              <UnavailableCard title="Cloudinary" subtitle="Image CDN" />
            ) : (
              <div className="bg-(--surface) p-5 rounded-(--r-md) border border-(--border) shadow-(--shadow-sm) flex flex-col gap-0">

                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-(--ink) leading-tight">Cloudinary</h3>
                      <p className="text-[11px] text-(--ink-3)">Painter &amp; submission photos</p>
                    </div>
                  </div>
                  {cd?.plan && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-(--paper-2) text-(--ink-3) rounded-full uppercase tracking-wide">
                      {cd.plan}
                    </span>
                  )}
                </div>

                {/* Usage numbers */}
                <div className="flex items-baseline justify-between mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">{fmtGBVal(cd?.storage?.usage)}</span>
                    <span className="text-sm text-slate-400">/ {fmtGB(CD_LIMIT)}</span>
                  </div>
                  <span className={`text-sm font-bold ${pctColor(cd?.storage?.usage, CD_LIMIT, 'text-blue-500')}`}>
                    {pct(cd?.storage?.usage, CD_LIMIT) != null
                      ? `${pct(cd?.storage?.usage, CD_LIMIT)!.toFixed(1)}% used`
                      : '0% used'}
                  </span>
                </div>

                <ServiceBar used={cd?.storage?.usage} limit={CD_LIMIT} good="bg-blue-500" />

                {/* Photo breakdown */}
                {(cd?.printBytes != null || cd?.thumbnailBytes != null) && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Images Only</p>
                    {cd?.printBytes != null && (
                      <BreakdownRow dot="bg-blue-500" label="Originals" bytes={cd.printBytes} count={cd.photoCount} />
                    )}
                    {cd?.thumbnailBytes != null && (
                      <BreakdownRow dot="bg-blue-300" label="Thumbnails" bytes={cd.thumbnailBytes} count={cd.photoCount} />
                    )}
                  </div>
                )}

                {/* Bandwidth */}
                {cd?.bandwidth && (
                  <BandwidthSection usage={cd.bandwidth.usage} limit={cd.bandwidth.limit} />
                )}

                {/* Counts */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Total assets</span>
                    <span className="text-xs font-bold text-slate-700">
                      {fmtNum(cd?.objects?.usage ?? cd?.resources)}
                    </span>
                  </div>
                  {cd?.transformations?.usage != null && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Transformations</span>
                      <span className="text-xs font-bold text-slate-700">{fmtNum(cd.transformations.usage)}</span>
                    </div>
                  )}
                  {cd?.last_updated && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Stats date</span>
                      <span className="text-xs font-bold text-slate-700">{cd.last_updated}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cloudflare R2 */}
            {r2?.error ? (
              <UnavailableCard title="Cloudflare R2" subtitle="Object Storage" />
            ) : (
              <div className="bg-(--surface) p-5 rounded-(--r-md) border border-(--border) shadow-(--shadow-sm) flex flex-col gap-0">

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-(--ink) leading-tight">Cloudflare R2</h3>
                      <p className="text-[11px] text-(--ink-3)">Generated files</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-(--paper-2) text-(--ink-3) rounded-full uppercase tracking-wide">
                    Free 10 GB
                  </span>
                </div>

                {(() => {
                  const R2_FREE_LIMIT = 10 * 1e9; // 10 GB free tier
                  const used    = r2?.totalBytes ?? 0;
                  const r2Pct   = Math.min(100, (used / R2_FREE_LIMIT) * 100);
                  const r2Color = r2Pct >= 80 ? 'text-red-500' : r2Pct >= 60 ? 'text-yellow-500' : 'text-orange-500';
                  const barColor = r2Pct >= 80 ? 'bg-red-500' : r2Pct >= 60 ? 'bg-yellow-500' : 'bg-orange-400';
                  const { value: usedVal, unit: usedUnit } = fmtStorageParts(used);
                  return (
                    <>
                      <div className="flex items-baseline justify-between mt-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-(--ink)">{usedVal}</span>
                          <span className="text-sm text-(--ink-3)">{usedUnit} / 10 GB</span>
                        </div>
                        <span className={`text-sm font-bold ${r2Color}`}>
                          {r2Pct.toFixed(1)}% used
                        </span>
                      </div>

                      <div className="h-1.5 bg-(--paper-2) rounded-full overflow-hidden my-3">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${r2Pct}%` }}
                        />
                      </div>
                    </>
                  );
                })()}

                {/* File type breakdown */}
                {r2?.breakdown && Object.keys(r2.breakdown).length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-(--ink-3) mb-1">
                      Excel · Photo PDF · File PDF
                    </p>
                    {r2.breakdown.excel && (
                      <BreakdownRow dot="bg-emerald-500" label="Wall logs (Excel)"
                        bytes={r2.breakdown.excel.bytes} count={r2.breakdown.excel.count} />
                    )}
                    {r2.breakdown.pdf_photos && (
                      <BreakdownRow dot="bg-orange-500" label="Photo PDFs"
                        bytes={r2.breakdown.pdf_photos.bytes} count={r2.breakdown.pdf_photos.count} />
                    )}
                    {r2.breakdown.pdf_file && (
                      <BreakdownRow dot="bg-blue-500" label="Invoice-ready PDFs"
                        bytes={r2.breakdown.pdf_file.bytes} count={r2.breakdown.pdf_file.count} />
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-(--border) space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-(--ink-3)">Bucket</span>
                    <span className="text-xs font-bold text-(--ink)">{r2?.bucket ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-(--ink-3)">Objects</span>
                    <span className="text-xs font-bold text-(--ink)">{fmtNum(r2?.objectCount)}</span>
                  </div>
                  <p className="text-[10px] text-(--ink-4) mt-1 leading-relaxed">
                    Free tier: 10 GB storage · 10M Class A ops / month
                  </p>
                </div>
              </div>
            )}

            {/* MongoDB */}
            {mg?.error ? (
              <UnavailableCard title="MongoDB Atlas" subtitle="Document Database" />
            ) : (
              <div className="bg-(--surface) p-5 rounded-(--r-md) border border-(--border) shadow-(--shadow-sm) flex flex-col gap-0">

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-(--ink) leading-tight">MongoDB Atlas</h3>
                      <p className="text-[11px] text-(--ink-3)">Application data</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-full uppercase tracking-wide">
                    Free Tier
                  </span>
                </div>

                {(() => {
                  // Atlas 512 MB limit = on-disk data (storageSize) + indexes (indexSize)
                  const onDisk = (mg?.storageSize ?? 0) + (mg?.indexSize ?? 0);
                  const { value: mgVal, unit: mgUnit } = fmtStorageParts(onDisk);
                  const mgPct = onDisk ? Math.min(100, (onDisk / MONGO_LIMIT) * 100) : 0;
                  return (
                    <div className="flex items-baseline justify-between mt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900">{mgVal}</span>
                        <span className="text-sm text-slate-400">{mgUnit} / {fmtMB(MONGO_LIMIT)}</span>
                      </div>
                      <span className={`text-sm font-bold ${mgPct >= 80 ? 'text-red-500' : mgPct >= 60 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                        {mgPct.toFixed(mgPct < 1 ? 2 : 0)}% used
                      </span>
                    </div>
                  );
                })()}

                <ServiceBar
                  used={(mg?.storageSize ?? 0) + (mg?.indexSize ?? 0)}
                  limit={MONGO_LIMIT}
                  good="bg-emerald-500"
                />

                {/* Size breakdown */}
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                    On-disk · Data + Indexes
                  </p>
                  <BreakdownRow dot="bg-emerald-300" label="Compressed data (on-disk)" bytes={mg?.storageSize} />
                  <BreakdownRow dot="bg-blue-400"    label="Indexes"                   bytes={mg?.indexSize} />
                  <BreakdownRow dot="bg-slate-300"   label="Uncompressed docs"         bytes={mg?.dataSize} />
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Collections</span>
                    <span className="text-xs font-bold text-slate-700">{fmtNum(mg?.collections)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Documents</span>
                    <span className="text-xs font-bold text-slate-700">{fmtNum(mg?.objects)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Indexes</span>
                    <span className="text-xs font-bold text-slate-700">{fmtNum(mg?.indexes)}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}

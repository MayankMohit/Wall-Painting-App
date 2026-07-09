'use client';

import { useMemo, useState } from 'react';
import { useGetPaintersQuery, useCreatePainterMutation } from '@/store/api/endpoints/painters';
import { useUpdateJobMutation, useCreateInviteMutation, type JobInvite } from '@/store/api/endpoints/jobs';
import { ShareInviteButton } from '@/components/owner/ShareInviteButton';
import PhoneField from '@/components/common/PhoneField';
import { Search, X, Plus } from '@/components/owner/icons';
import type { Painter } from '@/store/api/endpoints/painters';

interface ExistingPainter { _id: string; name: string; phone: string }

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: 'var(--ink-2)' }}
    >
      {initials}
    </div>
  );
}

interface AddPainterModalProps {
  jobId: string;
  existingIds: string[];
  onClose: () => void;
}

export function AddPainterModal({ jobId, existingIds, onClose }: AddPainterModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'list' | 'create'>('list');

  // create-form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ExistingPainter | null>(null);

  const [added, setAdded] = useState<{ painter: Painter; invite: JobInvite | null }[]>([]); // added this session
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useGetPaintersQuery();
  const [createPainter, { isLoading: creating }] = useCreatePainterMutation();
  const [updateJob] = useUpdateJobMutation();
  const [createInvite] = useCreateInviteMutation();

  const excluded = useMemo(() => new Set([...existingIds, ...added.map((a) => a.painter._id)]), [existingIds, added]);
  const available = (data?.users ?? []).filter((p) => !excluded.has(p._id));

  const q = searchTerm.trim().toLowerCase();
  const filtered = q
    ? available.filter((p) => p.name.toLowerCase().includes(q) || (p.phone ?? '').includes(q))
    : available;

  // Suggest existing painters whose name matches what the owner is typing into the create form.
  const nameSuggestions = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (n.length < 2) return [];
    return available.filter((p) => p.name.toLowerCase().includes(n)).slice(0, 3);
  }, [name, available]);

  async function addToJob(p: { _id: string; name: string; phone?: string }) {
    setBusyId(p._id);
    try {
      await updateJob({ jobId, body: { painterIds: [...Array.from(excluded), p._id] } }).unwrap();
      // Auto-create the invite link so it's ready to share immediately.
      let invite: JobInvite | null = null;
      try {
        const inv = await createInvite({ jobId, painterId: p._id }).unwrap();
        invite = { _id: '', painterId: p._id, status: 'active', expiresAt: inv.expiresAt, lastUsedAt: null, url: inv.url, waLink: inv.waLink, message: inv.message, expiresLabel: inv.expiresLabel };
      } catch {
        /* link can be generated later from the job page */
      }
      setAdded((prev) => [...prev, { painter: { _id: p._id, name: p.name, phone: p.phone } as Painter, invite }]);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate() {
    setCreateError(null);
    setConflict(null);
    if (!name.trim() || !phone) {
      setCreateError('Enter a name and phone number.');
      return;
    }
    try {
      const { painter } = await createPainter({ name: name.trim(), phone }).unwrap();
      await addToJob({ _id: painter._id, name: painter.name, phone: painter.phone });
      setMode('list');
      setName('');
      setPhone('');
      setSearchTerm('');
    } catch (e) {
      const body = (e as { data?: { error?: { message?: string; details?: { existingPainter?: ExistingPainter } } } }).data;
      const existing = body?.error?.details?.existingPainter;
      if (existing) setConflict(existing);
      else setCreateError(body?.error?.message ?? 'Could not create painter. Try again.');
    }
  }

  function openCreate() {
    setMode('create');
    setConflict(null);
    setCreateError(null);
    // prefill the name from the search box when it doesn't look like a phone number
    setName(/^[+\d\s-]+$/.test(searchTerm) ? '' : searchTerm.trim());
    setPhone('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-(--paper) rounded-(--r-lg) overflow-hidden flex flex-col max-h-[86vh] shadow-(--shadow)">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-(--border)">
          <div className="flex-1">
            <div className="text-[16px] font-bold text-(--ink) tracking-[-0.01em]">
              {mode === 'create' ? 'New painter' : 'Add painter'}
            </div>
            {added.length > 0 && mode === 'list' && (
              <div className="text-[12px] text-(--ink-3) mt-0.5">
                <span className="font-(--mono) font-semibold text-(--approved)">{added.length}</span> added — share their link below
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) transition-colors cursor-pointer">
            <X size={17} />
          </button>
        </div>

        {mode === 'list' ? (
          <>
            {/* Search */}
            <div className="px-4 py-3 border-b border-(--border)">
              <div className="flex items-center gap-2 h-10 px-3 bg-(--surface) border border-(--border-2) rounded-(--r) focus-within:border-(--border-3) transition-[border-color]">
                <Search size={15} style={{ color: 'var(--ink-3)' }} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or phone"
                  autoFocus
                  className="flex-1 text-[14px] text-(--ink) bg-transparent outline-none placeholder:text-(--ink-4)"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-(--ink-4) hover:text-(--ink-3)"><X size={12} /></button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Added this session — share links */}
              {added.length > 0 && (
                <div className="px-4 py-3 border-b border-(--border) bg-(--paper-2)/40 space-y-3">
                  {added.map((a) => (
                    <div key={a.painter._id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.painter.name} size={28} />
                        <div className="text-[13px] font-semibold text-(--ink) flex-1 min-w-0 truncate">{a.painter.name}</div>
                      </div>
                      <ShareInviteButton jobId={jobId} painterId={a.painter._id} invite={a.invite} compact />
                    </div>
                  ))}
                </div>
              )}

              {/* Pinned: create new painter */}
              <button
                onClick={openCreate}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-(--border) text-left hover:bg-(--paper-2) transition-colors cursor-pointer"
              >
                <div className="w-8.5 h-8.5 rounded-full border-[1.5px] border-dashed border-(--border-3) flex items-center justify-center text-(--ink-3) shrink-0" style={{ width: 34, height: 34 }}>
                  <Plus size={16} weight={2.2} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-(--ink)">Create new painter</div>
                  <div className="text-[11px] text-(--ink-3) mt-0.5">Name + WhatsApp number — they log in by tapping a link</div>
                </div>
              </button>

              {/* Existing painters */}
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-(--border) animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-(--paper-2) shrink-0" />
                    <div className="flex-1 space-y-1.5"><div className="h-3.5 w-28 bg-(--paper-2) rounded" /><div className="h-2.5 w-20 bg-(--paper-2) rounded" /></div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-(--ink-3)">
                  {searchTerm ? 'No painters match — create a new one below.' : 'No painters yet — create one below.'}
                </div>
              ) : (
                filtered.map((p) => (
                  <div key={p._id} className="flex items-center gap-3 px-4 py-3 border-b border-(--border)">
                    <Avatar name={p.name} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-(--ink) truncate">{p.name}</div>
                      <div className="text-[11px] text-(--ink-3) font-(--mono) mt-0.5">{p.phone ?? p.email ?? '—'}</div>
                    </div>
                    <button
                      onClick={() => addToJob({ _id: p._id, name: p.name, phone: p.phone })}
                      disabled={busyId === p._id}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-(--r) text-[12px] font-semibold text-(--ink) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-[border-color] cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {busyId === p._id ? <span className="w-3 h-3 rounded-full border-[1.5px] border-(--ink-3) border-t-transparent animate-spin" /> : <Plus size={12} weight={2.2} />}
                      Add
                    </button>
                  </div>
                ))
              )}

              
            </div>
          </>
        ) : (
          /* ── Create mode ── */
          <div className="overflow-y-auto flex-1 px-5 py-4">
            <div className="flex flex-col gap-3.5">
              <div>
                <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Full name</div>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setConflict(null); setCreateError(null); }}
                  placeholder="Ramesh Kumar"
                  autoFocus
                  className="w-full h-12 rounded-(--r) border border-(--border-2) bg-(--surface) px-3.5 text-[15px] text-(--ink) outline-none focus:border-(--border-3)"
                />
                {nameSuggestions.length > 0 && (
                  <div className="mt-2 rounded-(--r) border border-(--border-2) overflow-hidden">
                    <div className="px-3 py-1.5 text-[11px] text-(--ink-3) bg-(--paper-2)">Did you mean an existing painter?</div>
                    {nameSuggestions.map((p) => (
                      <div key={p._id} className="flex items-center gap-2 px-3 py-2 border-t border-(--border)">
                        <Avatar name={p.name} size={26} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-(--ink) truncate">{p.name}</div>
                          <div className="text-[10px] text-(--ink-3) font-(--mono)">{p.phone ?? '—'}</div>
                        </div>
                        <button
                          onClick={() => { addToJob({ _id: p._id, name: p.name, phone: p.phone }); setMode('list'); }}
                          className="h-7 px-2.5 rounded-(--r) text-[11px] font-semibold text-(--ink) bg-(--surface) border border-(--border-2) hover:border-(--border-3) cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <PhoneField label="WhatsApp number" value={phone} onChange={(v) => { setPhone(v); setConflict(null); setCreateError(null); }} required hint="Use a number that has WhatsApp — the job link is sent there." />

              {conflict && (
                <div className="rounded-(--r) border border-(--pending) bg-(--pending-soft) p-3">
                  <div className="text-[12px] text-(--ink-2) leading-[1.45]">
                    A painter with this phone already exists:
                  </div>
                  <div className="flex items-center gap-2.5 mt-2">
                    <Avatar name={conflict.name} size={30} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-(--ink) truncate">{conflict.name}</div>
                      <div className="text-[11px] text-(--ink-3) font-(--mono)">{conflict.phone}</div>
                    </div>
                    <button
                      onClick={() => { addToJob(conflict); setMode('list'); }}
                      className="h-8 px-3 rounded-(--r) text-[12px] font-semibold text-white cursor-pointer"
                      style={{ background: 'var(--ink)' }}
                    >
                      Add to job
                    </button>
                  </div>
                </div>
              )}

              {createError && <div className="text-[12px] text-(--rejected)">{createError}</div>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setMode('list'); setConflict(null); setCreateError(null); }}
                  className="h-11 px-4 rounded-(--r) text-[14px] font-semibold text-(--ink-2) border border-(--border-2) bg-(--surface) cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !!conflict}
                  className="flex-1 h-11 rounded-(--r) text-[14px] font-bold text-white cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--ink)' }}
                >
                  {creating ? 'Creating…' : 'Create & add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

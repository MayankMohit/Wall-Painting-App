'use client';

import { useState } from 'react';
import {
  useCreateInviteMutation,
  useRevokeInviteMutation,
  type JobInvite,
} from '@/store/api/endpoints/jobs';

interface Links { waLink: string; message: string; expiresLabel: string }

interface Props {
  jobId: string;
  painterId: string;
  /** The painter's current invite (from getJobInvites). Active ones carry the link. */
  invite?: JobInvite | null;
  compact?: boolean;
}

function linksFrom(invite?: JobInvite | null): Links | null {
  if (invite && invite.status === 'active' && invite.waLink && invite.message) {
    return { waLink: invite.waLink, message: invite.message, expiresLabel: invite.expiresLabel ?? '' };
  }
  return null;
}

// Share / Copy / Revoke a painter's invite link, with an expiry countdown.
// Revoke clears the link and swaps to a single "Regenerate" button — there is no
// always-visible regenerate that could destroy a live link by accident.
export function ShareInviteButton({ jobId, painterId, invite, compact }: Props) {
  const [createInvite, { isLoading: creating }] = useCreateInviteMutation();
  const [revokeInvite, { isLoading: revoking }] = useRevokeInviteMutation();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `links` derives from the invite prop, but a local generate/revoke overrides it
  // until the parent's getJobInvites refetch catches up. Reset the override when the
  // prop identity changes (React's documented "adjust state on prop change" pattern —
  // done in render, not an effect).
  const [override, setOverride] = useState<{ value: Links | null } | null>(null);
  const [prevInvite, setPrevInvite] = useState(invite);
  if (invite !== prevInvite) {
    setPrevInvite(invite);
    setOverride(null);
  }
  const links = override ? override.value : linksFrom(invite);
  const expiry = links?.expiresLabel ?? '';

  async function generate() {
    setError(null);
    try {
      const r = await createInvite({ jobId, painterId }).unwrap();
      setOverride({ value: { waLink: r.waLink, message: r.message, expiresLabel: r.expiresLabel } });
    } catch {
      setError('Could not create link. Try again.');
    }
  }

  async function revoke() {
    setError(null);
    try {
      await revokeInvite({ jobId, painterId }).unwrap();
      setOverride({ value: null });
    } catch {
      setError('Could not revoke. Try again.');
    }
  }

  async function copy() {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-(--r) font-semibold cursor-pointer transition-[border-color,background] disabled:opacity-50 border whitespace-nowrap';
  const sz = compact ? 'h-8 px-3 text-[12px]' : 'h-9 px-3.5 text-[13px]';
  const neutral = 'border-(--border-2) bg-(--surface) text-(--ink) hover:border-(--border-3)';
  const danger = 'border-(--rejected)/30 bg-transparent text-(--rejected) hover:border-(--rejected)';

  if (links) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <a href={links.waLink} target="_blank" rel="noopener noreferrer" className={`${btn} ${sz} border-transparent text-white no-underline`} style={{ background: '#25D366' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.5 15.3L2 22l4.8-1.5A10 10 0 1012 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.5-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.3.1.7-.1 1z"/></svg>
            Share
          </a>
          <button onClick={copy} className={`${btn} ${sz} ${neutral}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={revoke} disabled={revoking} className={`${btn} ${sz} ${danger}`}>{revoking ? '…' : 'Revoke'}</button>
        </div>
        {expiry && <span className="text-[11px] text-(--ink-4)">{expiry}</span>}
        {error && <span className="text-[11px] text-(--rejected)">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={generate} disabled={creating} className={`${btn} ${sz} ${neutral}`}>
        {creating ? 'Generating…' : 'Regenerate'}
      </button>
      {error && <span className="text-[11px] text-(--rejected)">{error}</span>}
    </div>
  );
}

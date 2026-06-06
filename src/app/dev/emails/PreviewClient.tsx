'use client';

import { useState } from 'react';

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string;
  html: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Auth:    '#3a6fa3',
  Account: '#2d7a4e',
  Admin:   '#b56028',
  Jobs:    '#7a6555',
};

export function PreviewClient({ templates }: { templates: Template[] }) {
  const [activeId, setActiveId] = useState(templates[0]?.id ?? '');
  const [zoom, setZoom] = useState<'desktop' | 'mobile'>('desktop');

  const current = templates.find(t => t.id === activeId);
  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "var(--font, -apple-system, sans-serif)", background: 'var(--paper, #f9f7f4)' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--ink, #231e14)', color: '#fff', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Wallo<span style={{ color: '#d97b3a' }}>.</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 3, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600 }}>
            Email Preview — {templates.length} templates
          </div>
        </div>

        {/* Template list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {categories.map(cat => (
            <div key={cat}>
              <div style={{ padding: '8px 20px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)' }}>
                {cat}
              </div>
              {templates.filter(t => t.category === cat).map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 20px', background: activeId === t.id ? 'rgba(255,255,255,.1)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit', transition: 'background 0.1s',
                    borderLeft: activeId === t.id ? `2px solid ${CATEGORY_COLORS[cat] ?? '#d97b3a'}` : '2px solid transparent',
                  }}
                >
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: CATEGORY_COLORS[cat] ?? '#d97b3a',
                    opacity: activeId === t.id ? 1 : 0.5,
                  }} />
                  <span style={{ fontSize: 13, color: activeId === t.id ? '#fff' : 'rgba(255,255,255,.6)', fontWeight: activeId === t.id ? 500 : 400 }}>
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Preview area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', background: 'var(--surface, #fff)',
          borderBottom: '1px solid var(--border, #e8e2d8)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink, #231e14)' }}>{current?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3, #8c7e6e)', marginTop: 2 }}>
              Subject: <em>{current?.subject}</em>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['desktop', 'mobile'] as const).map(v => (
              <button
                key={v}
                onClick={() => setZoom(v)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid var(--border-2, #ddd5c8)',
                  background: zoom === v ? 'var(--ink, #231e14)' : 'transparent',
                  color: zoom === v ? '#fff' : 'var(--ink-3, #8c7e6e)',
                  fontFamily: 'inherit', transition: 'background 0.1s, color 0.1s',
                }}
              >
                {v === 'desktop' ? '⊞ Desktop' : '▭ Mobile'}
              </button>
            ))}
          </div>
        </div>

        {/* iframe */}
        <div style={{ flex: 1, overflow: 'auto', background: '#e8e2d8', display: 'flex', justifyContent: 'center', padding: '32px 24px' }}>
          {current && (
            <iframe
              key={current.id + zoom}
              srcDoc={current.html}
              style={{
                width: zoom === 'desktop' ? 680 : 390,
                height: '100%',
                minHeight: 600,
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 24px rgba(35,30,20,.15)',
                background: '#fff',
                flexShrink: 0,
              }}
              title={current.name}
              sandbox="allow-same-origin"
            />
          )}
        </div>
      </div>
    </div>
  );
}

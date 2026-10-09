/**
 * Interactive Development Analytics Debug Overlay
 * Rendered in __DEV__ mode for verifying event payloads, param limits, and log breadcrumbs.
 */

import React, { useState, useEffect } from 'react';
import { breadcrumbs } from '../logging/breadcrumbs';

export function AnalyticsDebugOverlay() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'logs'>('events');
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !window.location.search.includes('debug=true')) {
      return;
    }

    const handleEvent = (e: any) => {
      setEvents(prev => [e.detail, ...prev.slice(0, 49)]);
    };

    window.addEventListener('wehive:analytics_event', handleEvent);
    return () => window.removeEventListener('wehive:analytics_event', handleEvent);
  }, []);

  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('debug=true')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-sans">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-slate-900/90 hover:bg-black text-sky-400 border border-sky-500/30 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2"
        >
          <span>📊 Analytics Debug</span>
          <span className="bg-sky-500/20 text-sky-300 text-[10px] px-1.5 py-0.5 rounded-full">
            {events.length}
          </span>
        </button>
      ) : (
        <div className="bg-slate-950/95 border border-slate-800 text-slate-200 w-[440px] max-h-[500px] rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-sky-400">Analytics & Logs Inspector</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                __DEV__
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 rounded-lg p-0.5 text-[11px]">
                <button
                  onClick={() => setActiveTab('events')}
                  className={`px-2 py-0.5 rounded-md ${activeTab === 'events' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400'}`}
                >
                  Events ({events.length})
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-2 py-0.5 rounded-md ${activeTab === 'logs' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400'}`}
                >
                  Logs
                </button>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-1.5 font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="p-3 overflow-y-auto flex-1 space-y-2 text-xs font-mono">
            {activeTab === 'events' ? (
              events.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No events captured yet. Click elements to inspect payload.</p>
              ) : (
                events.map((evt, i) => (
                  <div key={i} className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-sky-300 font-bold">{evt.event}</span>
                      <span className="text-slate-500 text-[10px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ID: <span className="text-amber-300">{evt.element_id || 'N/A'}</span> | Screen: <span className="text-purple-300">{evt.screen}</span>
                    </div>
                    <pre className="text-[10px] text-slate-300 bg-slate-950/80 p-1.5 rounded overflow-x-auto">
                      {JSON.stringify(evt, null, 2)}
                    </pre>
                  </div>
                ))
              )
            ) : (
              breadcrumbs.getBreadcrumbs().map((b, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg text-[11px]">
                  <span className="text-emerald-400 font-semibold">{b.message}</span>
                  <span className="text-slate-500 text-[10px] block">{b.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

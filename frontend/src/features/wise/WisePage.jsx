/**
 * WisePage — top-level Wise feature page.
 *
 * Three tabs:
 *   AI Guidance   → WiseChat
 *   Interview     → Interview
 *   Travel        → Travel
 *
 * Usage:
 *   <WisePage />
 *   <WisePage applicationId="abc123" packId="us_student_visa" defaultTab="travel" />
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Mic, Globe } from 'lucide-react';
import WiseChat from './WiseChat';
import Interview from './Interview';
import Travel from './Travel';

const TABS = [
  { id: 'chat',      label: 'AI Guidance',  Icon: Sparkles },
  { id: 'interview', label: 'Interview Prep', Icon: Mic },
  { id: 'travel',    label: 'Travel',        Icon: Globe },
];

export default function WisePage({ applicationId, packId, defaultTab = 'chat' }) {
  const { tab: tabParam } = useParams();
  const validTabs = TABS.map(t => t.id);
  const initial = validTabs.includes(tabParam) ? tabParam : defaultTab;
  const [activeTab, setActiveTab] = useState(initial);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 600,
        fontFamily: 'inherit',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 16px',
          gap: 2,
          flexShrink: 0,
        }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 14px',
                border: 'none',
                borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                background: 'none',
                color: active ? '#6366f1' : '#6b7280',
                fontWeight: active ? 700 : 400,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'chat' && <WiseChat packId={packId} />}
        {activeTab === 'interview' && <Interview />}
        {activeTab === 'travel' && <Travel applicationId={applicationId} />}
      </div>
    </div>
  );
}

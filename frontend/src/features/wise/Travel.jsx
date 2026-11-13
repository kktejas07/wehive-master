/**
 * Travel — Post-visa-approval travel marketplace and checklist.
 *
 * Shows:
 *  1. Pre-travel checklist (from /travel/plan/:id)
 *  2. Affiliate marketplace categories with featured items
 */
import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckSquare, Square, ExternalLink, Plane, ShoppingBag, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../lib/apiBase';

const CATEGORY_ICONS = {
  flights: '✈️',
  hotels: '🏨',
  esim: '📱',
  forex: '💱',
  insurance: '🛡️',
  baggage: '🧳',
  shipping: '📦',
  courses: '🎓',
};

function ChecklistItem({ item, onToggle }) {
  return (
    <button
      onClick={() => onToggle(item.index)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid',
        borderColor: item.done ? '#10b98130' : '#e5e7eb',
        background: item.done ? '#10b98108' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
    >
      {item.done
        ? <CheckSquare size={18} color="#10b981" style={{ flexShrink: 0 }} />
        : <Square size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
      }
      <span style={{
        fontSize: 14,
        color: item.done ? '#6b7280' : 'inherit',
        textDecoration: item.done ? 'line-through' : 'none',
      }}>
        {item.task}
      </span>
    </button>
  );
}

function AffiliateCard({ item, onClickAffiliate }) {
  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onClickAffiliate && onClickAffiliate(item)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 14,
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow 0.15s',
        background: '#fff',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
        <ExternalLink size={14} style={{ flexShrink: 0, opacity: 0.4, marginTop: 2 }} />
      </div>
      {item.description && (
        <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.4 }}>{item.description}</div>
      )}
      {item.promo && (
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6366f1',
          background: '#6366f115',
          borderRadius: 4,
          padding: '2px 6px',
          alignSelf: 'flex-start',
        }}>
          {item.promo}
        </div>
      )}
    </a>
  );
}

function CategorySection({ category, items, onClickAffiliate }) {
  const [open, setOpen] = useState(false);
  const icon = CATEGORY_ICONS[category] || '🔗';
  const label = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{label}</span>
        <span style={{ fontSize: 12, opacity: 0.5 }}>{items.length} options</span>
        <span style={{ fontSize: 16, opacity: 0.4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {items.map((item, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <AffiliateCard key={i} item={item} onClickAffiliate={onClickAffiliate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Travel({ applicationId }) {
  const { token } = useAuth();
  const [plan, setPlan] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checklist');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // applicationId is optional — if not passed, show marketplace only
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (applicationId) {
          const [planRes, mktRes] = await Promise.all([
            axios.get(`${API}/travel/plan/${applicationId}`, { headers }),
            axios.get(`${API}/travel/marketplace/${applicationId}`, { headers }),
          ]);
          setPlan(planRes.data);
          setMarketplace(mktRes.data);
        } else {
          // No application — just show generic marketplace
          setActiveTab('marketplace');
        }
      } catch {
        // fail gracefully
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const toggleChecklist = async (itemIndex) => {
    if (!applicationId || !plan) return;
    // Optimistic update
    setPlan(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.index === itemIndex ? { ...item, done: !item.done } : item
      ),
    }));
    try {
      await axios.patch(`${API}/travel/plan/${applicationId}/checklist`, {
        item_index: itemIndex,
        done: !plan.checklist.find(i => i.index === itemIndex)?.done,
      }, { headers });
    } catch {
      // revert
      setPlan(prev => ({
        ...prev,
        checklist: prev.checklist.map(item =>
          item.index === itemIndex ? { ...item, done: !item.done } : item
        ),
      }));
    }
  };

  const trackClick = async (item, categoryId) => {
    try {
      await axios.post(`${API}/travel/clicks`, {
        application_id: applicationId,
        category_id: categoryId,
        item_name: item.name,
      }, { headers });
    } catch {
      // non-critical
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} />
      </div>
    );
  }

  const checklist = plan?.checklist || [];
  const doneCount = checklist.filter(i => i.done).length;
  const categories = marketplace?.categories || {};

  const tab = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        background: activeTab === id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
        color: activeTab === id ? '#fff' : 'inherit',
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>🌍</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Travel Marketplace</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.6 }}>
          Everything you need before and after your move
        </p>
      </div>

      {/* Tabs (only if we have a plan) */}
      {applicationId && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {tab('checklist', `Checklist (${doneCount}/${checklist.length})`, '✓')}
          {tab('marketplace', 'Marketplace', '🛒')}
        </div>
      )}

      {/* Checklist tab */}
      {activeTab === 'checklist' && applicationId && (
        <div>
          {checklist.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: 14 }}>No checklist items yet.</p>
          ) : (
            <>
              <div style={{ marginBottom: 12, fontSize: 13, opacity: 0.6 }}>
                {doneCount} of {checklist.length} tasks complete
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '4px 8px', marginBottom: 16 }}>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'linear-gradient(90deg, #10b981, #6366f1)',
                    width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%`,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checklist.map(item => (
                  <ChecklistItem key={item.index} item={item} onToggle={toggleChecklist} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Marketplace tab */}
      {activeTab === 'marketplace' && (
        <div>
          {Object.keys(categories).length === 0 ? (
            /* Fallback static categories when no API data */
            <div>
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                <div
                  key={cat}
                  style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.6 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, opacity: 0.5, margin: '8px 0 0' }}>
                    Available after visa approval
                  </p>
                </div>
              ))}
            </div>
          ) : (
            Object.entries(categories).map(([catId, items]) => (
              <CategorySection
                key={catId}
                category={catId}
                items={items}
                onClickAffiliate={item => trackClick(item, catId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

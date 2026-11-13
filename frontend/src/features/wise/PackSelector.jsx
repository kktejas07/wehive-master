/**
 * PackSelector — dropdown of Wise conversation packs.
 */
import { useEffect, useState } from 'react';
import { API } from '../../lib/apiBase';

export default function PackSelector({ value, onChange, token }) {
  const [packs, setPacks] = useState([]);

  useEffect(() => {
    fetch(`${API}/wise/packs`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => setPacks(d.packs || []))
      .catch(() => {});
  }, [token]);

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
      Pack
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 13,
          minWidth: 160,
          background: '#fff',
        }}
      >
        <option value="">General (no pack)</option>
        {packs.map(p => (
          <option key={p.id} value={p.id}>
            {p.emoji} {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}

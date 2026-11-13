/**
 * ModelSelector — dropdown of available Wise model profiles.
 */
import { useEffect, useState } from 'react';
import { API } from '../../lib/apiBase';

const FALLBACK_MODELS = [
  { id: 'fast', name: 'Fast' },
  { id: 'balanced', name: 'Balanced' },
  { id: 'powerful', name: 'Powerful' },
];

export default function ModelSelector({ value, onChange, token }) {
  const [models, setModels] = useState(FALLBACK_MODELS);

  useEffect(() => {
    fetch(`${API}/wise/models`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => {
        if (d.models?.length) setModels(d.models);
      })
      .catch(() => {});
  }, [token]);

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
      Model
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 13,
          minWidth: 130,
          background: '#fff',
        }}
      >
        {models.map(m => (
          <option key={m.id} value={m.id}>
            {m.name || m.id}
          </option>
        ))}
      </select>
    </label>
  );
}

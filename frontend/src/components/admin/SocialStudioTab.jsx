import { useEffect } from 'react';
import { adminClient } from '../../lib/admin';

// Social Studio: post calendar, poster/caption generator and enquiry log.
// The studio is a self-contained page in public/tools; it runs in a same-origin iframe
// and reaches the admin API through window.__wehiveStudio (set before the iframe loads).
const bridge = {
  getState: () => adminClient().get('/social-studio').then((r) => r.data),
  saveState: (patch) => adminClient().put('/social-studio', patch).then((r) => r.data),
  listLeads: () => adminClient().get('/leads', { params: { limit: 100 } }).then((r) => r.data.items || []),
  createLead: (lead) => adminClient().post('/leads', lead).then((r) => r.data),
  patchLead: (id, status) => adminClient().patch(`/leads/${id}`, { status }).then((r) => r.data),
};

export default function SocialStudioTab() {
  window.__wehiveStudio = bridge;
  useEffect(() => () => { delete window.__wehiveStudio; }, []);

  return (
    <iframe
      title="Social Studio"
      src="/tools/social-studio.html"
      data-testid="admin-social-studio"
      className="w-full rounded-2xl border border-[#E8EDF8] bg-white"
      style={{ height: 'calc(100vh - 64px)' }}
    />
  );
}

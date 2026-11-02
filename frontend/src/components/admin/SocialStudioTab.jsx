import { useEffect } from 'react';
import { adminClient, apiClient } from '../../lib/admin';

// Social Studio: post calendar, poster/caption generator, posting agent and enquiry log.
// The studio is a self-contained page in public/tools; it runs in a same-origin iframe
// and reaches the admin API through window.__wehiveStudio (set before the iframe loads).
// Publishing reuses Announcements (email, WhatsApp, in-app, scheduled sends).
const bridge = {
  getState: () => adminClient().get('/social-studio').then((r) => r.data),
  saveState: (patch) => adminClient().put('/social-studio', patch).then((r) => r.data),
  listLeads: () => adminClient().get('/leads', { params: { limit: 100 } }).then((r) => r.data.items || []),
  createLead: (lead) => adminClient().post('/leads', lead).then((r) => r.data),
  patchLead: (id, status) => adminClient().patch(`/leads/${id}`, { status }).then((r) => r.data),
  listNews: () => apiClient().get('/news', { params: { limit: 12 } }).then((r) => r.data.items || []),
  draft: (body) => adminClient().post('/social-studio/draft', body).then((r) => r.data),
  uploadImage: (blob, name) => {
    const fd = new FormData();
    fd.append('file', blob, name);
    return adminClient().post('/social-studio/image', fd).then((r) => r.data);
  },
  publish: (body) => apiClient().post('/announcements/admin', body).then((r) => r.data),
  testEmail: (body) => apiClient().post('/announcements/admin/test', body).then((r) => r.data),
  testWhatsapp: (body) => apiClient().post('/announcements/admin/test-whatsapp', body).then((r) => r.data),
  history: () => apiClient().get('/announcements/admin', { params: { limit: 20 } }).then((r) => r.data.items || r.data || []),
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

import { api } from '@/core/api/client';

/** Model: an approved news item from /api/news (aggregated from official and trusted feeds). */
export interface NewsItem {
  id: string;
  title: string;
  country_id?: string;
  date?: string | null;
  published_at?: string | null;
  category?: string;
  content?: string;
  source_url?: string;
  source_name?: string;
}

export interface NewsPage {
  items: NewsItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const newsApi = {
  page: (page: number, limit = 20, country_id?: string) =>
    api<NewsPage>('/news', { query: { page, limit, country_id, sort: 'published_at', order: 'desc' } }),
};

export { preview, relativeTime } from './format';

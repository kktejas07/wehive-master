export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  cover_image?: string;
  author?: string;
  published_at?: string;
  tags?: string[];
  status?: string;
}

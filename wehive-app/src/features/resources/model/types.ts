export interface Resource {
  id: string;
  title: string;
  category?: string;
  body?: string;
  url?: string;
  icon?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  done?: boolean;
}

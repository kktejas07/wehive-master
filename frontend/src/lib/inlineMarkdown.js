import { createElement } from 'react';

// **bold**, *italic* and _italic_. `_` only counts at word edges so snake_case is left alone.
const TOKEN = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|\b_[^_\n]+_\b)/;

/**
 * Render the small markdown subset the assistants use, as React nodes.
 * No innerHTML: model output can quote text from the web, so it must never be parsed as HTML.
 */
export function renderInlineMarkdown(text) {
  return String(text ?? '')
    .split(TOKEN)
    .map((part, i) => {
      if (i % 2 === 0) return part; // plain text between tokens
      const bold = part.startsWith('**');
      return createElement(bold ? 'strong' : 'em', { key: i }, bold ? part.slice(2, -2) : part.slice(1, -1));
    });
}

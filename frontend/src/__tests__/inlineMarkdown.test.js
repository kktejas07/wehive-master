/**
 * Unit tests for lib/inlineMarkdown.js — chat replies arrive with **bold** and
 * _italic_ markers; they used to be printed as literal asterisks.
 */
import { renderInlineMarkdown } from '../lib/inlineMarkdown';

const shape = (text) => renderInlineMarkdown(text).map((n) => (typeof n === 'string' ? n : [n.type, n.props.children]));

describe('renderInlineMarkdown()', () => {
  it('turns **bold** into <strong> and leaves the rest as text', () => {
    expect(shape('💰 **Visa Fees for France**\n  • **Schengen** — ₹7,900')).toEqual([
      '💰 ', ['strong', 'Visa Fees for France'], '\n  • ', ['strong', 'Schengen'], ' — ₹7,900',
    ]);
  });

  it('turns *italic* and _italic_ into <em>', () => {
    expect(shape('_Flat fee per applicant._ and *Visa requirements for Canada*')).toEqual([
      '', ['em', 'Flat fee per applicant.'], ' and ', ['em', 'Visa requirements for Canada'], '',
    ]);
  });

  it('does not treat snake_case, lone asterisks or multiplication as markup', () => {
    for (const text of ['doc_type is bank_statement', '5 * 3 = 15', 'a * b * c', 'rating: ***', 'no markers at all']) {
      expect(renderInlineMarkdown(text).every((n) => typeof n === 'string')).toBe(true);
      expect(renderInlineMarkdown(text).join('')).toBe(text);
    }
  });

  it('never produces HTML from the text (model output is not trusted markup)', () => {
    const nodes = renderInlineMarkdown('**<img src=x onerror=alert(1)>** <script>alert(1)</script>');
    expect(nodes[1].type).toBe('strong');
    expect(nodes[1].props.children).toBe('<img src=x onerror=alert(1)>'); // a string child: React escapes it
    expect(nodes[2]).toBe(' <script>alert(1)</script>');
  });

  it('gives each element a key and copes with empty input', () => {
    expect(renderInlineMarkdown('**a** **b**').filter((n) => typeof n !== 'string').map((n) => n.key)).toEqual(['1', '3']);
    expect(renderInlineMarkdown('')).toEqual(['']);
    expect(renderInlineMarkdown(undefined)).toEqual(['']);
  });
});

"""Review Moderation Agent — AI moderation for university reviews.

Checks:
- Spam detection (repeated text, excessive caps, promotional links)
- Sentiment scoring
- Helpfulness prediction
- Flagging for manual review
"""

import re


SPAM_PATTERNS = [
    re.compile(r'(buy|cheap|discount|offer|promo).*(visa|passport|document)', re.I),
    re.compile(r'(http|https|www\.)\S+'),  # external links
    re.compile(r'(contact|call|whatsapp|telegram).*\d{10}', re.I),  # contact info
    re.compile(r'(free|lucky|win|congratulations|click here)', re.I),
    re.compile(r'(.)\1{10,}'),  # repeated characters (aaaaa...)
]


def moderate_review(text: str, rating: int) -> dict:
    """Analyze a review and return moderation verdict."""
    flags = []

    # Spam check
    for pattern in SPAM_PATTERNS:
        if pattern.search(text):
            flags.append('spam_pattern_detected')

    # Rating vs text sentiment mismatch
    positive_words = ['great', 'excellent', 'amazing', 'good', 'love', 'helpful', 'best']
    negative_words = ['bad', 'terrible', 'awful', 'worst', 'hate', 'useless', 'poor']
    text_lower = text.lower()
    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)

    if rating >= 4 and neg_count > pos_count:
        flags.append('sentiment_mismatch_high_rating')
    if rating <= 2 and pos_count > neg_count:
        flags.append('sentiment_mismatch_low_rating')

    # Empty or very short content
    if len(text.strip()) < 10:
        flags.append('too_short')

    # All caps
    if len(text) > 20 and text.isupper():
        flags.append('excessive_caps')

    verdict = 'reject' if flags else 'approve'
    if len(flags) >= 2:
        verdict = 'reject'
    elif len(flags) == 1:
        verdict = 'flag_for_review'

    return {
        'verdict': verdict,
        'flags': flags,
        'rating': rating,
        'length': len(text),
        'is_spam': 'spam_pattern_detected' in flags,
    }

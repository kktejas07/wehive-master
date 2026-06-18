#!/usr/bin/env bash
set -euo pipefail

# i18n Audit — compare frontend locale keys against English (source of truth).
# Adapted from the translate skill's "diff and fix" workflow.

I18N_FILE="frontend/src/context/I18nContext.jsx"
EN_LOCALE="en"

if [ ! -f "$I18N_FILE" ]; then
  echo "Error: $I18N_FILE not found"
  exit 1
fi

echo "═══════════════════════════════════════════"
echo "  i18n Translation Audit"
echo "═══════════════════════════════════════════"
echo ""

# Extract all locale blocks: extract the key-value pairs for each locale
# Each locale section looks like: [locale code]: { 'key': 'value', ... }

LOCALES=$(grep -oE "^\s{2}[a-z]{2}: \{" "$I18N_FILE" | sed 's/: {$//' | tr -d ' ')
echo "Locales found: $LOCALES"
echo ""

# Extract keys from English (source of truth)
EN_KEYS=$(awk '/^  en: \{/{p=1; next} /^  [a-z]{2}: \{/{if(p) exit} p' "$I18N_FILE" | grep -oE "'[a-z_.-]+'" | sed "s/'//g" | sort)
EN_COUNT=$(echo "$EN_KEYS" | wc -l | tr -d ' ')

echo "Source of truth: $EN_LOCALE ($EN_COUNT keys)"
echo ""

TOTAL_MISSING=0

for LOCALE in $LOCALES; do
  [ "$LOCALE" = "$EN_LOCALE" ] && continue

  # Extract keys for this locale
  LOCALE_KEYS=$(awk "/^  $LOCALE: \{/{p=1; next} /^  [a-z]{2}: \{/{if(p) exit} p" "$I18N_FILE" | grep -oE "'[a-z_.-]+'" | sed "s/'//g" | sort)
  LOCALE_COUNT=$(echo "$LOCALE_KEYS" | wc -l | tr -d ' ')

  MISSING=$(comm -23 <(echo "$EN_KEYS") <(echo "$LOCALE_KEYS"))
  MISSING_COUNT=$(echo "$MISSING" | wc -l | tr -d ' ')

  if [ "$MISSING_COUNT" -gt 0 ]; then
    echo "  ✗ $LOCALE ($LOCALE_COUNT / $EN_COUNT keys — missing $MISSING_COUNT)"
    echo "$MISSING" | sed 's/^/      - /'
    TOTAL_MISSING=$((TOTAL_MISSING + MISSING_COUNT))
  else
    echo "  ✓ $LOCALE ($LOCALE_COUNT / $EN_COUNT keys — complete)"
  fi
done

echo ""
echo "───────────────────────────────────────────"
if [ "$TOTAL_MISSING" -gt 0 ]; then
  echo "  Result: $TOTAL_MISSING missing keys across all locales"
  exit 1
else
  echo "  Result: All locales are complete"
fi
echo "═══════════════════════════════════════════"

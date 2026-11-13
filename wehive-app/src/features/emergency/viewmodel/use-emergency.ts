import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

const PHONE_RAW = '+917799144440';

export function useEmergency() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = useCallback((index: number) => {
    setExpandedFaq((prev) => (prev === index ? null : index));
  }, []);

  const callHelpline = useCallback(() => {
    Linking.openURL(`tel:${PHONE_RAW}`);
  }, []);

  return { expandedFaq, toggleFaq, callHelpline, phone: PHONE_RAW, phoneDisplay: '+91 77991 44440' };
}

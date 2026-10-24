import type { Metadata } from 'expo-router/server';

import { HomeScreen } from '@/features/home/view/home-screen';

export function generateMetadata(): Metadata {
  return {
    title: 'WeHive — Visas, Study Abroad & Travel for Indian Passport Holders',
    description: 'Visa rules and decision times for 190+ destinations, university applications and expert help. Your Global Journey Starts Here.',
  };
}

export default HomeScreen;

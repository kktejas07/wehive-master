import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { schedulingApi, type UserApplication } from '../model/scheduling-api';

export type Phase = 'list' | 'select_app' | 'select_city' | 'select_slot' | 'confirm';

export function useScheduling() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('list');
  const [appId, setAppId] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [slotId, setSlotId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const appointments = useQuery({
    queryKey: ['visa-scheduling', 'my-appointments'],
    queryFn: ({ signal }) => schedulingApi.myAppointments(signal),
  });

  const applications = useQuery({
    queryKey: ['my-applications'],
    queryFn: ({ signal }) => schedulingApi.myApplications(signal),
    enabled: phase !== 'list',
    staleTime: 5 * 60_000,
  });

  const slots = useQuery({
    queryKey: ['visa-slots', country],
    queryFn: ({ signal }) => schedulingApi.slots(country, signal),
    enabled: !!country && (phase === 'select_slot' || phase === 'confirm'),
  });

  const booking = useMutation({
    mutationFn: () =>
      schedulingApi.book({ application_id: appId, slot_id: slotId, date, time, embassy: country.toUpperCase(), city }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visa-scheduling', 'my-appointments'] });
      setPhase('list');
    },
  });

  const startBooking = () => setPhase('select_app');

  const selectApp = (app: UserApplication) => {
    setAppId(app._id);
    setCountry(app.country_id ?? '');
    setPhase('select_city');
  };

  const selectCity = (c: string) => {
    setCity(c);
    setPhase('select_slot');
  };

  const selectSlot = (id: string, d: string, t: string) => {
    setSlotId(id);
    setDate(d);
    setTime(t);
    setPhase('confirm');
  };

  const back = () => {
    const order: Phase[] = ['list', 'select_app', 'select_city', 'select_slot', 'confirm'];
    const idx = order.indexOf(phase);
    setPhase(order[Math.max(0, idx - 1)]);
  };

  return {
    phase,
    appointments: appointments.data ?? [],
    appointmentsLoading: appointments.isPending,
    apps: (applications.data ?? []).filter((a) => a.status === 'submitted' || a.status === 'draft'),
    appsLoading: applications.isPending,
    availableSlots: (slots.data ?? []).filter((s) => !s.booked),
    slotsLoading: slots.isPending,
    country,
    city,
    date,
    time,
    bookingLoading: booking.isPending,
    bookingError: booking.error?.message ?? null,
    startBooking,
    selectApp,
    selectCity,
    selectSlot,
    book: () => booking.mutate(),
    back,
  };
}

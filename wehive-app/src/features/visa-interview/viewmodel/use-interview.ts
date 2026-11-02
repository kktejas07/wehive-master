import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { interviewApi, INTERVIEW_SETS, type InterviewQuestion, type ScoreResult } from '../model/interview-api';

export type Phase = 'select' | 'interview' | 'scoring' | 'results';

interface AnswerEntry {
  question: string;
  answer: string;
}

export function useInterview() {
  const [setId, setSetId] = useState('us');
  const [phase, setPhase] = useState<Phase>('select');
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const interviewSet = INTERVIEW_SETS.find((s) => s.id === setId) ?? INTERVIEW_SETS[0];
  const questions: InterviewQuestion[] = interviewSet.questions;
  const current = questions[qIndex] ?? null;

  const scoring = useMutation({
    mutationFn: (entries: AnswerEntry[]) =>
      interviewApi.score(
        interviewSet.label,
        entries.map((e) => ({ question: e.question, answer: e.answer === '(skipped)' ? '' : e.answer })),
      ),
  });

  // Timer
  useEffect(() => {
    if (phase !== 'interview') return;
    timer.current = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase, qIndex]);

  const advance = useCallback(
    (text: string) => {
      const entry: AnswerEntry = { question: current?.question ?? '', answer: text.trim() || '(skipped)' };
      const next = [...answers, entry];
      setAnswers(next);
      setAnswer('');
      if (qIndex + 1 < questions.length) {
        setQIndex((i) => i + 1);
        setTimeLeft(120);
      } else {
        setPhase('scoring');
        scoring.mutate(next, { onSettled: () => setPhase('results') });
      }
    },
    [current, answers, qIndex, questions.length, scoring],
  );

  useEffect(() => {
    if (phase === 'interview' && timeLeft === 0) advance('(skipped)');
  }, [phase, timeLeft, advance]);

  const submitAnswer = useCallback(() => advance(answer), [answer, advance]);
  const skip = useCallback(() => advance('(skipped)'), [advance]);

  const start = useCallback(() => {
    setQIndex(0);
    setAnswers([]);
    setAnswer('');
    setTimeLeft(120);
    scoring.reset();
    setPhase('interview');
  }, [scoring]);

  const restart = useCallback(() => {
    setPhase('select');
    setQIndex(0);
    setAnswers([]);
    scoring.reset();
  }, [scoring]);

  return {
    sets: INTERVIEW_SETS,
    setId,
    setSetId,
    interviewSet,
    phase,
    qIndex,
    total: questions.length,
    current,
    answer,
    setAnswer,
    timeLeft,
    answers,
    result: (scoring.data ?? (scoring.error ? ({ error: true } as ScoreResult) : null)) as ScoreResult | null,
    resultLoading: scoring.isPending,
    start,
    submitAnswer,
    skip,
    restart,
  };
}

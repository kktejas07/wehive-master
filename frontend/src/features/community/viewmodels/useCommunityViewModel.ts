// TODO: wire this hook to views/pages/Community.jsx in Stage 3
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth, API } from '../../../context/AuthContext';

export interface CommunityPost {
  id: string;
  type: 'question' | 'tip' | 'experience';
  visa_type: string;
  body: string;
  author?: string;
  likes: number;
  liked_by_me?: boolean;
  comments?: CommunityComment[];
  created_at: string;
}

export interface CommunityComment {
  id: string;
  body: string;
  author?: string;
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  example_answer?: string;
  visa_type: string;
}

export function useCommunityViewModel() {
  const { token, isAuthed, openAuth } = useAuth();

  const [visaType, setVisaType] = useState('us-f1');
  const [visaTypes, setVisaTypes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<CommunityPost[]>([]);
  const [tips, setTips] = useState<CommunityPost[]>([]);
  const [experiences, setExperiences] = useState<CommunityPost[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'questions' | 'tips' | 'experiences' | 'interview'>('questions');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    axios.get(`${API}/community/visa-types`)
      .then((r) => setVisaTypes(r.data ?? []))
      .catch(() => setVisaTypes([]));
  }, []);

  const fetchPosts = useCallback(async (path: string, setter: (v: CommunityPost[]) => void) => {
    try {
      const r = await axios.get(`${API}/community/${path}`, { params: { visa_type: visaType || undefined, limit: 30 } });
      setter(r.data?.items ?? r.data ?? []);
    } catch { setter([]); }
  }, [visaType]);

  const fetchInterviewQuestions = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/community/interview-questions`, { params: { visa_type: visaType } });
      setInterviewQuestions(r.data?.items ?? r.data ?? []);
    } catch { setInterviewQuestions([]); }
  }, [visaType]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPosts('questions', setQuestions),
      fetchPosts('tips', setTips),
      fetchPosts('experiences', setExperiences),
      fetchInterviewQuestions(),
    ]).finally(() => setLoading(false));
  }, [fetchPosts, fetchInterviewQuestions]);

  const submitPost = useCallback(async (path: string, body: Record<string, unknown>) => {
    if (!isAuthed) { openAuth?.(); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/community/${path}`, body, { headers });
      // Refresh relevant list
      if (path === 'questions') await fetchPosts('questions', setQuestions);
      else if (path === 'tips') await fetchPosts('tips', setTips);
      else if (path === 'experiences') await fetchPosts('experiences', setExperiences);
    } finally { setSubmitting(false); }
  }, [isAuthed, fetchPosts]); // eslint-disable-line react-hooks/exhaustive-deps

  const likePost = useCallback(async (postId: string, path: string) => {
    if (!isAuthed) { openAuth?.(); return; }
    await axios.post(`${API}/community/${path}/${postId}/like`, {}, { headers });
    if (path === 'questions') fetchPosts('questions', setQuestions);
    else if (path === 'tips') fetchPosts('tips', setTips);
    else fetchPosts('experiences', setExperiences);
  }, [isAuthed, fetchPosts]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitComment = useCallback(async (postId: string, path: string, text: string) => {
    if (!isAuthed) { openAuth?.(); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/community/${path}/${postId}/comments`, { body: text }, { headers });
      if (path === 'questions') await fetchPosts('questions', setQuestions);
    } finally { setSubmitting(false); }
  }, [isAuthed, fetchPosts]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isAuthed,
    visaType, setVisaType,
    visaTypes,
    questions, tips, experiences, interviewQuestions,
    loading, submitting,
    tab, setTab,
    submitPost,
    likePost,
    submitComment,
  };
}

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, Sparkles, AlertCircle, Bot, User, CheckCircle,
  MessageSquare, Users, Search, Share2, GraduationCap, Filter,
  PlusCircle, Compass, Heart, MapPin, Check, ChevronRight, 
  ArrowLeft, ArrowUpRight, HelpCircle, ThumbsUp, MessageCircle,
  Mic, MicOff, Volume2, VolumeX, Square, Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { Message } from "../types";
import { useNotifications } from "./NotificationContext";

const SUGGESTIONS = [
  "🇬🇧 Tell me about the UK Graduate Route.",
  "🇨🇦 SDS Study Visa requirements for Canada.",
  "📝 How to write a stellar SOP for Masters?",
  "🇩🇪 Public vs private universities in Germany."
];

// Interface definitions for community systems
interface GroupMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  text: string;
  timestamp: string;
  likes: number;
  hasLiked?: boolean;
}

interface UniversityCircle {
  id: string;
  name: string;
  logo: string;
  membersCount: number;
  unreadCount: number;
  topics: string[];
  messages: GroupMessage[];
}

interface PeerStudent {
  id: string;
  name: string;
  avatar: string;
  academicLevel: string;
  targetUniversity: string;
  fieldOfStudy: string;
  intake: string;
  status: string;
  isOnline: boolean;
  unreadCount: number;
  chatHistory: { sender: "peer" | "user"; text: string; timestamp: string }[];
}

export default function ChatTab() {
  const { triggerNotification } = useNotifications();

  // Primary toggle tab: "counselor" (AI) vs "assistant" (Voice Studio) vs "community" (Student Circles)
  const [viewMode, setViewMode] = useState<"counselor" | "assistant" | "community">("counselor");

  // Hive AI Counselor States
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hello! I am **Hive AI**, WeHive's Senior AI Admissions & Visa Counselor. 👋\n\nHow can I help you map out your global studies today? Ask me about **IELTS splits, high-salary courses, blocked accounts, or university shortlists!**"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice Prompt & Text-To-Speech States
  const [isListening, setIsListening] = useState(false);
  const [recognitionTranscript, setRecognitionTranscript] = useState("");
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [isListeningModeSimulated, setIsListeningModeSimulated] = useState(false);
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(false);
  const [speechRecognitionInstance, setSpeechRecognitionInstance] = useState<any>(null);

  // Community States
  const [selectedCircleId, setSelectedCircleId] = useState<string>("tum");
  const [groupInput, setGroupInput] = useState("");
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [peerInput, setPeerInput] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUniversity, setFilterUniversity] = useState<string>("All");

  // Load current academic level dynamically from HomeTab/localStorage context
  const [userAcademicLevel, setUserAcademicLevel] = useState("Master's Degree");
  useEffect(() => {
    try {
      const savedLevel = localStorage.getItem("wehive_academic_level");
      if (savedLevel) {
        setUserAcademicLevel(savedLevel);
      }
    } catch (e) {
      console.warn("Failed to read user academic level:", e);
    }
  }, [viewMode]);

  // Pre-populated active university circles
  const [circles, setCircles] = useState<UniversityCircle[]>([
    {
      id: "tum",
      name: "Technical University of Munich Admissions",
      logo: "🇩🇪",
      membersCount: 1420,
      unreadCount: 3,
      topics: ["APS Verification", "Blocked Account", "Winter Intake", "Munich Housing"],
      messages: [
        {
          id: "m-1",
          senderName: "Aarav Kapoor",
          senderAvatar: "AK",
          senderRole: "Master's Applicant",
          text: "Hey guys, did anyone receive their APS certificate recently? I've been waiting for 4 weeks.",
          timestamp: "10:15 AM",
          likes: 5,
          hasLiked: false
        },
        {
          id: "m-2",
          senderName: "Clara Schmidt",
          senderAvatar: "CS",
          senderRole: "Incoming TUM Student",
          text: "Yes Aarav! Mine took exactly 32 days. They have a massive backlog due to the winter intake rush. Hang in there!",
          timestamp: "10:30 AM",
          likes: 8,
          hasLiked: true
        },
        {
          id: "m-3",
          senderName: "Devon Lee",
          senderAvatar: "DL",
          senderRole: "Master's Applicant",
          text: "Does anyone know if TUM requires physical paper copies of documents for M.Sc. Informatics, or is everything online now?",
          timestamp: "11:02 AM",
          likes: 2,
          hasLiked: false
        },
        {
          id: "m-4",
          senderName: "Ananya Sen",
          senderAvatar: "AS",
          senderRole: "Same Goal Match 🎯",
          text: "TUM's application process is 100% digital now! But remember, once admitted, you'll need to send certified hard copies for enrollment. Best of luck!",
          timestamp: "11:15 AM",
          likes: 12,
          hasLiked: false
        }
      ]
    },
    {
      id: "rwth",
      name: "RWTH Aachen Engineering Circle",
      logo: "🇩🇪",
      membersCount: 940,
      unreadCount: 0,
      topics: ["Mechanical Eng", "Aachen Accommodation", "German Language Level"],
      messages: [
        {
          id: "rwth-1",
          senderName: "Lara Meier",
          senderAvatar: "LM",
          senderRole: "Visa Approved Student ✈️",
          text: "Just got my German visa stamp today! Let me know if anyone needs help preparing the VFS checklists.",
          timestamp: "Yesterday",
          likes: 24,
          hasLiked: true
        },
        {
          id: "rwth-2",
          senderName: "Raj Patel",
          senderAvatar: "RP",
          senderRole: "Master's Applicant",
          text: "Lara! Did you submit a physical block account confirmation, or just the digital PDF printout from Fintiba?",
          timestamp: "Yesterday",
          likes: 4,
          hasLiked: false
        },
        {
          id: "rwth-3",
          senderName: "Lara Meier",
          senderAvatar: "LM",
          senderRole: "Visa Approved Student ✈️",
          text: "Just the standard 1-page digital PDF printout from Fintiba is perfect. VFS officers see it every day, no need to worry!",
          timestamp: "Yesterday",
          likes: 9,
          hasLiked: false
        }
      ]
    },
    {
      id: "heidelberg",
      name: "Heidelberg Medical & Science Board",
      logo: "🇩🇪",
      membersCount: 730,
      unreadCount: 0,
      topics: ["Pre-Enrollment", "Scholarships", "Heidelberg WG"],
      messages: [
        {
          id: "hb-1",
          senderName: "Emily Watson",
          senderAvatar: "EW",
          senderRole: "PhD Candidate",
          text: "Heidelberg is absolutely stunning, but finding shared housing is very competitive. My advice is to check WG-Gesucht every hour!",
          timestamp: "2 days ago",
          likes: 15,
          hasLiked: false
        },
        {
          id: "hb-2",
          senderName: "Arjun Rao",
          senderAvatar: "AR",
          senderRole: "Bachelor's Applicant",
          text: "Thanks Emily! Are university dormitories open for international first-years, or is it a lottery system?",
          timestamp: "2 days ago",
          likes: 3,
          hasLiked: false
        }
      ]
    },
    {
      id: "fu_berlin",
      name: "Free University of Berlin Socials",
      logo: "🇩🇪",
      membersCount: 880,
      unreadCount: 1,
      topics: ["Social Sciences", "Berlin WG", "Anmeldung Process"],
      messages: [
        {
          id: "fb-1",
          senderName: "Sarah Jenkins",
          senderAvatar: "SJ",
          senderRole: "Same Goal Match 🎯",
          text: "Finding an apartment with registration (Anmeldung) in Berlin is the real final boss. Make sure your landlord explicitly signs the Wohnungsgeberbestätigung!",
          timestamp: "3 days ago",
          likes: 19,
          hasLiked: true
        }
      ]
    }
  ]);

  // Pre-populated active peers directory with chat history
  const [peers, setPeers] = useState<PeerStudent[]>([
    {
      id: "pranav",
      name: "Pranav Sharma",
      avatar: "PS",
      academicLevel: "Master's Degree",
      targetUniversity: "TU Munich",
      fieldOfStudy: "M.Sc. Computational Science",
      intake: "Winter 2026",
      status: "Blocked Account Funded 💰",
      isOnline: true,
      unreadCount: 1,
      chatHistory: [
        { sender: "peer", text: "Hey there! I saw you are also targeting Munich. Have you finished your APS certificate submission?", timestamp: "10:05 AM" }
      ]
    },
    {
      id: "lara",
      name: "Lara Meier",
      avatar: "LM",
      academicLevel: "Master's Degree",
      targetUniversity: "RWTH Aachen",
      fieldOfStudy: "M.Sc. Sustainable Energy",
      intake: "Summer 2026",
      status: "Visa Approved! ✈️🇩🇪",
      isOnline: true,
      unreadCount: 0,
      chatHistory: [
        { sender: "peer", text: "Hi! Aachen is incredible. Let me know if you need any tips on preparing your SOP or visa cover letter!", timestamp: "Yesterday" }
      ]
    },
    {
      id: "arjun",
      name: "Arjun Rao",
      avatar: "AR",
      academicLevel: "Bachelor's",
      targetUniversity: "Heidelberg University",
      fieldOfStudy: "B.Sc. Molecular Biotechnology",
      intake: "Winter 2026",
      status: "SOP Final Draft 📝",
      isOnline: false,
      unreadCount: 0,
      chatHistory: [
        { sender: "peer", text: "Hello! Preparing my biology admission portfolio. Let me know if you want to swap peer reviews on essays!", timestamp: "2 days ago" }
      ]
    },
    {
      id: "sarah",
      name: "Sarah Jenkins",
      avatar: "SJ",
      academicLevel: "Master's Degree",
      targetUniversity: "Free University of Berlin",
      fieldOfStudy: "M.A. Global History",
      intake: "Winter 2026",
      status: "APS Completed ✔",
      isOnline: true,
      unreadCount: 0,
      chatHistory: [
        { sender: "peer", text: "Hey! Berlin is the absolute dream. Let me know if you're trying to figure out the public transport discounts for students.", timestamp: "3 days ago" }
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const communityEndRef = useRef<HTMLDivElement | null>(null);
  const peerEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll chats when message lists change
    if (viewMode === "counselor") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (selectedPeerId) {
      peerEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      communityEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, viewMode, selectedPeerId, circles, peers]);

  // Check browser speech recognition compatibility and clean up
  useEffect(() => {
    const SpeechObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechObj) {
      setSpeechRecognitionSupported(false);
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if ((window as any)._simulatedVoiceInterval) {
        clearInterval((window as any)._simulatedVoiceInterval);
      }
    };
  }, []);

  const triggerSimulatedListening = () => {
    setIsListening(true);
    setIsListeningModeSimulated(true);
    setRecognitionTranscript("");

    const simulatedPhrases = [
      "Hello, I am planning ",
      "Hello, I am planning to study ",
      "Hello, I am planning to study Computer Science ",
      "Hello, I am planning to study Computer Science in Germany. ",
      "Hello, I am planning to study Computer Science in Germany. What are the requirements ",
      "Hello, I am planning to study Computer Science in Germany. What are the requirements for APS verification and ",
      "Hello, I am planning to study Computer Science in Germany. What are the requirements for APS verification and blocked accounts?"
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < simulatedPhrases.length) {
        setRecognitionTranscript(simulatedPhrases[currentIdx]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 750);

    (window as any)._simulatedVoiceInterval = interval;
  };

  const startListening = () => {
    const SpeechObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    // Stop any speech first
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageIndex(null);

    if (!SpeechObj) {
      setSpeechRecognitionSupported(false);
      triggerSimulatedListening();
      return;
    }

    try {
      const rec = new SpeechObj();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setIsListeningModeSimulated(false);
        setRecognitionTranscript("");
        setError(null);
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const fullText = finalTranscript || interimTranscript;
        setRecognitionTranscript(fullText);
      };

      rec.onerror = (event: any) => {
        console.warn("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          triggerNotification(
            "Microphone Restricted",
            "To use live mic dictation, please grant microphone permissions. Switched to simulated Elevate Labs audio mode!",
            "system"
          );
          rec.abort();
          triggerSimulatedListening();
        } else {
          setIsListening(false);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setSpeechRecognitionInstance(rec);
      rec.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      triggerSimulatedListening();
    }
  };

  const stopListening = (shouldSend = false) => {
    if ((window as any)._simulatedVoiceInterval) {
      clearInterval((window as any)._simulatedVoiceInterval);
    }

    if (speechRecognitionInstance) {
      try {
        speechRecognitionInstance.stop();
      } catch (e) {}
    }

    setIsListening(false);
    setIsListeningModeSimulated(false);

    if (shouldSend && recognitionTranscript.trim()) {
      sendMessage(recognitionTranscript);
    } else if (recognitionTranscript.trim()) {
      setInput(recognitionTranscript);
    }
  };

  const speakMessage = (text: string, index: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      triggerNotification(
        "TTS Unsupported",
        "Your browser does not support Speech Synthesis.",
        "system"
      );
      return;
    }

    if (speakingMessageIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingMessageIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Strip markdown formatting for friendly pronunciation
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/👋/g, "Hello")
      .replace(/💰/g, "")
      .replace(/✈️/g, "")
      .replace(/✔/g, "completed")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setSpeakingMessageIndex(index);
    };

    utterance.onend = () => {
      setSpeakingMessageIndex(null);
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error:", e);
      setSpeakingMessageIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // AI Counselor Message Handler
  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    // stop any ongoing speaking when user sends a new message
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageIndex(null);

    const updatedMessages = [...messages, { role: "user" as const, text: userText }];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const payloadMessages = updatedMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages: payloadMessages })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch response from WeHive AI.");
      }

      const data = await res.json();
      const aiReply = data.text || "I was unable to retrieve a response. Please try again.";
      
      setMessages((prev) => {
        const next: Message[] = [...prev, { role: "model" as const, text: aiReply }];
        if (isAutoSpeakEnabled || viewMode === "assistant") {
          setTimeout(() => {
            speakMessage(aiReply, next.length - 1);
          }, 150);
        }
        return next;
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // ==========================================
  // COMMUNITY HANDLERS
  // ==========================================

  // Group Circle Like post
  const handleLikeMessage = (circleId: string, messageId: string) => {
    setCircles(prev => prev.map(c => {
      if (c.id !== circleId) return c;
      return {
        ...c,
        messages: c.messages.map(m => {
          if (m.id !== messageId) return m;
          const isLikedNow = !m.hasLiked;
          return {
            ...m,
            hasLiked: isLikedNow,
            likes: isLikedNow ? m.likes + 1 : m.likes - 1
          };
        })
      };
    }));
  };

  // Group Circle Submit Message
  const handleSendGroupMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupInput.trim()) return;

    const timestampStr = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const userMsg: GroupMessage = {
      id: Math.random().toString(),
      senderName: "You",
      senderAvatar: "KT",
      senderRole: `${userAcademicLevel} Candidate (You)`,
      text: groupInput,
      timestamp: timestampStr,
      likes: 0,
      hasLiked: false
    };

    // Update active circle's message ledger
    setCircles(prev => prev.map(c => {
      if (c.id !== selectedCircleId) return c;
      return {
        ...c,
        messages: [...c.messages, userMsg]
      };
    }));

    const textToMatch = groupInput.toLowerCase();
    const activeCircleId = selectedCircleId;
    setGroupInput("");

    // Simulate other student replying on the public board
    setTimeout(() => {
      let replyText = "That's a very helpful point! I will keep that in mind when compiling my visa dossier.";
      let responderName = "Aarav Kapoor";
      let responderAvatar = "AK";
      let responderRole = "Master's Applicant";

      if (activeCircleId === "tum") {
        if (textToMatch.includes("aps") || textToMatch.includes("certificate")) {
          replyText = "TUM requires the physical APS certificate during enrollment, so make sure to keep the original paper safe! The PDF copy is only used for online admissions.";
        } else if (textToMatch.includes("house") || textToMatch.includes("accommodation") || textToMatch.includes("rent")) {
          replyText = "For Munich, definitely sign up for the Studentenwerk housing list. Even if the wait is long, it's the cheapest Option. Otherwise check WG-Gesucht daily!";
        } else {
          replyText = "Great question! I was reading last night that we also need to get our high school transcripts certified. Let's make sure that slot is verified too!";
        }
      } else if (activeCircleId === "rwth") {
        responderName = "Lara Meier";
        responderAvatar = "LM";
        responderRole = "Visa Approved Student ✈️";
        replyText = "Absolutely! Aachen's international office is extremely responsive. If you ever run into a block, just drop them an email, they reply within 48 hours!";
      } else if (activeCircleId === "heidelberg") {
        responderName = "Emily Watson";
        responderAvatar = "EW";
        responderRole = "PhD Candidate";
        replyText = "Totally agree! Heidelberg has some really beautiful libraries as well. Looking forward to meeting you all on campus!";
      } else {
        responderName = "Sarah Jenkins";
        responderAvatar = "SJ";
        responderRole = "Same Goal Match 🎯";
        replyText = "Indeed! Berlin is a giant city but the peer groups are super close. Welcome to our Free University group!";
      }

      const responseMsg: GroupMessage = {
        id: Math.random().toString(),
        senderName: responderName,
        senderAvatar: responderAvatar,
        senderRole: responderRole,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        likes: 1,
        hasLiked: false
      };

      setCircles(prev => prev.map(c => {
        if (c.id !== activeCircleId) return c;
        return {
          ...c,
          messages: [...c.messages, responseMsg]
        };
      }));

      triggerNotification(
        `New Circle reply in ${circles.find(ci => ci.id === activeCircleId)?.name.split(" ")[0]} 👥`,
        `${responderName} replied: "${replyText.substring(0, 45)}..."`,
        "message",
        "chat"
      );
    }, 2500);
  };

  // Direct Peer Chat Send
  const handleSendPeerMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerInput.trim() || !selectedPeerId) return;

    const currentPeerId = selectedPeerId;
    const textSent = peerInput;

    // Append to peer's specific history
    setPeers(prev => prev.map(p => {
      if (p.id !== currentPeerId) return p;
      return {
        ...p,
        chatHistory: [
          ...p.chatHistory,
          { sender: "user", text: textSent, timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }
        ]
      };
    }));

    setPeerInput("");
    setPeerTyping(true);

    // Dynamic Peer Reply simulator
    setTimeout(() => {
      setPeerTyping(false);
      let replyText = "That sounds amazing! Sharing peer info is definitely key to getting our visas approved.";
      
      if (currentPeerId === "pranav") {
        if (textSent.toLowerCase().includes("aps") || textSent.toLowerCase().includes("cert")) {
          replyText = "Yes! I submitted mine last month. It took about 30 days to arrive from Delhi. If you need a checklist of what to upload, let me know!";
        } else if (textSent.toLowerCase().includes("money") || textSent.toLowerCase().includes("block") || textSent.toLowerCase().includes("fund")) {
          replyText = "For the Blocked Account, I used Fintiba and it was incredibly fast. Put the money in via international wire, and they issued the confirmation paper the very next morning.";
        } else {
          replyText = "That's awesome! By the way, Munich housing is super tough. Have you applied for the private student dorms like Youniq or Studentenwerk yet?";
        }
      } else if (currentPeerId === "lara") {
        if (textSent.toLowerCase().includes("visa") || textSent.toLowerCase().includes("interview")) {
          replyText = "My German visa interview took about 15 minutes. Just remember to carry two sets of physically printed copies of all documents in the exact order. They are very strict about presentation!";
        } else {
          replyText = "Aachen is incredible! Sustainable Energy is an excellent course here too. I'm arriving in Germany next month, let's definitely catch up near the Cathedral!";
        }
      } else if (currentPeerId === "arjun") {
        replyText = "Heidelberg's biotechnology program is very selective. My SOP went through 4 drafts before I was happy. I'd love to swap SOP reviews if you want!";
      } else if (currentPeerId === "sarah") {
        replyText = "Berlin public transport is amazing. The semester ticket is covered in our tuition fees so we get unlimited free travel! It makes getting around so easy.";
      }

      setPeers(prev => prev.map(p => {
        if (p.id !== currentPeerId) return p;
        return {
          ...p,
          chatHistory: [
            ...p.chatHistory,
            { sender: "peer", text: replyText, timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }
          ]
        };
      }));

      triggerNotification(
        `Message from ${peers.find(p => p.id === currentPeerId)?.name} 👥`,
        replyText,
        "message",
        "chat"
      );
    }, 2800);
  };

  // Filter and search peers
  const filteredPeers = peers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.targetUniversity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.fieldOfStudy.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterUniversity === "All") return matchesSearch;
    if (filterUniversity === "TUM" && p.targetUniversity.includes("Munich")) return matchesSearch;
    if (filterUniversity === "RWTH" && p.targetUniversity.includes("Aachen")) return matchesSearch;
    if (filterUniversity === "Heidelberg" && p.targetUniversity.includes("Heidelberg")) return matchesSearch;
    if (filterUniversity === "FU Berlin" && p.targetUniversity.includes("Berlin")) return matchesSearch;
    return matchesSearch;
  });

  const activePeer = peers.find(p => p.id === selectedPeerId);
  const activeCircle = circles.find(c => c.id === selectedCircleId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 animate-fade-in relative">
      
      {/* Dynamic Main Header Banner */}
      <div className="bg-blue-950 px-5 pt-7 pb-4 shadow-sm text-white shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            {viewMode === "counselor" ? (
              <div className="w-10 h-10 rounded-full bg-red-600 border-2 border-red-400 flex items-center justify-center font-bold text-white text-base">
                H
              </div>
            ) : viewMode === "assistant" ? (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 border-2 border-rose-400 flex items-center justify-center font-bold text-white text-base animate-pulse">
                🎙️
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 border-2 border-emerald-400 flex items-center justify-center font-bold text-white text-base">
                👥
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border border-blue-950" />
          </div>
          <div>
            <div className="flex items-center gap-1 opacity-75 mb-0.5">
              <div className="w-3.5 h-3.5 rounded bg-red-600 flex items-center justify-center font-bold text-white text-[8px] scale-90">W</div>
              <span className="text-[9px] font-bold tracking-wider text-blue-100 font-mono">WEHIVE NETWORK</span>
            </div>
            <h1 className="text-xs font-black tracking-wider uppercase text-blue-100">
              {viewMode === "counselor" ? "Hive AI" : viewMode === "assistant" ? "Voice Assistant" : "WeHive Circles"}
            </h1>
            <p className="text-[10px] text-red-300 font-bold">
              {viewMode === "counselor" ? "Senior Admissions Advisor" : viewMode === "assistant" ? "Immersive Voice Studio" : "Peer Student Hub"}
            </p>
          </div>
        </div>
        <span className="text-[9px] bg-blue-900 border border-blue-800 text-red-300 font-bold px-2 py-0.5 rounded font-mono">
          {viewMode === "counselor" ? "24/7 Counselor" : viewMode === "assistant" ? "Live Connected" : `${peers.filter(p => p.isOnline).length} Peers Online`}
        </span>
      </div>

      {/* Core Selector Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setViewMode("counselor")}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === "counselor"
              ? "bg-blue-950 text-white shadow-sm"
              : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          AI Text
        </button>
        <button
          onClick={() => setViewMode("assistant")}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === "assistant"
              ? "bg-blue-950 text-white shadow-sm"
              : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Voice Studio
        </button>
        <button
          onClick={() => setViewMode("community")}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
            viewMode === "community"
              ? "bg-blue-950 text-white shadow-sm"
              : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Student Circles
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full border-2 border-white animate-pulse" />
        </button>
      </div>

      {/* ==========================================
          TAB 1: HIVE AI COUNSELOR CHAT
          ========================================== */}
      {viewMode === "counselor" && (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Sub-header status bar with Auto-Speak toggle */}
          <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                Advisor Channel Connected
              </span>
            </div>

            <button
              onClick={() => {
                const nextState = !isAutoSpeakEnabled;
                setIsAutoSpeakEnabled(nextState);
                triggerNotification(
                  nextState ? "Auto-Speak Enabled" : "Auto-Speak Disabled",
                  nextState ? "AI answers will now be read aloud automatically!" : "Answers will remain silent.",
                  "system"
                );
              }}
              className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                isAutoSpeakEnabled
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
              title="Automatically read incoming AI messages aloud"
            >
              <Volume2 className={`w-3 h-3 ${isAutoSpeakEnabled ? "animate-bounce" : ""}`} />
              <span>Auto-Read: {isAutoSpeakEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div key={idx} className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isUser ? "bg-red-100" : "bg-blue-900 text-white"}`}>
                    {isUser ? <User className="w-4 h-4 text-red-800" /> : <Bot className="w-4 h-4 text-blue-100" />}
                  </div>
 
                  <div
                    className={`p-3.5 rounded-2xl shadow-xs leading-relaxed text-xs relative ${
                      isUser
                        ? "bg-red-600 text-white rounded-tr-none"
                        : "bg-white text-slate-800 rounded-tl-none border border-slate-200/50"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-line font-medium">{m.text}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none text-slate-800 font-medium whitespace-pre-line space-y-1">
                        <Markdown>{m.text}</Markdown>

                        {/* Read-Aloud Speaker Button / Sound wave equalizer */}
                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-850/40">
                          <button
                            type="button"
                            onClick={() => speakMessage(m.text, idx)}
                            className={`p-1.5 rounded-lg flex items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              speakingMessageIndex === idx
                                ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse"
                                : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                            }`}
                            title={speakingMessageIndex === idx ? "Stop speaking" : "Speak message out loud"}
                          >
                            {speakingMessageIndex === idx ? (
                              <>
                                <VolumeX className="w-3 h-3 text-rose-500" />
                                <span>STOP</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-slate-400" />
                                <span>SPEAK</span>
                              </>
                            )}
                          </button>

                          {speakingMessageIndex === idx && (
                            <div className="flex items-end gap-0.5 h-3">
                              {[...Array(4)].map((_, i) => (
                                <motion.span
                                  key={i}
                                  className="w-0.5 bg-rose-500 rounded-full"
                                  animate={{ height: ["4px", "11px", "4px"] }}
                                  transition={{
                                    duration: 0.4 + i * 0.08,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }}
                                />
                              ))}
                              <span className="text-[8px] font-mono font-bold text-rose-500 uppercase tracking-widest pl-1">
                                Reading...
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-7 h-7 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-blue-100" />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200/50 shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Error connecting to counselor</p>
                  <p className="text-[10px] text-red-600">{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips Panel */}
          {!loading && messages.length <= 3 && (
            <div className="px-4 py-2 bg-slate-100 shrink-0 border-t border-slate-200/50">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">Suggested Questions</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestion(s)}
                    className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-900 text-[10px] font-bold px-3 py-1.5 rounded-full shrink-0 shadow-xs transition-all cursor-pointer snap-start"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input panel bar */}
          <form onSubmit={handleSend} className="p-3.5 bg-white border-t border-slate-200/80 shrink-0 flex items-center gap-2 relative z-10">
            {/* NEW: Voice Prompt / Mic Button */}
            <button
              type="button"
              onClick={() => startListening()}
              className="p-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl border border-rose-100 transition-all cursor-pointer shrink-0 flex items-center justify-center relative group"
              title="Speak your question (Voice Prompt)"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-slate-950 text-white text-[8px] font-bold py-1 px-1.5 rounded uppercase tracking-wider font-mono transition-all whitespace-nowrap z-30">
                Voice Dictation
              </span>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask about visas, top colleges, or scholarships..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:outline-blue-900 disabled:opacity-50 font-medium"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-md shadow-red-500/10 hover:shadow-red-500/25 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Floating Action Button (FAB) for Voice Recording */}
          <div className="absolute bottom-20 right-4 z-40">
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (isListening) {
                  stopListening(true);
                } else {
                  startListening();
                }
              }}
              className={`p-4 rounded-full shadow-2xl flex items-center justify-center transition-all border cursor-pointer relative group ${
                isListening
                  ? "bg-gradient-to-tr from-rose-600 via-rose-500 to-red-500 border-rose-400 text-white shadow-rose-500/40"
                  : "bg-gradient-to-tr from-red-600 to-rose-600 border-red-500 text-white shadow-red-500/30 hover:shadow-rose-500/40"
              }`}
              title={isListening ? "Stop & Send Recording" : "Voice Assist FAB"}
            >
              {isListening ? (
                <>
                  {/* Ripple Effects */}
                  <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
                  <Mic className="w-5 h-5 relative z-10 animate-bounce" />
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                </>
              )}

              {/* Pulsing indicator light */}
              <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isListening ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-ping"}`} />
              
              {/* Tooltip hint */}
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-slate-900 text-white text-[9px] font-bold py-1 px-2.5 rounded-lg uppercase tracking-wider font-mono whitespace-nowrap transition-all shadow-md">
                {isListening ? "Stop & Send" : "Talk with AI"}
              </div>
            </motion.button>
          </div>

          {/* Elevate Labs-style Immersive Voice Studio listening Overlay */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col justify-between p-6 select-none rounded-b-2xl overflow-hidden animate-fade-in"
              >
                {/* Header status */}
                <div className="flex flex-col items-center mt-6 text-center space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest font-mono bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    {isListeningModeSimulated ? "Simulated Demo Channel Active" : "Secure Audio Stream Active"}
                  </span>
                  
                  <h3 className="text-md font-black text-white tracking-tight mt-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    WeHive Advisor Voice Mode
                  </h3>
                  
                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                    Speak your question naturally. We will convert your voice to structured queries for Hive AI.
                  </p>
                </div>

                {/* Central Concentric Glowing Circles (Elevate Labs signature style) */}
                <div className="relative flex items-center justify-center py-8">
                  {/* Outer waves */}
                  <motion.div
                    className="absolute w-36 h-36 rounded-full bg-rose-500/10 border border-rose-500/20"
                    animate={{ scale: [1, 1.45, 1], opacity: [0.1, 0.45, 0.1] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute w-48 h-48 rounded-full bg-blue-500/5 border border-blue-500/10"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.35, 0.05] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                  />
                  <motion.div
                    className="absolute w-60 h-60 rounded-full bg-purple-500/5 border border-purple-500/5"
                    animate={{ scale: [1, 1.22, 1], opacity: [0.02, 0.22, 0.02] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                  />

                  {/* Pulsing mic globe */}
                  <div className="w-20 h-20 bg-gradient-to-tr from-rose-600 via-rose-500 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/25 border-2 border-white/20 z-10 relative">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-rose-500/30"
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <Mic className="w-7 h-7 text-white relative z-10 animate-pulse" />
                  </div>
                </div>

                {/* Live sound spectrum visualizer */}
                <div className="space-y-4">
                  <div className="flex items-end justify-center gap-1.5 h-12 w-full max-w-xs mx-auto">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-rose-500 via-purple-500 to-blue-400 rounded-full"
                        animate={{
                          height: isListening 
                            ? [
                                "8px", 
                                `${12 + Math.sin(Date.now() / 80 + i) * 16 + Math.random() * 12}px`, 
                                "8px"
                              ]
                            : "5px"
                        }}
                        transition={{
                          duration: 0.5 + (i % 4) * 0.12,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </div>

                  {/* Dynamic Transcription text with live kinetic updates */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-h-32 overflow-y-auto max-w-sm mx-auto text-center scrollbar-none">
                    <p className="text-xs text-white leading-relaxed font-sans font-semibold">
                      {recognitionTranscript ? (
                        <span className="text-white">{recognitionTranscript}</span>
                      ) : (
                        <span className="text-slate-400 animate-pulse font-medium">
                          {isListeningModeSimulated ? "Connecting to audio stream..." : "Listening to your voice..."}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Bottom interactive action triggers */}
                <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto mb-4">
                  <div className="flex items-center gap-3 w-full">
                    {/* CANCEL trigger */}
                    <button
                      type="button"
                      onClick={() => stopListening(false)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all border border-white/10 cursor-pointer active:scale-95"
                    >
                      CANCEL
                    </button>

                    {/* TAP TO SEND/STOP triggers */}
                    <button
                      type="button"
                      onClick={() => stopListening(true)}
                      disabled={!recognitionTranscript.trim()}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      SEND QUESTION
                    </button>
                  </div>
                  
                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest text-center">
                    Tap SEND to process, or CANCEL to clear.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ==========================================
          TAB 1B: IMMERSIVE VOICE AI ASSISTANT VIEW
          ========================================== */}
      {viewMode === "assistant" && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden relative bg-[#090D1A] text-white p-6 select-none animate-fade-in">
          {/* Top Status Indicators */}
          <div className="flex items-center justify-between shrink-0 mb-4 z-10">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isListening ? "bg-rose-500 animate-ping" : speakingMessageIndex !== null ? "bg-blue-500 animate-pulse" : "bg-slate-600"} shrink-0`} />
              <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-400">
                {isListening 
                  ? "Live Streaming Mic..." 
                  : speakingMessageIndex !== null 
                    ? "AI speaking response..." 
                    : loading 
                      ? "Hive AI formulating..." 
                      : "Voice Channel Standby"}
              </span>
            </div>
            
            {/* Quick Helper reset button */}
            <button
              onClick={() => {
                setMessages([
                  {
                    role: "model",
                    text: "Voice Studio reset. I am ready for your vocal command. Speak freely!"
                  }
                ]);
                triggerNotification("Voice Reset", "Conversation history cleared for the voice assistant.", "system");
              }}
              className="px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-slate-300"
            >
              Clear History
            </button>
          </div>

          {/* Transcript bubbles in conversational caption style */}
          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 scrollbar-none flex flex-col justify-end min-h-0 relative">
            {/* Ambient vignette gradient */}
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#090D1A] to-transparent pointer-events-none z-10" />
            
            <div className="space-y-4 max-w-md mx-auto w-full">
              {messages.slice(-4).map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed relative ${
                        isUser
                          ? "bg-gradient-to-tr from-rose-600 to-red-500 text-white rounded-tr-none shadow-lg shadow-rose-500/10"
                          : "bg-slate-900 border border-white/5 text-slate-100 rounded-tl-none shadow-xl"
                      }`}
                    >
                      <span className="text-[8px] font-bold tracking-widest uppercase text-slate-400/80 font-mono block mb-1">
                        {isUser ? "You" : "WeHive Assistant"}
                      </span>
                      <div className="prose prose-invert prose-sm max-w-none text-white font-medium whitespace-pre-line">
                        <Markdown>{m.text}</Markdown>
                      </div>
                      
                      {!isUser && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => speakMessage(m.text, messages.length - 4 + idx)}
                            className={`p-1 px-2 rounded flex items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              speakingMessageIndex === (messages.length - 4 + idx)
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"
                            }`}
                          >
                            {speakingMessageIndex === (messages.length - 4 + idx) ? (
                              <>
                                <VolumeX className="w-2.5 h-2.5 text-rose-400" />
                                <span>STOP</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-2.5 h-2.5 text-slate-400" />
                                <span>LISTEN</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Live speech transcription bubble */}
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-end"
                >
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-[85%] text-xs text-right leading-relaxed shadow-lg">
                    <span className="text-[8px] font-bold tracking-widest uppercase text-emerald-400 font-mono block mb-1 flex items-center justify-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Dictation
                    </span>
                    <p className="text-white font-bold italic">
                      {recognitionTranscript || "Speak now..."}
                    </p>
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 text-slate-300 text-xs flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Hive AI is typing...</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Central Concentric Audio-Reactive Visualizer */}
          <div className="relative flex flex-col items-center justify-center py-6 shrink-0 z-10">
            <div className="relative w-52 h-52 flex items-center justify-center">
              {/* Ring Wave 1 */}
              <motion.div
                className="absolute inset-0 rounded-full bg-rose-500/5 border border-rose-500/20"
                animate={{ 
                  scale: isListening 
                    ? [1, 1.45, 1] 
                    : speakingMessageIndex !== null 
                      ? [1, 1.25, 1] 
                      : [1, 1.08, 1],
                  opacity: isListening 
                    ? [0.1, 0.5, 0.1] 
                    : speakingMessageIndex !== null 
                      ? [0.08, 0.35, 0.08] 
                      : [0.05, 0.15, 0.05] 
                }}
                transition={{ duration: isListening ? 2.5 : speakingMessageIndex !== null ? 3.5 : 5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Ring Wave 2 */}
              <motion.div
                className="absolute w-40 h-40 rounded-full bg-blue-500/5 border border-blue-500/10"
                animate={{ 
                  scale: isListening 
                    ? [1, 1.3, 1] 
                    : speakingMessageIndex !== null 
                      ? [1, 1.18, 1] 
                      : [1, 1.04, 1],
                  opacity: isListening 
                    ? [0.05, 0.4, 0.05] 
                    : speakingMessageIndex !== null 
                      ? [0.04, 0.25, 0.04] 
                      : [0.02, 0.1, 0.02] 
                }}
                transition={{ duration: isListening ? 3.2 : speakingMessageIndex !== null ? 4.5 : 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />

              {/* Ring Wave 3 - Core glowing energy field */}
              <motion.div
                className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-rose-500/10 to-purple-500/5 filter blur-md"
                animate={{ 
                  scale: isListening 
                    ? [1, 1.25, 1] 
                    : speakingMessageIndex !== null 
                      ? [1, 1.15, 1] 
                      : [1, 1.02, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Core interactive control globe */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isListening) {
                    stopListening(true);
                  } else {
                    startListening();
                  }
                }}
                className={`w-24 h-24 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-red-500 flex flex-col items-center justify-center shadow-2xl border-2 border-white/20 z-20 relative cursor-pointer group ${
                  isListening ? "shadow-rose-500/40" : "shadow-rose-600/20"
                }`}
              >
                {/* Floating internal active highlight */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-rose-400/30 filter blur-xs"
                  animate={{ scale: isListening ? [1, 1.25, 1] : 1 }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <Mic className={`w-8 h-8 text-white relative z-10 ${isListening ? "animate-bounce" : ""}`} />
                <span className="text-[8px] font-black uppercase tracking-wider text-white/90 relative z-10 mt-1 font-mono">
                  {isListening ? "TAP TO SEND" : "TAP TO TALK"}
                </span>
              </motion.button>
            </div>

            {/* Interactive Sound Wave spectrum bar graph */}
            <div className="flex items-end justify-center gap-1 h-10 w-full max-w-xs mt-3">
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-gradient-to-t from-rose-500 via-purple-500 to-blue-400 rounded-full"
                  animate={{
                    height: isListening 
                      ? [
                          "5px", 
                          `${10 + Math.sin(Date.now() / 90 + i) * 18 + Math.random() * 12}px`, 
                          "5px"
                        ]
                      : speakingMessageIndex !== null
                        ? [
                            "5px",
                            `${8 + Math.sin(Date.now() / 150 + i) * 12 + Math.random() * 6}px`,
                            "5px"
                          ]
                        : "4px"
                  }}
                  transition={{
                    duration: 0.4 + (i % 5) * 0.1,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Bottom Guidance controls & quick indicators */}
          <div className="mt-4 flex flex-col items-center space-y-2 shrink-0 z-10">
            <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 max-w-xs justify-center">
              <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-300">
                Mode: IELTS & Visa Voice Engine
              </span>
            </div>
            
            <p className="text-[9px] text-slate-500 font-medium text-center max-w-xs">
              No need to type. Start dictation, speak, and tap again to send. Hive AI will speak back dynamically.
            </p>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: WEHIVE STUDENT CIRCLES (COMMUNITY)
          ========================================== */}
      {viewMode === "community" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Inner Peer Direct Message view overlay */}
          {selectedPeerId && activePeer ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 animate-fade-in">
              
              {/* Peer chat header bar */}
              <div className="bg-slate-100 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-left">
                  <button 
                    onClick={() => setSelectedPeerId(null)}
                    className="p-1.5 -ml-1 hover:bg-slate-200 rounded-xl transition-all text-slate-600 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="relative w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                    {activePeer.avatar}
                    {activePeer.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      {activePeer.name}
                      {activePeer.academicLevel === userAcademicLevel && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-mono">
                          Same Goal Match
                        </span>
                      )}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {activePeer.targetUniversity}  •  {activePeer.intake}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <span className="text-[9px] bg-white border border-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-lg">
                  {activePeer.status}
                </span>
              </div>

              {/* Private Peer-to-Peer Chat Messages Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                <div className="mx-auto max-w-md bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-[10px] text-amber-900 leading-normal flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <p>
                    <strong>Peer Safety Circle:</strong> This is a secure student sandbox chat. You can ask this peer regarding university prerequisites, blocked accounts, exam preps, or accommodation hunt!
                  </p>
                </div>

                {activePeer.chatHistory.map((ch, idx) => {
                  const isUser = ch.sender === "user";
                  return (
                    <div key={idx} className={`flex items-start gap-2 max-w-[80%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
                      <div className={`w-6 h-6 rounded-lg text-[9px] font-bold flex items-center justify-center shrink-0 ${
                        isUser ? "bg-red-100 text-red-800" : "bg-slate-800 text-slate-100"
                      }`}>
                        {isUser ? "You" : activePeer.avatar}
                      </div>

                      <div className={`p-3 rounded-2xl shadow-xs text-xs leading-normal ${
                        isUser 
                          ? "bg-red-600 text-white rounded-tr-none" 
                          : "bg-white text-slate-800 rounded-tl-none border border-slate-200/50"
                      }`}>
                        <p className="font-medium">{ch.text}</p>
                        <span className={`text-[8px] block text-right mt-1 font-mono ${isUser ? "text-red-200" : "text-slate-400"}`}>
                          {ch.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {peerTyping && (
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      {activePeer.avatar}
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200/50 shadow-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                <div ref={peerEndRef} />
              </div>

              {/* Private Chat Input panel */}
              <form onSubmit={handleSendPeerMessage} className="p-3.5 bg-white border-t border-slate-200 shrink-0 flex items-center gap-2">
                <input
                  type="text"
                  value={peerInput}
                  onChange={(e) => setPeerInput(e.target.value)}
                  placeholder={`Write a question to ${activePeer.name}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-blue-900"
                />
                <button
                  type="submit"
                  disabled={!peerInput.trim()}
                  className="p-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            
            // ==========================================
            // MAIN COMMUNITY HUB
            // ==========================================
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Dynamic User Profile Context Header Card */}
              <div className="bg-gradient-to-r from-blue-950 to-slate-900 px-4 py-3.5 text-white flex items-center justify-between shrink-0">
                <div className="text-left">
                  <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider font-mono">My Academic Scope Matcher</p>
                  <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    {userAcademicLevel} Goal Matches
                  </h4>
                </div>
                <div className="bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/15 text-right">
                  <span className="text-[10px] font-mono text-slate-200 block">WeHive Network</span>
                  <span className="text-[8px] font-black text-amber-300 font-mono">STUDENT VERIFIED</span>
                </div>
              </div>

              {/* Sub-Layout: Top suggester for Peers applying to same schools */}
              <div className="bg-slate-100 border-b border-slate-200 p-3 shrink-0 text-left">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-red-600" />
                    Active Aspirants Directory
                  </h3>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">{filteredPeers.length} Students nearby</span>
                </div>

                {/* Horizontal Quick filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {["All", "TUM", "RWTH", "Heidelberg", "FU Berlin"].map((uni) => (
                    <button
                      key={uni}
                      onClick={() => setFilterUniversity(uni)}
                      className={`text-[9px] font-black px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                        filterUniversity === uni 
                          ? "bg-red-600 text-white border-red-600 shadow-xs" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {uni}
                    </button>
                  ))}
                </div>

                {/* Horizontal scroll of peers */}
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
                  {filteredPeers.map(peer => {
                    const isSameLevel = peer.academicLevel === userAcademicLevel;
                    return (
                      <div 
                        key={peer.id}
                        onClick={() => setSelectedPeerId(peer.id)}
                        className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 shrink-0 w-44 shadow-xs hover:shadow-sm cursor-pointer snap-start transition-all relative group"
                      >
                        {isSameLevel && (
                          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="relative w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                            {peer.avatar}
                            {peer.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-white" />
                            )}
                          </div>
                          <div className="text-left overflow-hidden">
                            <h4 className="text-[10px] font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors">
                              {peer.name}
                            </h4>
                            <p className="text-[8px] text-slate-400 font-mono truncate">
                              {peer.targetUniversity}
                            </p>
                          </div>
                        </div>

                        <div className="text-[9px] text-left text-slate-600 space-y-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          <p className="truncate font-medium">🏫 {peer.fieldOfStudy}</p>
                          <p className="font-mono text-[8px] text-slate-500">🎓 Intake: {peer.intake}</p>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[7.5px] bg-amber-50 text-amber-800 font-black px-1 py-0.5 rounded max-w-[90px] truncate">
                            {peer.status.replace(/[^a-zA-Z ]/g, "")}
                          </span>
                          <span className="text-[8px] font-black text-red-600 uppercase flex items-center gap-0.5">
                            Chat <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Two Column Layout for University Board & details */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
                
                {/* Board Left Rail: Circles Selector */}
                <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200 overflow-y-auto flex md:flex-col shrink-0">
                  <div className="p-3 border-b border-slate-200 hidden md:block">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono text-left">University Circles</p>
                  </div>
                  
                  <div className="flex md:flex-col gap-1 p-2 md:p-1.5 w-full overflow-x-auto md:overflow-x-visible shrink-0">
                    {circles.map(circle => {
                      const isSelected = circle.id === selectedCircleId;
                      return (
                        <button
                          key={circle.id}
                          onClick={() => setSelectedCircleId(circle.id)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all shrink-0 md:shrink md:w-full cursor-pointer border ${
                            isSelected 
                              ? "bg-blue-950 text-white border-blue-950 shadow-xs" 
                              : "bg-white md:bg-transparent text-slate-700 border-slate-200 md:border-transparent hover:bg-slate-200/50"
                          }`}
                        >
                          <span className="text-sm shrink-0">{circle.logo}</span>
                          <div className="overflow-hidden">
                            <h4 className="text-[10px] font-bold truncate md:max-w-[140px]">
                              {circle.name.replace(" Admissions", "").replace(" Engineering Circle", "")}
                            </h4>
                            <p className={`text-[8px] font-mono ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                              {circle.membersCount} active peers
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Board Right Area: Lively Live Board Thread */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 text-left">
                  
                  {/* Current Active Circle Title */}
                  {activeCircle && (
                    <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 shrink-0">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>{activeCircle.logo}</span>
                          {activeCircle.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {activeCircle.topics.map(t => (
                            <span key={t} className="text-[8px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded font-mono">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">
                        {activeCircle.membersCount} students in board
                      </span>
                    </div>
                  )}

                  {/* Message board stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeCircle && activeCircle.messages.map(msg => {
                      const isCurrentUser = msg.senderName === "You";
                      return (
                        <div key={msg.id} className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs relative group hover:border-slate-300 transition-all">
                          
                          {/* Thread message header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                isCurrentUser ? "bg-red-100 text-red-800" : "bg-slate-800 text-slate-100"
                              }`}>
                                {msg.senderAvatar}
                              </div>
                              <div>
                                <h4 className="text-[10px] font-bold text-slate-800 flex items-center gap-1.5">
                                  {msg.senderName}
                                  {msg.senderRole.includes("Same Goal") && (
                                    <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-mono">
                                      Goal Match
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[8px] text-slate-400 font-mono">
                                  {msg.senderRole}
                                </p>
                              </div>
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono">
                              {msg.timestamp}
                            </span>
                          </div>

                          {/* Message core text */}
                          <p className="text-xs text-slate-700 leading-relaxed font-medium pl-9 pr-2">
                            {msg.text}
                          </p>

                          {/* Action Bar (Like/Quote) */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 pl-9 font-bold">
                            <button 
                              onClick={() => handleLikeMessage(selectedCircleId, msg.id)}
                              className={`flex items-center gap-1 cursor-pointer transition-colors ${
                                msg.hasLiked ? "text-red-600" : "hover:text-red-600"
                              }`}
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${msg.hasLiked ? "fill-current" : ""}`} />
                              <span>{msg.likes} Likes</span>
                            </button>

                            <span className="text-slate-400 font-normal">
                              Community Double-Entry Verified ✔
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={communityEndRef} />
                  </div>

                  {/* Public Board Message Compose Box */}
                  <form onSubmit={handleSendGroupMessage} className="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center gap-2">
                    <input
                      type="text"
                      value={groupInput}
                      onChange={(e) => setGroupInput(e.target.value)}
                      placeholder={`Post a question/advice in ${activeCircle?.name.split(" ")[0]} Circle...`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-blue-900 font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!groupInput.trim()}
                      className="p-2.5 bg-blue-950 text-white rounded-xl hover:bg-black transition-all disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}

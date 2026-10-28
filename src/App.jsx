import React, { useState, useEffect, useRef } from 'react';
import {
  API_CONFIG,
  authAPI,
  chatAPI,
  clearToken,
  readToken,
  saveToken,
} from './api.js';
import MarkdownMessage from './MarkdownMessage.jsx';
import { 
  BookOpen, 
  GraduationCap, 
  FileText, 
  ArrowRight, 
  Search, 
  Send, 
  Plus, 
  User, 
  LogOut, 
  CheckCircle2, 
  Paperclip, 
  Sparkles, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Menu, 
  X, 
  ChevronRight, 
  Bookmark, 
  Clock, 
  ShieldCheck, 
  ArrowLeft,
  Filter,
  Lightbulb,
  Check,
  Building2,
  Compass,
  FileCheck,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Award,
  TrendingUp,
  ExternalLink,
  SlidersHorizontal,
  Layers
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [targetProduct, setTargetProduct] = useState(null);
  
  const [user, setUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [copiedId, setCopiedId] = useState(null);

  const [activeChatId, setActiveChatId] = useState(null);
  const [chatHistories, setChatHistories] = useState({});
  const [conversations, setConversations] = useState([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (iso) => {
    if (!iso) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const backendMsgToUi = (msg) => ({
    id: msg.id,
    sender: msg.role === 'assistant' ? 'ai' : 'user',
    text: msg.content,
    time: formatTime(msg.created_at),
  });

  const loadConversations = async () => {
    try {
      const payload = await chatAPI.list();
      setConversations(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setConversations([]);
    } finally {
      setConversationsLoaded(true);
    }
  };

  const loadMessages = async (id) => {
    try {
      const payload = await chatAPI.get(id);
      const data = payload.data || {};
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      setChatHistories((prev) => ({
        ...prev,
        [id]: msgs.map(backendMsgToUi),
      }));
      setActiveChatId(id);
    } catch (err) {
      setApiError(err.message || 'Could not load conversation.');
    }
  };

  useEffect(() => {
    if (currentView === 'study-hub') {
      scrollToBottom();
    }
  }, [chatHistories, activeChatId, currentView]);

  useEffect(() => {
    let mounted = true;
    const token = readToken();
    if (token) {
      authAPI.me()
        .then((payload) => {
          if (!mounted) return;
          setUser(payload.data || null);
        })
        .catch(() => {
          if (!mounted) return;
          clearToken();
          setUser(null);
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user && !conversationsLoaded) {
      loadConversations();
    }
  }, [user, conversationsLoaded]);

  const handleSendMessage = async (textToSend) => {
    const msgText = textToSend || inputMessage;
    if (!msgText.trim() && !uploadedFile) return;

    setApiError(null);
    setIsSending(true);

    const formattedUserMsg = uploadedFile
      ? `[Attached: ${uploadedFile.name}]\n\n${msgText}`
      : msgText;

    let conversationId = activeChatId;
    if (!conversationId) {
      try {
        const created = await chatAPI.create({ title: msgText.slice(0, 30) || 'New chat' });
        conversationId = created.data.id;
        setConversations((prev) => [created.data, ...prev]);
      } catch (err) {
        setApiError(err.message || 'Could not start a conversation.');
        setIsSending(false);
        return;
      }
    }

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: formattedUserMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistories((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), userMsg],
    }));

    if (!textToSend) setInputMessage('');
    setUploadedFile(null);
    setIsAiTyping(true);

    try {
      const payload = await chatAPI.send(conversationId, { content: formattedUserMsg });
      const data = payload.data || {};
      const assistant = data.assistant_message || {};
      const aiMsg = {
        id: assistant.id || (Date.now() + 1).toString(),
        sender: 'ai',
        text: assistant.content || '',
        time: assistant.created_at
          ? formatTime(assistant.created_at)
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatHistories((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), aiMsg],
      }));

      if (data.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
        );
      }
    } catch (err) {
      setApiError(err.message || 'The AI request failed. Please try again.');
      console.error('[chat] AI request failed:', err);
    } finally {
      setIsAiTyping(false);
      setIsSending(false);
    }
  };

  const startNewChat = async () => {
    setApiError(null);
    try {
      const created = await chatAPI.create({ title: 'New chat' });
      const id = created.data.id;
      setConversations((prev) => [created.data, ...(prev || [])]);
      setActiveChatId(id);
      setChatHistories((prev) => ({ ...prev, [id]: [] }));
      setMobileSidebarOpen(false);
    } catch (err) {
      setApiError(err.message || 'Could not start a new chat.');
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });
    }
  };

  const [appTab, setAppTab] = useState('discovery');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [savedSchools, setSavedSchools] = useState([
    {
      id: 'sch-1',
      name: 'Stanford University',
      location: 'Stanford, CA, USA',
      type: 'Undergraduate STEM & Liberal Arts',
      aid: '100% Need-Based Aid',
      deadline: 'Jan 5, 2027',
      matchScore: '96% Match',
      tuition: '$62,484 / yr',
      status: 'In Progress',
      progress: 60,
      checklist: [
        { task: 'Personal Statement', done: true },
        { task: 'Transcript Upload', done: true },
        { task: '2 Teacher Recommendations', done: false },
        { task: 'Financial Aid CSS Profile', done: false }
      ]
    },
    {
      id: 'sch-2',
      name: 'Berea College',
      location: 'Berea, KY, USA',
      type: 'Undergraduate Honors',
      aid: '100% Tuition Promise',
      deadline: 'Nov 30, 2026',
      matchScore: '98% Match',
      tuition: '$0 Tuition Grant',
      status: 'In Progress',
      progress: 75,
      checklist: [
        { task: 'Personal Statement', done: true },
        { task: 'Transcript Upload', done: true },
        { task: 'Recommendation Letters', done: true },
        { task: 'FAFSA Submission', done: false }
      ]
    }
  ]);

  const schoolDirectory = [
    {
      id: 'sch-1',
      name: 'Stanford University',
      location: 'Stanford, CA, USA',
      type: 'Undergraduate STEM & Liberal Arts',
      aid: '100% Need-Based Aid',
      deadline: 'Jan 5, 2027',
      matchScore: '96% Match',
      tuition: '$62,484 / yr',
      desc: 'Global leader in innovation, research, computer science, and transformative undergraduate education.'
    },
    {
      id: 'sch-2',
      name: 'Berea College',
      location: 'Berea, KY, USA',
      type: 'Undergraduate Honors',
      aid: '100% Tuition Promise',
      deadline: 'Nov 30, 2026',
      matchScore: '98% Match',
      tuition: '$0 Tuition Grant',
      desc: 'Co-educational institution providing every admitted student a No-Tuition Promise worth over $176,000 across 4 years.'
    },
    {
      id: 'sch-3',
      name: 'MIT (Massachusetts Inst. of Technology)',
      location: 'Cambridge, MA, USA',
      type: 'Engineering & Physical Sciences',
      aid: 'Full Need-Met Financial Aid',
      deadline: 'Jan 1, 2027',
      matchScore: '94% Match',
      tuition: '$59,750 / yr',
      desc: 'World-renowned polytechnic research institute focusing on technology, math, engineering, and groundbreaking science.'
    },
    {
      id: 'sch-4',
      name: 'University of Toronto',
      location: 'Toronto, ON, Canada',
      type: 'Global Public Research',
      aid: 'Lester B. Pearson Scholarship',
      deadline: 'Jan 15, 2027',
      matchScore: '91% Match',
      tuition: '$45,000 CAD / yr',
      desc: 'Canada’s premier research institution with multidisciplinary research opportunities and worldwide prestige.'
    },
    {
      id: 'sch-5',
      name: 'Amherst College',
      location: 'Amherst, MA, USA',
      type: 'Liberal Arts & Sciences',
      aid: 'Need-Blind International',
      deadline: 'Jan 3, 2027',
      matchScore: '93% Match',
      tuition: '$66,650 / yr',
      desc: 'Open curriculum model with zero distribution requirements and generous grant-only financial aid packages.'
    }
  ];

  const handleSaveSchool = (school) => {
    if (savedSchools.some(s => s.id === school.id)) {
      setSavedSchools(savedSchools.filter(s => s.id !== school.id));
    } else {
      setSavedSchools([
        ...savedSchools,
        {
          ...school,
          status: 'In Progress',
          progress: 25,
          checklist: [
            { task: 'Personal Statement', done: false },
            { task: 'Transcript Upload', done: false },
            { task: 'Recommendation Letters', done: false },
            { task: 'Financial Aid Docs', done: false }
          ]
        }
      ]);
    }
  };

  const toggleChecklistItem = (schoolId, taskIndex) => {
    setSavedSchools(prev => prev.map(sch => {
      if (sch.id !== schoolId) return sch;
      const updatedChecklist = [...sch.checklist];
      updatedChecklist[taskIndex].done = !updatedChecklist[taskIndex].done;
      
      const completedCount = updatedChecklist.filter(t => t.done).length;
      const newProgress = Math.round((completedCount / updatedChecklist.length) * 100);
      const newStatus = newProgress === 100 ? 'Submitted' : newProgress > 0 ? 'In Progress' : 'Draft';

      return {
        ...sch,
        checklist: updatedChecklist,
        progress: newProgress,
        status: newStatus
      };
    }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (!authForm.email || !authForm.password) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    if (currentView === 'auth-signup' && !authForm.name) {
      setAuthError('Please enter your full name.');
      return;
    }

    setAuthLoading(true);
    setApiError(null);

    try {
      if (currentView === 'auth-signup') {
        const payload = await authAPI.register({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
        });
        saveToken(payload.data.token);
        setUser(payload.data.user);
        setAuthSuccessMsg('Welcome! Your glossy account is ready.');
      } else {
        const payload = await authAPI.login({
          email: authForm.email,
          password: authForm.password,
        });
        saveToken(payload.data.token);
        setUser(payload.data.user);
        setAuthSuccessMsg('Successfully signed in!');
      }

      setTimeout(() => {
        setAuthSuccessMsg('');
        setAuthLoading(false);
        if (targetProduct) {
          setCurrentView(targetProduct);
        } else {
          setCurrentView('product-selection');
        }
      }, 600);
    } catch (err) {
      setAuthLoading(false);
      setAuthError(err.message || 'Authentication failed. Please try again.');
      setApiError(err.message || 'Authentication failed. Please try again.');
    }
  };

  const handleSignOut = () => {
    clearToken();
    setUser(null);
    setCurrentView('landing');
    setTargetProduct(null);
    setActiveChatId(null);
    setChatHistories({});
    setConversations([]);
    setConversationsLoaded(false);
    setApiError(null);
  };

  const navigateToProduct = (prod) => {
    setTargetProduct(prod);
    if (!user) {
      setCurrentView('auth-signin');
    } else {
      setCurrentView(prod);
    }
  };

  const renderHeader = () => (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.03)] px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => setCurrentView('landing')}
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E9F8EC] to-[#C6F36B] border border-white/80 shadow-inner flex items-center justify-center text-[#35A853] group-hover:scale-105 transition-transform">
          <Sparkles className="w-5 h-5 stroke-[2.5]" />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-[#1B2E23]">
          Smoothie <span className="text-[#35A853] drop-shadow-sm">AI</span>
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {(currentView === 'study-hub' || currentView === 'student-app') && (
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-white/80 shadow-sm text-xs font-semibold text-[#1B2E23]">
            <span className="w-2 h-2 rounded-full bg-[#35A853] animate-pulse" />
            <span>{currentView === 'study-hub' ? 'Study Hub Active' : 'Application Portal Active'}</span>
          </div>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/80 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFE7D6] to-[#FFD76A] text-[#1B2E23] font-bold text-xs flex items-center justify-center shadow-inner">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-bold text-[#1B2E23]">{user.name}</span>
            </div>
            
            {(currentView === 'study-hub' || currentView === 'student-app') && (
              <button
                onClick={() => setCurrentView('product-selection')}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-white/80 hover:bg-[#E9F8EC] text-[#1B2E23] border border-white/80 shadow-sm transition-all hover:scale-[1.02]"
              >
                Switch View
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-[#5C7063] hover:text-[#1B2E23] hover:bg-white/80 transition-all border border-transparent hover:border-white/80"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentView('auth-signin')}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-[#1B2E23] hover:text-[#35A853] transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTargetProduct(null);
                setCurrentView('product-selection');
              }}
              className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#35A853] to-[#2d8f46] hover:opacity-95 rounded-xl transition-all shadow-[0_4px_14px_rgba(53,168,83,0.35)] hover:shadow-[0_6px_20px_rgba(53,168,83,0.45)] hover:-translate-y-0.5"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9F5] via-[#FFFFFF] to-[#E9F8EC]/40 text-[#1B2E23] font-sans flex flex-col antialiased relative overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-br from-[#C6F36B]/30 to-[#35A853]/15 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-[#FFD76A]/20 to-[#FFE7D6]/40 blur-[140px] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {renderHeader()}

        {currentView === 'landing' && (
          <main className="flex-1 flex flex-col">
            <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-20 max-w-5xl mx-auto text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] mb-6 animate-fadeIn">
                <span className="w-2.5 h-2.5 rounded-full bg-[#35A853] animate-pulse" />
                <span className="text-xs font-bold text-[#1B2E23] tracking-wide uppercase">Your Friendly Glossy AI Companion</span>
                <span className="bg-[#C6F36B] text-[#1B2E23] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-inner">2.0 UI</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#1B2E23] max-w-4xl leading-[1.15]">
                Your next big academic step starts <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#35A853] via-[#2d8f46] to-[#35A853]">right here.</span>
              </h1>

              <p className="mt-6 text-base sm:text-xl text-[#5C7063] max-w-2xl leading-relaxed font-normal">
                Smoothie AI combines interactive tutoring with college application guidance in a single, ultra-polished, stress-free space.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setTargetProduct(null);
                    setCurrentView('product-selection');
                  }}
                  className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-[#35A853] to-[#2d8f46] hover:opacity-95 rounded-2xl transition-all shadow-[0_8px_25px_rgba(53,168,83,0.35)] hover:shadow-[0_12px_30px_rgba(53,168,83,0.45)] hover:-translate-y-0.5 flex items-center justify-center gap-2.5 group"
                >
                  <span>Get Started Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => setCurrentView('auth-signin')}
                  className="w-full sm:w-auto px-7 py-4 text-base font-bold text-[#1B2E23] bg-white/70 hover:bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm transition-all hover:-translate-y-0.5"
                >
                  Sign In
                </button>
              </div>

              <div className="mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
                <div 
                  onClick={() => navigateToProduct('study-hub')}
                  className="p-8 rounded-3xl bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(53,168,83,0.12)] transition-all cursor-pointer group flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E9F8EC] to-[#C6F36B] text-[#35A853] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7 stroke-[2.2]" />
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full bg-[#C6F36B] text-[#1B2E23] text-xs font-bold mb-3 shadow-inner">
                      Study Hub
                    </span>
                    <h3 className="text-2xl font-black text-[#1B2E23] mb-2">Interactive AI Tutor</h3>
                    <p className="text-sm text-[#5C7063] leading-relaxed">
                      Deconstruct hard science problems, practice active recall, and master STEM and essay drafting with real-time feedback.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center text-sm font-bold text-[#35A853] group-hover:gap-2 transition-all">
                    <span>Explore Subjects</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>

                <div 
                  onClick={() => navigateToProduct('student-app')}
                  className="p-8 rounded-3xl bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(255,215,106,0.2)] transition-all cursor-pointer group flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFE7D6] to-[#FFD76A] text-[#1B2E23] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-7 h-7 stroke-[2.2]" />
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full bg-[#FFD76A] text-[#1B2E23] text-xs font-bold mb-3 shadow-inner">
                      Application Portal
                    </span>
                    <h3 className="text-2xl font-black text-[#1B2E23] mb-2">School & Scholarship Prep</h3>
                    <p className="text-sm text-[#5C7063] leading-relaxed">
                      Discover universities worldwide, track deadline milestones, manage financial aid checklists, and submit error-free applications.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center text-sm font-bold text-[#35A853] group-hover:gap-2 transition-all">
                    <span>Launch Portal</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </section>
          </main>
        )}

        {currentView === 'product-selection' && (
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="max-w-4xl w-full">
              <div className="text-center mb-10">
                <span className="text-xs font-extrabold tracking-widest uppercase text-[#35A853] bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/80 shadow-sm">
                  Workspace Selector
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#1B2E23] mt-4">
                  What would you like to do today?
                </h2>
                <p className="text-sm sm:text-base text-[#5C7063] mt-2 font-medium">
                  Select a product below to jump directly into your personalized space.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div 
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === 'Enter' && navigateToProduct('study-hub')}
                  onClick={() => navigateToProduct('study-hub')}
                  className="bg-white/70 hover:bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/80 hover:border-[#35A853] shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(53,168,83,0.18)] transition-all cursor-pointer flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-[#35A853] hover:-translate-y-1"
                >
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E9F8EC] to-[#C6F36B] text-[#35A853] flex items-center justify-center mb-6 group-hover:bg-[#35A853] group-hover:text-white transition-colors shadow-sm">
                      <BookOpen className="w-8 h-8 stroke-[2]" />
                    </div>
                    <h3 className="text-2xl font-black text-[#1B2E23] mb-2">Study Hub</h3>
                    <p className="text-sm text-[#5C7063] leading-relaxed mb-6 font-normal">
                      Learn, ask questions, solve homework step-by-step, and explore academic topics with AI.
                    </p>
                  </div>
                  <button className="w-full py-3.5 px-4 rounded-2xl bg-[#E9F8EC] text-[#35A853] font-bold text-sm group-hover:bg-[#35A853] group-hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm">
                    <span>Open Study Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div 
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === 'Enter' && navigateToProduct('student-app')}
                  onClick={() => navigateToProduct('student-app')}
                  className="bg-white/70 hover:bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/80 hover:border-[#FFD76A] shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(255,215,106,0.25)] transition-all cursor-pointer flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-[#35A853] hover:-translate-y-1"
                >
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFE7D6] to-[#FFD76A] text-[#1B2E23] flex items-center justify-center mb-6 group-hover:bg-[#FFD76A] transition-colors shadow-sm">
                      <FileText className="w-8 h-8 stroke-[2]" />
                    </div>
                    <h3 className="text-2xl font-black text-[#1B2E23] mb-2">Student Application</h3>
                    <p className="text-sm text-[#5C7063] leading-relaxed mb-6 font-normal">
                      Explore schools, manage document checklists, track aid, and complete your applications.
                    </p>
                  </div>
                  <button className="w-full py-3.5 px-4 rounded-2xl bg-[#FFE7D6] text-[#1B2E23] font-bold text-sm group-hover:bg-[#FFD76A] transition-all flex items-center justify-center gap-2 shadow-sm">
                    <span>Start Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}

        {(currentView === 'auth-signin' || currentView === 'auth-signup') && (
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="bg-white/75 backdrop-blur-2xl border border-white/80 rounded-3xl p-7 sm:p-10 w-full max-w-md shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
              <div className="flex bg-[#F7F9F5] p-1 rounded-2xl border border-white/80 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setCurrentView('auth-signin');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    currentView === 'auth-signin'
                      ? 'bg-white text-[#1B2E23] shadow-sm'
                      : 'text-[#5C7063] hover:text-[#1B2E23]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setCurrentView('auth-signup');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    currentView === 'auth-signup'
                      ? 'bg-white text-[#1B2E23] shadow-sm'
                      : 'text-[#5C7063] hover:text-[#1B2E23]'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-[#1B2E23]">
                  {currentView === 'auth-signup' ? 'Create Your Account' : 'Welcome Back'}
                </h2>
                <p className="text-xs text-[#5C7063] mt-1 font-medium">
                  {targetProduct 
                    ? `Access ${targetProduct === 'study-hub' ? 'Study Hub' : 'Student Application Portal'}`
                    : 'Sign in to access your learning workspace'}
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50/90 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <span className="font-bold">!</span>
                  <span>{authError}</span>
                </div>
              )}

              {authSuccessMsg && (
                <div className="mb-4 p-3 rounded-2xl bg-[#E9F8EC] border border-[#35A853] text-[#35A853] text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {currentView === 'auth-signup' && (
                  <div>
                    <label className="block text-xs font-bold text-[#1B2E23] mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#5C7063] absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="e.g. Alex Johnson"
                        value={authForm.name}
                        onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                        className="w-full pl-10 pr-3 py-3 bg-white/80 border border-white/80 rounded-2xl text-sm text-[#1B2E23] focus:outline-none focus:border-[#35A853] shadow-inner transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#1B2E23] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#5C7063] absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      placeholder="alex@example.com"
                      value={authForm.email}
                      onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 bg-white/80 border border-white/80 rounded-2xl text-sm text-[#1B2E23] focus:outline-none focus:border-[#35A853] shadow-inner transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2E23] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#5C7063] absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-3 bg-white/80 border border-white/80 rounded-2xl text-sm text-[#1B2E23] focus:outline-none focus:border-[#35A853] shadow-inner transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-[#5C7063] hover:text-[#1B2E23]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-[#35A853] to-[#2d8f46] text-white font-bold rounded-2xl text-sm transition-all shadow-[0_6px_20px_rgba(53,168,83,0.3)] hover:shadow-[0_8px_25px_rgba(53,168,83,0.4)] flex items-center justify-center gap-2 mt-2"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{currentView === 'auth-signup' ? 'Create Account' : 'Sign In'}</span>
                  )}
                </button>
              </form>
            </div>
          </main>
        )}

        {currentView === 'study-hub' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-white/80 p-3 flex items-center justify-between">
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="p-2 rounded-xl bg-white border border-white/80 text-[#1B2E23] shadow-sm"
              >
                {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <span className="text-xs font-black text-[#1B2E23]">Study Hub Assistant</span>
              <button
                onClick={startNewChat}
                className="p-2 rounded-xl bg-[#E9F8EC] text-[#35A853] font-bold"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <aside className={`
              fixed md:static inset-y-0 left-0 z-40 w-72 bg-white/60 backdrop-blur-2xl border-r border-white/80 flex flex-col transition-transform transform 
              ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
              <div className="p-4 border-b border-white/80">
                <button
                  onClick={startNewChat}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#35A853] to-[#2d8f46] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(53,168,83,0.3)] hover:opacity-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Study Session</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <span className="px-2 text-[10px] font-black text-[#5C7063] uppercase tracking-wider">
                  Recent Threads
                </span>
                
                {Object.keys(chatHistories).map(id => (
                  <button
                    key={id}
                    onClick={() => {
                      loadMessages(id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                      activeChatId === id
                        ? 'bg-white/90 text-[#35A853] shadow-sm border border-white/80'
                        : 'text-[#1B2E23] hover:bg-white/50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0 text-[#5C7063]" />
                    <span className="truncate">
                      {chatHistories[id][1]?.text || chatHistories[id][0]?.text || 'Study Chat'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-white/80 bg-white/40">
                <span className="text-[10px] font-black text-[#5C7063] uppercase tracking-wider block mb-2.5">
                  Subject Fast-Tracks
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button 
                    onClick={() => handleSendMessage("Explain Quantum Physics simply with formulas")}
                    className="px-3 py-1.5 rounded-xl bg-[#E9F8EC] text-[#35A853] text-[11px] font-bold hover:bg-[#C6F36B] hover:text-[#1B2E23] transition-all shadow-sm"
                  >
                    Physics
                  </button>
                  <button 
                    onClick={() => handleSendMessage("Help me structure my admissions essay intro")}
                    className="px-3 py-1.5 rounded-xl bg-[#FFE7D6] text-[#1B2E23] text-[11px] font-bold hover:bg-[#FFD76A] transition-all shadow-sm"
                  >
                    Essay Review
                  </button>
                  <button 
                    onClick={() => handleSendMessage("Review my calculus integration step-by-step")}
                    className="px-3 py-1.5 rounded-xl bg-white/80 border border-white/80 text-[#1B2E23] text-[11px] font-bold hover:bg-[#E9F8EC] transition-all shadow-sm"
                  >
                    Calculus
                  </button>
                  <button 
                    onClick={() => handleSendMessage("Give me essential SAT Math strategies")}
                    className="px-3 py-1.5 rounded-xl bg-[#C6F36B] text-[#1B2E23] text-[11px] font-bold hover:opacity-80 transition-all shadow-sm"
                  >
                    SAT Prep
                  </button>
                </div>
              </div>
            </aside>

            <main className="flex-1 flex flex-col h-full bg-transparent">
              <div className="px-6 py-3.5 border-b border-white/80 bg-white/50 backdrop-blur-md flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-[#1B2E23]">Smoothie AI Study Workspace</h3>
                  <p className="text-[11px] text-[#5C7063] font-medium">Ask homework questions, analyze research papers, or structure essays.</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#E9F8EC] rounded-full text-[#35A853] text-xs font-bold border border-white/80 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Real-Time Tutor</span>
                </div>
              </div>

              {apiError && (
                <div className="px-6 mb-4 p-3 rounded-2xl bg-red-50/90 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <span className="font-bold">!</span>
                  <span>{apiError}</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {(chatHistories[activeChatId]?.length || 0) <= 1 && (
                  <div className="mb-6 p-5 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.03)] space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-[#35A853]">
                      <Lightbulb className="w-4 h-4" />
                      <span>Suggested Interactive Prompts</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        onClick={() => handleSendMessage("Explain Quantum Physics simply with formulas")}
                        className="p-3.5 text-left bg-white/90 rounded-2xl border border-white/80 hover:border-[#35A853] text-xs text-[#1B2E23] font-semibold transition-all shadow-sm hover:-translate-y-0.5"
                      >
                        "Explain Quantum Physics in simple terms"
                      </button>
                      <button
                        onClick={() => handleSendMessage("Help me structure my college essay intro")}
                        className="p-3.5 text-left bg-white/90 rounded-2xl border border-white/80 hover:border-[#35A853] text-xs text-[#1B2E23] font-semibold transition-all shadow-sm hover:-translate-y-0.5"
                      >
                        "Structure my college essay intro"
                      </button>
                      <button
                        onClick={() => handleSendMessage("Give me essential SAT Math strategies")}
                        className="p-3.5 text-left bg-white/90 rounded-2xl border border-white/80 hover:border-[#35A853] text-xs text-[#1B2E23] font-semibold transition-all shadow-sm hover:-translate-y-0.5"
                      >
                        "Top strategies for SAT Math"
                      </button>
                    </div>
                  </div>
                )}

                {chatHistories[activeChatId]?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[90%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-[#35A853] to-[#2d8f46] text-white rounded-br-none shadow-[0_6px_20px_rgba(53,168,83,0.25)]'
                        : 'bg-white/80 backdrop-blur-xl text-[#1B2E23] border border-white/80 rounded-bl-none shadow-[0_6px_25px_rgba(0,0,0,0.03)]'
                    }`}>
                      <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px] opacity-80 font-bold">
                        <span>{msg.sender === 'user' ? 'You' : 'Smoothie AI'}</span>
                        <span>{msg.time}</span>
                      </div>
                      <MarkdownMessage text={msg.text} className="font-normal" />

                      {msg.sender === 'ai' && (
                        <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px] text-[#5C7063]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyText(msg.id, msg.text)}
                              className="px-2 py-1 rounded-lg bg-white/60 hover:bg-white text-[#1B2E23] font-semibold flex items-center gap-1 border border-white/80 transition-all"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedId === msg.id ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button className="p-1 hover:text-[#35A853] transition-colors"><ThumbsUp className="w-3.5 h-3.5" /></button>
                            <button className="p-1 hover:text-red-500 transition-colors"><ThumbsDown className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-4 text-xs text-[#5C7063] font-bold flex items-center gap-2 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-[#35A853] animate-ping" />
                      <span>Smoothie AI is typing explanations...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {uploadedFile && (
                <div className="px-6 py-2 bg-white/70 backdrop-blur-md border-t border-white/80 flex items-center gap-2 text-xs font-semibold text-[#1B2E23]">
                  <Paperclip className="w-3.5 h-3.5 text-[#35A853]" />
                  <span>{uploadedFile.name}</span>
                  <span className="text-[10px] text-[#5C7063]">({uploadedFile.size})</span>
                  <button onClick={() => setUploadedFile(null)} className="ml-auto text-red-500 hover:text-red-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="p-4 border-t border-white/80 bg-white/60 backdrop-blur-xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 max-w-4xl mx-auto"
                >
                  <label className="p-3 rounded-2xl bg-white/80 border border-white/80 text-[#5C7063] hover:bg-white cursor-pointer transition-all shadow-sm">
                    <Paperclip className="w-4 h-4" />
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <input
                    type="text"
                    placeholder="Ask any question, paste homework, or prompt a concept..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/80 border border-white/80 rounded-2xl text-xs sm:text-sm text-[#1B2E23] focus:outline-none focus:border-[#35A853] shadow-inner transition-all font-medium"
                  />
                    <button
                      type="submit"
                      disabled={(!inputMessage.trim() && !uploadedFile) || isSending || !API_CONFIG.valid}
                      className="p-3 bg-gradient-to-r from-[#35A853] to-[#2d8f46] hover:opacity-95 text-white rounded-2xl transition-all shadow-[0_4px_14px_rgba(53,168,83,0.3)] disabled:opacity-50"
                    >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </main>
          </div>
        )}

        {currentView === 'student-app' && (
          <main className="flex-1 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-white/75 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <span className="px-3 py-1 rounded-full bg-[#FFE7D6] text-[#1B2E23] text-xs font-bold shadow-inner">
                    Application Control Center
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-black text-[#1B2E23] mt-2">
                    College & Scholarship Portal
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5C7063] mt-1 font-medium">
                    Manage deadlines, review aid packages, and complete application checklists.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
                  <div className="bg-white/90 p-3.5 rounded-2xl border border-white/80 shadow-sm text-center">
                    <span className="text-xs text-[#5C7063] font-bold block">Saved Schools</span>
                    <span className="text-lg font-black text-[#1B2E23]">{savedSchools.length}</span>
                  </div>
                  <div className="bg-white/90 p-3.5 rounded-2xl border border-white/80 shadow-sm text-center">
                    <span className="text-xs text-[#5C7063] font-bold block">Submitted</span>
                    <span className="text-lg font-black text-[#35A853]">
                      {savedSchools.filter(s => s.status === 'Submitted').length}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-[#E9F8EC] to-[#C6F36B] p-3.5 rounded-2xl border border-white/80 shadow-sm text-center">
                    <span className="text-xs text-[#1B2E23] font-bold block">Next Deadline</span>
                    <span className="text-xs font-black text-[#1B2E23]">Nov 30, 2026</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-white/80 pb-2">
                <button
                  onClick={() => setAppTab('discovery')}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    appTab === 'discovery'
                      ? 'bg-gradient-to-r from-[#35A853] to-[#2d8f46] text-white shadow-[0_4px_14px_rgba(53,168,83,0.3)]'
                      : 'bg-white/80 text-[#5C7063] hover:text-[#1B2E23] border border-white/80'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>School Discovery</span>
                </button>

                <button
                  onClick={() => setAppTab('my-applications')}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    appTab === 'my-applications'
                      ? 'bg-gradient-to-r from-[#35A853] to-[#2d8f46] text-white shadow-[0_4px_14px_rgba(53,168,83,0.3)]'
                      : 'bg-white/80 text-[#5C7063] hover:text-[#1B2E23] border border-white/80'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>My Applications ({savedSchools.length})</span>
                </button>
              </div>

              {appTab === 'discovery' && (
                <div className="space-y-6">
                  <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <Search className=" w-4 h-4 text-[#5C7063] absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="Search universities by name or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs sm:text-sm text-[#1B2E23] focus:outline-none focus:border-[#35A853] shadow-inner font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Filter className="w-4 h-4 text-[#5C7063]" />
                      <select
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="px-3.5 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs font-bold text-[#1B2E23] focus:outline-none shadow-sm"
                      >
                        <option value="All">All Funding Categories</option>
                        <option value="Tuition Promise">Full Tuition Promise</option>
                        <option value="Need-Based">Need-Based Aid</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {schoolDirectory
                      .filter(sch => sch.name.toLowerCase().includes(searchQuery.toLowerCase()) || sch.location.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(school => {
                        const isSaved = savedSchools.some(s => s.id === school.id);
                        return (
                          <div key={school.id} className="bg-white/75 backdrop-blur-2xl p-6 rounded-3xl border border-white/80 hover:border-[#35A853] shadow-[0_8px_32px_rgba(0,0,0,0.03)] transition-all flex flex-col justify-between hover:-translate-y-0.5">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#E9F8EC] text-[#35A853] text-[10px] font-extrabold border border-white/80">
                                      {school.type}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#C6F36B] text-[#1B2E23] text-[10px] font-extrabold">
                                      {school.matchScore}
                                    </span>
                                  </div>
                                  <h4 className="text-xl font-black text-[#1B2E23]">{school.name}</h4>
                                  <p className="text-xs text-[#5C7063] font-medium">{school.location}</p>
                                </div>
                              </div>

                              <p className="text-xs text-[#5C7063] leading-relaxed mb-4 font-normal">
                                {school.desc}
                              </p>

                              <div className="flex flex-wrap gap-2 mb-4">
                                <span className="text-[11px] font-bold bg-[#FFD76A]/40 text-[#1B2E23] px-2.5 py-1 rounded-xl border border-white/80">
                                  {school.aid}
                                </span>
                                <span className="text-[11px] font-bold bg-white/90 text-[#5C7063] px-2.5 py-1 rounded-xl border border-white/80">
                                  {school.tuition}
                                </span>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-white/80 flex items-center justify-between text-xs">
                              <span className="text-[#5C7063] font-semibold">Deadline: {school.deadline}</span>
                              <button
                                onClick={() => handleSaveSchool(school)}
                                className={`px-4 py-2 rounded-2xl font-bold transition-all flex items-center gap-1.5 ${
                                  isSaved
                                    ? 'bg-[#E9F8EC] text-[#35A853] border border-[#35A853]'
                                    : 'bg-gradient-to-r from-[#35A853] to-[#2d8f46] text-white hover:opacity-95 shadow-sm'
                                }`}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                                <span>{isSaved ? 'Saved' : 'Start Application'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {appTab === 'my-applications' && (
                <div className="space-y-5">
                  {savedSchools.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-xl p-12 text-center rounded-3xl border border-white/80 shadow-sm">
                      <Building2 className="w-10 h-10 text-[#5C7063] mx-auto mb-3" />
                      <h3 className="text-base font-black text-[#1B2E23]">No Applications Added Yet</h3>
                      <p className="text-xs text-[#5C7063] mt-1 mb-4 font-medium">Search the school directory and click "Start Application" to track your progress.</p>
                      <button
                        onClick={() => setAppTab('discovery')}
                        className="px-5 py-2.5 bg-[#35A853] text-white text-xs font-bold rounded-2xl"
                      >
                        Browse Schools
                      </button>
                    </div>
                  ) : (
                    savedSchools.map(school => (
                      <div key={school.id} className="bg-white/80 backdrop-blur-2xl p-6 sm:p-7 rounded-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.03)] space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/80 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-black text-[#1B2E23]">{school.name}</h3>
                              <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold ${
                                school.status === 'Submitted'
                                  ? 'bg-[#E9F8EC] text-[#35A853]'
                                  : 'bg-[#FFE7D6] text-[#1B2E23]'
                              }`}>
                                {school.status}
                              </span>
                            </div>
                            <p className="text-xs text-[#5C7063] font-medium mt-0.5">{school.location} • Deadline: {school.deadline}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-black text-[#1B2E23] block">{school.progress}% Completed</span>
                            </div>
                            <div className="w-28 bg-[#F7F9F5] h-2.5 rounded-full overflow-hidden border border-white/80 shadow-inner">
                              <div className="bg-[#35A853] h-full transition-all duration-500" style={{ width: `${school.progress}%` }} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[11px] font-black text-[#5C7063] uppercase tracking-wider mb-2.5">
                            Milestone Checklist
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {school.checklist.map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => toggleChecklistItem(school.id, idx)}
                                className={`p-3.5 rounded-2xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-between ${
                                  item.done
                                    ? 'bg-[#E9F8EC] border-[#35A853] text-[#35A853] shadow-sm'
                                    : 'bg-white/90 border-white/80 text-[#1B2E23] hover:border-[#35A853]'
                                }`}
                              >
                                <span className="truncate pr-2">{item.task}</span>
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                  item.done ? 'bg-[#35A853] text-white' : 'border border-[#5C7063]'
                                }`}>
                                  {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, Play, Pause, Square, Volume2, CheckSquare, Square as SquareOutline, ArrowLeft, SkipBack, SkipForward } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { format } from 'date-fns';

interface QaScriptMeta {
  id: string;
  title: string;
  created_at: string;
  content: QnaPair[];
}

interface QnaPair {
  question: string;
  answer: string;
}

export default function QnA() {
  const [scripts, setScripts] = useState<QaScriptMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-select State
  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

  // Playback State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMultiPlaying, setIsMultiPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // To keep track of the queue
  const playQueue = useRef<{ text: string, isQuestion: boolean }[]>([]);
  const queueIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voices and Selection
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [questionVoiceURI, setQuestionVoiceURI] = useState<string>('');
  const [answerVoiceURI, setAnswerVoiceURI] = useState<string>('');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchScripts();

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
        return true;
      }
      return false;
    };

    if (!loadVoices()) {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      // Fallback for Mobile Edge / browsers where onvoiceschanged fails
      let attempts = 0;
      const interval = setInterval(() => {
        if (loadVoices() || attempts > 20) {
          clearInterval(interval);
        }
        attempts++;
      }, 500);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // When voices load, set default selections if not already set
  useEffect(() => {
    if (voices.length > 0) {
      if (!questionVoiceURI) {
        // 1. Edge preferred
        let v = voices.find(v => v.name.includes('Microsoft Emily'));
        // 2. Indian Female fallback
        if (!v) v = voices.find(v => v.lang.includes('IN') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('veena') || v.name.toLowerCase().includes('zira')));
        // 3. Any fallback
        if (!v) v = voices[0];
        if (v) setQuestionVoiceURI(v.voiceURI);
      }

      if (!answerVoiceURI) {
        // 1. Edge preferred
        let v = voices.find(v => v.name.includes('Microsoft Yan'));
        // 2. Indian Male fallback
        if (!v) v = voices.find(v => v.lang.includes('IN') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('ravi') || v.name.toLowerCase().includes('david')));
        // 3. Any fallback
        if (!v) v = voices[voices.length > 1 ? 1 : 0];
        if (v) setAnswerVoiceURI(v.voiceURI);
      }
    }
  }, [voices, questionVoiceURI, answerVoiceURI]);

  const filteredVoices = voices.filter(v => 
    v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) || 
    v.lang.toLowerCase().includes(voiceSearchQuery.toLowerCase())
  );

  const fetchScripts = async () => {
    try {
      const { data } = await api.get('/qna');
      setScripts(data || []);
    } catch {
      toast.error('Failed to fetch QA scripts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setTitleInput('');
    setJsonInput('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!jsonInput.trim()) {
      toast.error('Please enter JSON data');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonInput);
      if (!Array.isArray(parsedData)) {
        throw new Error('JSON must be an array of objects.');
      }
    } catch (error: any) {
      toast.error(`Invalid JSON: ${error.message}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/qna', { title: titleInput, content: parsedData });
      toast.success('QA Script saved successfully');
      setIsModalOpen(false);
      fetchScripts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save script');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setScriptToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!scriptToDelete) return;
    if (playingId === scriptToDelete || selectedScriptIds.has(scriptToDelete)) {
      stopPlayback();
    }
    try {
      await api.delete(`/qna/${scriptToDelete}`);
      toast.success('QA Script deleted');
      setSelectedScriptIds(prev => {
        const next = new Set(prev);
        next.delete(scriptToDelete);
        return next;
      });
      fetchScripts();
    } catch {
      toast.error('Failed to delete script');
    } finally {
      setScriptToDelete(null);
      setIsConfirmOpen(false);
    }
  };

  // ----- VOICE LOGIC -----
  const setupMediaSession = () => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Interactive QA Script',
        artist: 'MyAssistant Reader',
      });
      navigator.mediaSession.setActionHandler('play', resumePlayback);
      navigator.mediaSession.setActionHandler('pause', pausePlayback);
      navigator.mediaSession.setActionHandler('nexttrack', playNextItem);
      navigator.mediaSession.setActionHandler('previoustrack', playPrevItem);
    }
  };

  const playNextItem = () => {
    if (queueIndex.current < playQueue.current.length - 1) {
      jumpTo(queueIndex.current + 1);
    } else {
      stopPlayback();
    }
  };

  const playPrevItem = () => {
    if (queueIndex.current > 0) {
      jumpTo(queueIndex.current - 1);
    }
  };

  const jumpTo = (index: number) => {
    stopPlayback();
    queueIndex.current = index;
    // We need to keep playing state active since we are manually jumping
    setIsPlaying(true);
    
    // Unlock speech engine for mobile click-to-play
    const unlock = new SpeechSynthesisUtterance(' ');
    unlock.volume = 0.01;
    window.speechSynthesis.speak(unlock);
    if (audioRef.current) audioRef.current.play().catch(() => {});
    
    playNextInQueue();
  };

  const playNextInQueue = () => {
    if (queueIndex.current >= playQueue.current.length) {
      stopPlayback();
      return;
    }

    const item = playQueue.current[queueIndex.current];
    const utterance = new SpeechSynthesisUtterance(item.text);
    setActiveIndex(queueIndex.current);

    // Assign voices based on manual selection
    if (item.isQuestion) {
      const v = voices.find(v => v.voiceURI === questionVoiceURI);
      if (v) {
        utterance.voice = v;
        utterance.lang = v.lang;
      }
      utterance.pitch = 1.2;
    } else {
      const v = voices.find(v => v.voiceURI === answerVoiceURI);
      if (v) {
        utterance.voice = v;
        utterance.lang = v.lang;
      }
      utterance.pitch = 0.8;
    }

    utterance.onend = () => {
      queueIndex.current += 1;
      playNextInQueue();
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error', e);
      stopPlayback();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const prepareQueueFromData = (data: QnaPair[]) => {
    const queue: { text: string, isQuestion: boolean }[] = [];
    data.forEach(pair => {
      if (pair.question) queue.push({ text: pair.question, isQuestion: true });
      if (pair.answer) queue.push({ text: pair.answer, isQuestion: false });
    });
    return queue;
  };

  const startPlayback = async (id: string) => {
    const script = scripts.find(s => s.id === id);
    if (!script || !script.content || script.content.length === 0) {
      toast.error('Script is empty');
      return;
    }

    // 1. Synchronously stop any current playback BEFORE async operations
    stopPlayback();

    const toastId = toast.loading('Loading script...');
    try {
      let script = scripts.find(s => s.id === id);
      let content = script?.content;

      if (!content || content.length === 0) {
        const { data } = await api.get(`/qna/${id}`);
        content = data.content;
      }

      if (!content || content.length === 0) {
        toast.error('Script is empty', { id: toastId });
        return;
      }

      toast.dismiss(toastId);

      // 2. Synchronously speak a silent utterance to unlock the speech engine on mobile
      const unlock = new SpeechSynthesisUtterance(' ');
      unlock.volume = 0.01; // Don't use 0, iOS might ignore it
      window.speechSynthesis.speak(unlock);

      playQueue.current = prepareQueueFromData(content);
      queueIndex.current = 0;
      setActiveIndex(0);
      setPlayingId(id);
      setIsPlaying(true);
      setIsMultiPlaying(false);
      
      setupMediaSession();
      if (audioRef.current) audioRef.current.play().catch(() => {});

      playNextInQueue();
    } catch {
      toast.error('Failed to load script', { id: toastId });
    }
  };


  const startMultiPlayback = () => {
    if (selectedScriptIds.size === 0) return;

    let allQueue: { text: string, isQuestion: boolean }[] = [];
    Array.from(selectedScriptIds).forEach(id => {
      const script = scripts.find(s => s.id === id);
      if (script && script.content && script.content.length > 0) {
        allQueue = allQueue.concat(prepareQueueFromData(script.content));
      }
    });


    if (allQueue.length === 0) {
      toast.error('Selected scripts are empty');
      return;
    }

    // 1. Synchronously stop any current playback
    stopPlayback();

    // 2. Synchronously speak a silent utterance to unlock the speech engine on mobile
    const unlock = new SpeechSynthesisUtterance(' ');
    unlock.volume = 0.01;
    window.speechSynthesis.speak(unlock);

    playQueue.current = allQueue;
    queueIndex.current = 0;
    setActiveIndex(0);
    setPlayingId(null);
    setIsPlaying(true);
    setIsMultiPlaying(true);
    
    setupMediaSession();
    if (audioRef.current) audioRef.current.play().catch(() => {});

    playNextInQueue();
  };

  const pausePlayback = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  };

  const resumePlayback = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    window.speechSynthesis.cancel();
    // Don't clear queue in case they are just jumping, only clear on full close
    setIsPlaying(false);
  };
  
  const closeReader = () => {
    stopPlayback();
    playQueue.current = [];
    queueIndex.current = 0;
    setPlayingId(null);
    setIsMultiPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  const toggleSelect = (id: string) => {
    setSelectedScriptIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Silent audio track to keep MediaSession alive in background */}
      <audio ref={audioRef} loop src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" />
      
      {/* READER VIEW OVERLAY */}
      {(playingId || isMultiPlaying) && playQueue.current.length > 0 && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
            <button onClick={closeReader} className="mb-8 flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
               <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
            </button>
            
            <div className="space-y-6">
              {playQueue.current.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                 <div 
                   key={idx} 
                   onClick={() => jumpTo(idx)}
                   className={`p-5 rounded-2xl cursor-pointer transition-all ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 border-2 shadow-sm scale-[1.02]' : 'bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                 >
                   <span className={`font-bold text-xs uppercase tracking-wider block mb-2 ${isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                     {item.isQuestion ? 'Question (Female)' : 'Answer (Male)'}
                   </span>
                   <p className={`text-lg md:text-xl leading-relaxed ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300'}`}>{item.text}</p>
                 </div>
                );
              })}
            </div>
          </div>
          
          {/* Floating Controls */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-xl rounded-full px-6 py-4 border border-gray-100 dark:border-gray-700 flex items-center gap-6">
             <button onClick={playPrevItem} className="p-2 text-gray-500 hover:text-orange-600 transition-colors">
               <SkipBack className="w-6 h-6" />
             </button>
             {isPlaying ? (
               <button onClick={pausePlayback} className="p-4 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors shadow-sm">
                 <Pause className="w-6 h-6 fill-current" />
               </button>
             ) : (
               <button onClick={resumePlayback} className="p-4 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors shadow-sm">
                 <Play className="w-6 h-6 fill-current ml-1" />
               </button>
             )}
             <button onClick={playNextItem} className="p-2 text-gray-500 hover:text-orange-600 transition-colors">
               <SkipForward className="w-6 h-6" />
             </button>
             <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2"></div>
             <button onClick={closeReader} className="p-2 text-red-400 hover:text-red-600 transition-colors">
               <Square className="w-6 h-6 fill-current" />
             </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interactive QA Scripts</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Questions are read by a female voice, answers by a male voice.</p>
        </div>
        <div className="flex gap-3">
          {selectedScriptIds.size > 0 && (
            <div className="flex items-center gap-2 mr-4">
              {isMultiPlaying ? (
                <div className="flex bg-orange-100 rounded-xl">
                  {isPlaying ? (
                    <button onClick={pausePlayback} className="p-2.5 text-orange-600 hover:bg-orange-200 rounded-xl transition-colors">
                      <Pause className="w-5 h-5" />
                    </button>
                  ) : (
                    <button onClick={resumePlayback} className="p-2.5 text-orange-600 hover:bg-orange-200 rounded-xl transition-colors">
                      <Play className="w-5 h-5 ml-0.5" />
                    </button>
                  )}
                  <button onClick={stopPlayback} className="p-2.5 text-red-600 hover:bg-red-200 rounded-xl transition-colors">
                    <Square className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startMultiPlayback}
                  className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent rounded-full sm:rounded-xl shadow-sm text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 transition-colors"
                >
                  <Play className="sm:-ml-1 sm:mr-2 h-5 w-5" />
                  <span className="hidden sm:inline">Play Selected ({selectedScriptIds.size})</span>
                </button>
              )}
            </div>
          )}
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent rounded-full sm:rounded-xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors"
          >
            <Plus className="sm:-ml-1 sm:mr-2 h-5 w-5" />
            <span className="hidden sm:inline">New Script</span>
          </button>
        </div>
      </div>

      {/* Voice Selection Settings */}
      {voices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-4">
          
          <div className="w-full">
            <input
              type="text"
              placeholder="Search voices by name or language (e.g., 'English', 'Microsoft')..."
              value={voiceSearchQuery}
              onChange={(e) => setVoiceSearchQuery(e.target.value)}
              className="w-full text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Question Voice (Female)</label>
              <select
                value={questionVoiceURI}
                onChange={e => setQuestionVoiceURI(e.target.value)}
                className="w-full text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {filteredVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Answer Voice (Male)</label>
              <select
                value={answerVoiceURI}
                onChange={e => setAnswerVoiceURI(e.target.value)}
                className="w-full text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {filteredVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>)}
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <Volume2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No QA scripts found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click "New Script" to import your JSON.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {scripts.map((script) => (
              <div key={script.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border transition-shadow group flex flex-col ${playingId === script.id ? 'border-orange-500 shadow-md ring-1 ring-orange-500' : selectedScriptIds.has(script.id) ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleSelect(script.id)} className="mt-1 text-gray-400 hover:text-blue-500 transition-colors shrink-0">
                      {selectedScriptIds.has(script.id) ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <SquareOutline className="w-5 h-5" />}
                    </button>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2" title={script.title}>{script.title}</h3>
                  </div>
                  <button
                    onClick={() => confirmDelete(script.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 ml-2"
                    title="Delete Script"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center py-6">
                  {playingId === script.id ? (
                    <div className="flex justify-center items-center gap-4">
                      {isPlaying ? (
                        <button onClick={pausePlayback} className="p-3 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 shadow-sm">
                          <Pause className="w-6 h-6" />
                        </button>
                      ) : (
                        <button onClick={resumePlayback} className="p-3 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 shadow-sm">
                          <Play className="w-6 h-6 ml-1" />
                        </button>
                      )}
                      <button onClick={stopPlayback} className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-sm">
                        <Square className="w-6 h-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <button onClick={() => startPlayback(script.id)} disabled={isMultiPlaying} className="p-4 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-full hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition-colors disabled:opacity-50">
                        <Play className="w-8 h-8 ml-1" />
                        <span className="sr-only">Read Script</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Script</span>
                  <span>{format(new Date(script.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-100 dark:border-gray-700">
              <form onSubmit={handleSubmit}>
                <div className="px-6 pt-6 pb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">New QA Script</h3>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={titleInput}
                        onChange={e => setTitleInput(e.target.value)}
                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                        placeholder="e.g. Science Chapter 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        JSON Content <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-orange-600 dark:text-orange-400 ml-2">{'[{ "question": "...", "answer": "..." }]'}</code>
                      </label>
                      <textarea
                        required
                        rows={12}
                        value={jsonInput}
                        onChange={e => setJsonInput(e.target.value)}
                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-orange-500 focus:border-orange-500 bg-gray-50 dark:bg-gray-900/50 dark:text-white font-mono text-sm"
                        placeholder={'[\n  {\n    "question": "What is the capital of France?",\n    "answer": "Paris"\n  }\n]'}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex justify-center rounded-xl px-6 py-2 bg-orange-600 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Script'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Script"
        message="Are you sure you want to delete this script?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

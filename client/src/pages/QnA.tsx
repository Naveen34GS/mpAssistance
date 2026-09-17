import React, { useEffect, useState, useRef, useMemo } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Database, Plus, Trash2, HelpCircle, Loader2, Play, Pause, Square, Volume2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { format } from 'date-fns';

interface QaScriptMeta {
  id: string;
  title: string;
  created_at: string;
}

interface QnaPair {
  question: string;
  answer: string;
}

export default function QnA() {
  const [scripts, setScripts] = useState<QaScriptMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

  // Playback State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // To keep track of the queue
  const playQueue = useRef<{text: string, isQuestion: boolean}[]>([]);
  const queueIndex = useRef(0);

  // Voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    fetchScripts();
    
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
      }
    };
    
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

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
    if (playingId === scriptToDelete) {
       stopPlayback();
    }
    try {
      await api.delete(`/qna/${scriptToDelete}`);
      toast.success('QA Script deleted');
      fetchScripts();
    } catch {
      toast.error('Failed to delete script');
    } finally {
      setScriptToDelete(null);
      setIsConfirmOpen(false);
    }
  };

  // ----- VOICE LOGIC -----
  const getFemaleVoice = () => {
    // Basic heuristic for female voices
    return voices.find(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('zira') || 
      v.name.toLowerCase().includes('samantha') || 
      v.name.toLowerCase().includes('victoria') ||
      v.name.toLowerCase().includes('karen')
    ) || voices[0];
  };

  const getMaleVoice = () => {
    // Basic heuristic for male voices
    return voices.find(v => 
      v.name.toLowerCase().includes('male') || 
      v.name.toLowerCase().includes('david') || 
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('alex') ||
      v.name.toLowerCase().includes('mark')
    ) || voices[voices.length > 1 ? 1 : 0];
  };

  const playNextInQueue = () => {
    if (queueIndex.current >= playQueue.current.length) {
      stopPlayback();
      return;
    }

    const item = playQueue.current[queueIndex.current];
    const utterance = new SpeechSynthesisUtterance(item.text);
    
    // Assign voices based on question/answer
    if (item.isQuestion) {
       const v = getFemaleVoice();
       if (v) utterance.voice = v;
       utterance.pitch = 1.2; // Slightly higher pitch for female as fallback
    } else {
       const v = getMaleVoice();
       if (v) utterance.voice = v;
       utterance.pitch = 0.8; // Slightly lower pitch for male as fallback
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

  const startPlayback = async (id: string) => {
    stopPlayback();
    const toastId = toast.loading('Loading script...');
    
    try {
      const { data } = await api.get(`/qna/${id}`);
      const content: QnaPair[] = data.content;
      
      if (!content || content.length === 0) {
        toast.error('Script is empty', { id: toastId });
        return;
      }

      toast.dismiss(toastId);

      // Flatten into a queue of alternating question/answer
      const queue: {text: string, isQuestion: boolean}[] = [];
      content.forEach(pair => {
         if (pair.question) queue.push({ text: pair.question, isQuestion: true });
         if (pair.answer) queue.push({ text: pair.answer, isQuestion: false });
      });

      playQueue.current = queue;
      queueIndex.current = 0;
      setPlayingId(id);
      setIsPlaying(true);
      
      playNextInQueue();

    } catch {
      toast.error('Failed to load script', { id: toastId });
    }
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
    playQueue.current = [];
    queueIndex.current = 0;
    setPlayingId(null);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interactive QA Scripts</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Questions are read by a female voice, answers by a male voice.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent rounded-full sm:rounded-xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors"
        >
          <Plus className="sm:-ml-1 sm:mr-2 h-5 w-5" />
          <span className="hidden sm:inline">New Script</span>
        </button>
      </div>

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
              <div key={script.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border transition-shadow group flex flex-col ${playingId === script.id ? 'border-orange-500 shadow-md ring-1 ring-orange-500' : 'border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 truncate" title={script.title}>{script.title}</h3>
                  <button 
                    onClick={() => confirmDelete(script.id)} 
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" 
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
                       <button onClick={() => startPlayback(script.id)} className="p-4 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-full hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition-colors">
                         <Play className="w-8 h-8 ml-1" />
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

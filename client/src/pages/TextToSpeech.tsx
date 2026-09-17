import React, { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Headphones, Loader2, Play, Square, Pause } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { format } from 'date-fns';

interface TTSFile {
  id: string;
  filename: string;
  title: string;
  size: number;
  updatedAt: string;
}

export default function TextToSpeech() {
  const [files, setFiles] = useState<TTSFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [currentFile, setCurrentFile] = useState<{title: string, content: string, filename?: string}>({ title: '', content: '' });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Playback state
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceQueue = useRef<SpeechSynthesisUtterance[]>([]);
  const currentUtteranceIndex = useRef(0);

  useEffect(() => {
    fetchFiles();
    
    // Cleanup synthesis on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const fetchFiles = async () => {
    try {
      const { data } = await api.get('/tts');
      setFiles(data || []);
    } catch {
      toast.error('Failed to fetch text files');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentFile.filename) {
        await api.put(`/tts/${currentFile.filename}`, { content: currentFile.content });
        toast.success('File updated');
      } else {
        await api.post('/tts', { title: currentFile.title, content: currentFile.content });
        toast.success('File created');
      }
      setIsModalOpen(false);
      fetchFiles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (filename: string) => {
    setFileToDelete(filename);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    const filename = fileToDelete;
    if (!filename) return;
    
    if (playingFile === filename) {
      stopPlayback();
    }

    setIsDeleting(filename);
    try {
      await api.delete(`/tts/${filename}`);
      toast.success('File deleted');
      fetchFiles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    } finally {
      setIsDeleting(null);
      setIsConfirmOpen(false);
    }
  };

  const openModalForNew = () => {
    setCurrentFile({ title: '', content: '' });
    setIsModalOpen(true);
  };

  const openModalForEdit = async (file: TTSFile) => {
    try {
      const { data } = await api.get(`/tts/${file.filename}`);
      setCurrentFile({ title: file.title, content: data.content, filename: file.filename });
      setIsModalOpen(true);
    } catch {
      toast.error('Failed to load file content');
    }
  };

  // Text-to-Speech logic
  const playNextChunk = () => {
    if (currentUtteranceIndex.current >= utteranceQueue.current.length) {
      // Done playing
      setIsPlaying(false);
      setPlayingFile(null);
      return;
    }
    
    const utterance = utteranceQueue.current[currentUtteranceIndex.current];
    utterance.onend = () => {
      currentUtteranceIndex.current += 1;
      playNextChunk();
    };
    
    utterance.onerror = (e) => {
      console.error('Speech synthesis error', e);
      stopPlayback();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startPlayback = async (filename: string) => {
    try {
      stopPlayback(); // Cancel any existing playback

      // Fetch the full content
      const { data } = await api.get(`/tts/${filename}`);
      const text = data.content;

      if (!text || text.trim() === '') {
        toast.error('File is empty');
        return;
      }

      // Split into chunks to bypass browser limits (e.g., ~200 chars limit on some engines)
      // Splitting by paragraphs or reasonable chunks (like sentences) is best.
      // Here we chunk by paragraphs (double newline) or max length safely.
      const rawChunks = text.split(/\n\n+/);
      const refinedChunks: string[] = [];
      
      for (let chunk of rawChunks) {
        chunk = chunk.trim();
        if (!chunk) continue;
        
        // If a paragraph is still too long, chunk by sentence or hard limit
        const MAX_LEN = 250;
        let start = 0;
        while (start < chunk.length) {
          refinedChunks.push(chunk.substring(start, start + MAX_LEN));
          start += MAX_LEN;
        }
      }

      if (refinedChunks.length === 0) return;

      utteranceQueue.current = refinedChunks.map(c => new SpeechSynthesisUtterance(c));
      currentUtteranceIndex.current = 0;
      setPlayingFile(filename);
      setIsPlaying(true);

      playNextChunk();
    } catch {
      toast.error('Failed to load file for playback');
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
    utteranceQueue.current = [];
    currentUtteranceIndex.current = 0;
    setIsPlaying(false);
    setPlayingFile(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Text to Speech</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and listen to large text files.</p>
        </div>
        <button
          onClick={openModalForNew}
          className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent rounded-full sm:rounded-xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors"
        >
          <Plus className="sm:-ml-1 sm:mr-2 h-5 w-5" />
          <span className="hidden sm:inline">New File</span>
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>)}
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Headphones className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No files</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new text file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {files.map(file => (
            <div key={file.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border transition-shadow group flex flex-col ${playingFile === file.filename ? 'border-orange-500 shadow-md ring-1 ring-orange-500' : 'border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md'}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 truncate" title={file.title}>{file.title}</h3>
                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex space-x-2">
                  <button onClick={() => openModalForEdit(file)} className="text-gray-400 hover:text-orange-500" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => confirmDelete(file.filename)} disabled={isDeleting === file.filename} className="text-gray-400 hover:text-red-500 disabled:opacity-50" title="Delete">
                    {isDeleting === file.filename ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center py-6">
                 {playingFile === file.filename ? (
                   <div className="flex justify-center items-center gap-4">
                      {isPlaying ? (
                        <button onClick={pausePlayback} className="p-3 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200">
                          <Pause className="w-6 h-6" />
                        </button>
                      ) : (
                        <button onClick={resumePlayback} className="p-3 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200">
                          <Play className="w-6 h-6 ml-1" />
                        </button>
                      )}
                      <button onClick={stopPlayback} className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200">
                        <Square className="w-6 h-6" />
                      </button>
                   </div>
                 ) : (
                   <div className="flex justify-center">
                     <button onClick={() => startPlayback(file.filename)} className="p-4 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-full hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition-colors">
                       <Play className="w-8 h-8 ml-1" />
                     </button>
                   </div>
                 )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{formatSize(file.size)}</span>
                <span>{format(new Date(file.updatedAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for creating/editing */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-100 dark:border-gray-700">
              <form onSubmit={handleSubmit}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                      {currentFile.filename ? 'Edit Text File' : 'New Text File'}
                    </h3>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                      <input
                        type="text"
                        required
                        disabled={!!currentFile.filename}
                        value={currentFile.title || ''}
                        onChange={e => setCurrentFile({...currentFile, title: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        placeholder="e.g. Harry Potter Chapter 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content (Paste large text here)</label>
                      <textarea
                        required
                        rows={15}
                        value={currentFile.content || ''}
                        onChange={e => setCurrentFile({...currentFile, content: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white font-mono"
                        placeholder="Paste your 5000+ lines here..."
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                  <button type="submit" disabled={isSaving} className="inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-2 bg-orange-600 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save File
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-6 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete File"
        message="Are you sure you want to delete this text file? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

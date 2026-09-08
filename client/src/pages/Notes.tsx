import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, FileText, Loader2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { format } from 'date-fns';

interface Note {
  id: string;
  title: string;
  content: string;
  note_date: string;
  note_time: string;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data } = await api.get('/notes');
      setNotes(data || []);
    } catch (error) {
      toast.error('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentNote.id) {
        await api.put(`/notes/${currentNote.id}`, currentNote);
        toast.success('Note updated');
      } else {
        await api.post('/notes', currentNote);
        toast.success('Note created');
      }
      setIsModalOpen(false);
      fetchNotes();
    } catch (error: any) {
      const msg = error.response?.data?.error;
      const displayMsg = Array.isArray(msg) ? msg[0].message : (typeof msg === 'string' ? msg : 'Failed to save');
      toast.error(displayMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10));
    d.setMinutes(parseInt(minutes, 10));
    return format(d, 'h:mm a');
  };

  const confirmDelete = (id: string) => {
    setNoteToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    const idToDelete = noteToDelete;
    if (!idToDelete) return;
    setIsDeleting(idToDelete);
    try {
      await api.delete(`/notes/${noteToDelete}`);
      toast.success('Note deleted');
      fetchNotes();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    } finally {
      setIsDeleting(null);
    }
  };

  const openModal = (note?: Note) => {
    setCurrentNote(note || {
      title: '',
      content: '',
      note_date: format(new Date(), 'yyyy-MM-dd'),
      note_time: format(new Date(), 'HH:mm')
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your personal notes and ideas.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent rounded-full sm:rounded-xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors"
        >
          <Plus className="sm:-ml-1 sm:mr-2 h-5 w-5" />
          <span className="hidden sm:inline">New Note</span>
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>)}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No notes</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new note.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {notes.map(note => (
            <div key={note.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{note.title}</h3>
                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex space-x-2">
                  <button onClick={() => openModal(note)} className="text-gray-400 hover:text-orange-500">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => confirmDelete(note.id)} disabled={isDeleting === note.id} className="text-gray-400 hover:text-red-500 disabled:opacity-50">
                    {isDeleting === note.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm flex-1 whitespace-pre-wrap line-clamp-4">
                {note.content}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{note.note_date ? format(new Date(note.note_date), 'MMM d, yyyy') : 'No date'}</span>
                <span>{formatTime(note.note_time)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-700">
              <form onSubmit={handleSubmit}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                      {currentNote.id ? 'Edit Note' : 'New Note'}
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
                        value={currentNote.title || ''}
                        onChange={e => setCurrentNote({...currentNote, title: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                      <textarea
                        rows={4}
                        value={currentNote.content || ''}
                        onChange={e => setCurrentNote({...currentNote, content: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                  <button type="submit" disabled={isSaving} className="inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-2 bg-orange-600 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save
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
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

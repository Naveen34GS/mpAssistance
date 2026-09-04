import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, FileText } from 'lucide-react';
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
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});

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
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await api.delete(`/notes/${id}`);
        toast.success('Note deleted');
        fetchNotes();
      } catch (error) {
        toast.error('Failed to delete note');
      }
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
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          New Note
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
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                  <button onClick={() => openModal(note)} className="text-gray-400 hover:text-blue-500">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm flex-1 whitespace-pre-wrap line-clamp-4">
                {note.content}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{note.note_date ? format(new Date(note.note_date), 'MMM d, yyyy') : 'No date'}</span>
                <span>{note.note_time}</span>
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
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                      <textarea
                        rows={4}
                        value={currentNote.content || ''}
                        onChange={e => setCurrentNote({...currentNote, content: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <input
                          type="date"
                          value={currentNote.note_date || ''}
                          onChange={e => setCurrentNote({...currentNote, note_date: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
                        <input
                          type="time"
                          value={currentNote.note_time || ''}
                          onChange={e => setCurrentNote({...currentNote, note_time: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100 dark:border-gray-700">
                  <button type="submit" className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Save
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

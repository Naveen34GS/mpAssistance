import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Gift, Loader2, MessageCircle } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { format, differenceInDays } from 'date-fns';

interface Birthday {
  id: string;
  person_name: string;
  birthday_date: string;
  whatsapp_number: string;
  message_template: string;
  notify_days_before: number;
  notify_time: string;
}

export default function Birthdays() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [currentBirthday, setCurrentBirthday] = useState<Partial<Birthday>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [birthdayToDelete, setBirthdayToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    try {
      const { data } = await api.get('/birthdays');
      setBirthdays(data || []);
    } catch (error) {
      toast.error('Failed to fetch birthdays');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentBirthday.id) {
        await api.put(`/birthdays/${currentBirthday.id}`, currentBirthday);
        toast.success('Birthday updated');
      } else {
        await api.post('/birthdays', currentBirthday);
        toast.success('Birthday added');
      }
      setIsModalOpen(false);
      fetchBirthdays();
    } catch (error: any) {
      const msg = error.response?.data?.error;
      const displayMsg = Array.isArray(msg) ? msg[0].message : (typeof msg === 'string' ? msg : 'Failed to save');
      toast.error(displayMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setBirthdayToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    const idToDelete = birthdayToDelete;
    if (!idToDelete) return;
    setIsDeleting(idToDelete);
    try {
      await api.delete(`/birthdays/${idToDelete}`);
      toast.success('Birthday deleted');
      fetchBirthdays();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    } finally {
      setIsDeleting(null);
      setIsConfirmOpen(false);
    }
  };

  const openModal = (birthday?: Birthday) => {
    setCurrentBirthday(birthday || {
      person_name: '',
      birthday_date: format(new Date(), 'yyyy-MM-dd'),
      whatsapp_number: '',
      message_template: 'Happy Birthday! 🎉 Wishing you all the best.',
      notify_days_before: 0,
      notify_time: '09:00'
    });
    setIsModalOpen(true);
  };

  const handleWhatsApp = (birthday: Birthday) => {
    if (!birthday.whatsapp_number) {
      toast.error('No WhatsApp number saved for this person.');
      return;
    }
    // Clean number (remove + or spaces if any)
    const cleanNumber = birthday.whatsapp_number.replace(/\D/g, '');
    const message = encodeURIComponent(birthday.message_template || 'Happy Birthday!');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bday = new Date(dateStr);
    bday.setFullYear(today.getFullYear());
    
    if (bday < today) {
      bday.setFullYear(today.getFullYear() + 1);
    }
    
    const diff = differenceInDays(bday, today);
    if (diff === 0) return 'Today!';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Birthday Wishes</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Never miss a birthday again. Set reminders and quick-send WhatsApp wishes.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent rounded-full sm:rounded-xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors"
        >
          <Plus className="sm:-ml-1 sm:mr-2 h-5 w-5" />
          <span className="hidden sm:inline">Add Birthday</span>
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>)}
        </div>
      ) : birthdays.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Gift className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No birthdays tracked</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add someone's birthday to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {birthdays.map(birthday => (
            <div key={birthday.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 rounded-bl-2xl text-xs font-bold">
                {getDaysUntil(birthday.birthday_date)}
              </div>
              <div className="flex justify-between items-start mb-4 pr-20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <Gift size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{birthday.person_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(birthday.birthday_date), 'MMMM do')}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800 flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic line-clamp-3">
                  "{birthday.message_template}"
                </p>
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => handleWhatsApp(birthday)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Reminder: {birthday.notify_days_before === 0 ? 'Day of' : `${birthday.notify_days_before} days before`} at {birthday.notify_time}</span>
                <div className="flex space-x-2">
                  <button onClick={() => openModal(birthday)} className="text-gray-400 hover:text-orange-500 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => confirmDelete(birthday.id)} disabled={isDeleting === birthday.id} className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors">
                    {isDeleting === birthday.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
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
                      {currentBirthday.id ? 'Edit Birthday' : 'Add Birthday'}
                    </h3>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                      <input
                        type="text"
                        required
                        value={currentBirthday.person_name || ''}
                        onChange={e => setCurrentBirthday({...currentBirthday, person_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Birthday Date</label>
                      <input
                        type="date"
                        required
                        value={currentBirthday.birthday_date || ''}
                        onChange={e => setCurrentBirthday({...currentBirthday, birthday_date: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Number (with country code)</label>
                      <input
                        type="text"
                        value={currentBirthday.whatsapp_number || ''}
                        onChange={e => setCurrentBirthday({...currentBirthday, whatsapp_number: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        placeholder="+1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Template</label>
                      <textarea
                        rows={3}
                        value={currentBirthday.message_template || ''}
                        onChange={e => setCurrentBirthday({...currentBirthday, message_template: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notify Me</label>
                        <select
                          value={currentBirthday.notify_days_before?.toString() || '0'}
                          onChange={e => setCurrentBirthday({...currentBirthday, notify_days_before: parseInt(e.target.value)})}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        >
                          <option value="0">On the day</option>
                          <option value="1">1 day before</option>
                          <option value="2">2 days before</option>
                          <option value="3">3 days before</option>
                          <option value="7">1 week before</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">At Time</label>
                        <input
                          type="time"
                          value={currentBirthday.notify_time?.substring(0, 5) || '09:00'}
                          onChange={e => setCurrentBirthday({...currentBirthday, notify_time: e.target.value + ':00'})}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        />
                      </div>
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
        title="Delete Birthday"
        message="Are you sure you want to remove this birthday?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

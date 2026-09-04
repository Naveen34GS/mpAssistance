import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({});
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [filterDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const url = filterDate ? `/events?date=${filterDate}` : '/events';
      const { data } = await api.get(url);
      setEvents(data || []);
    } catch (error) {
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentEvent.id) {
        await api.put(`/events/${currentEvent.id}`, currentEvent);
        toast.success('Event updated');
      } else {
        await api.post('/events', currentEvent);
        toast.success('Event created');
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await api.delete(`/events/${id}`);
        toast.success('Event deleted');
        fetchEvents();
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  const markCompleted = async (event: Event) => {
    try {
      await api.put(`/events/${event.id}`, { ...event, status: 'completed' });
      fetchEvents();
    } catch (error) {
      toast.error('Failed to update event');
    }
  };

  const openModal = (event?: Event) => {
    setCurrentEvent(event || {
      title: '',
      description: '',
      event_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
      status: 'pending'
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your schedule and upcoming tasks.</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-800 dark:text-white"
          />
          {filterDate && (
             <button onClick={() => setFilterDate('')} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
          )}
          <button
            onClick={() => openModal()}
            className="whitespace-nowrap flex-shrink-0 inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Event
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No events found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create an event to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {events.map((event) => (
              <li key={event.id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center min-w-0 gap-4">
                   <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px]">
                      <span className="text-xs font-medium text-gray-500 uppercase">{format(new Date(event.event_date), 'MMM')}</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{format(new Date(event.event_date), 'dd')}</span>
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold truncate ${event.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {event.title}
                        </p>
                        {event.status === 'completed' && <CheckCircle size={14} className="text-green-500" />}
                     </div>
                     <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                       {event.start_time} {event.end_time && `- ${event.end_time}`}
                     </p>
                     {event.description && (
                       <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">{event.description}</p>
                     )}
                   </div>
                </div>
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  {event.status !== 'completed' && (
                    <button onClick={() => markCompleted(event)} className="p-2 text-gray-400 hover:text-green-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => openModal(event)} className="p-2 text-gray-400 hover:text-blue-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
                      {currentEvent.id ? 'Edit Event' : 'New Event'}
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
                        value={currentEvent.title || ''}
                        onChange={e => setCurrentEvent({...currentEvent, title: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                      <textarea
                        rows={2}
                        value={currentEvent.description || ''}
                        onChange={e => setCurrentEvent({...currentEvent, description: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <input
                          type="date"
                          required
                          value={currentEvent.event_date || ''}
                          onChange={e => setCurrentEvent({...currentEvent, event_date: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                        <input
                          type="time"
                          required
                          value={currentEvent.start_time || ''}
                          onChange={e => setCurrentEvent({...currentEvent, start_time: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                        <input
                          type="time"
                          value={currentEvent.end_time || ''}
                          onChange={e => setCurrentEvent({...currentEvent, end_time: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                       <select
                         value={currentEvent.status || 'pending'}
                         onChange={e => setCurrentEvent({...currentEvent, status: e.target.value as any})}
                         className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                       >
                         <option value="pending">Pending</option>
                         <option value="completed">Completed</option>
                         <option value="cancelled">Cancelled</option>
                       </select>
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

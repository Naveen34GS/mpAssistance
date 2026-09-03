import { useEffect, useState } from 'react';
import api from '../lib/api';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle2, Clock } from 'lucide-react';

export default function Dashboard() {
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayEvents();
  }, []);

  const fetchTodayEvents = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await api.get(`/events?date=${today}`);
      setTodayEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (id: string) => {
    try {
      await api.put(`/events/${id}`, { status: 'completed' });
      fetchTodayEvents();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Today's Events</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{todayEvents.length}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Plan */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Today's Plan</h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          ) : todayEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No events today</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enjoy your free time!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {todayEvents.map((event) => (
                <li key={event.id} className="relative flex items-center space-x-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${event.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {event.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${event.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'} truncate`}>
                      {event.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {event.start_time} {event.end_time && `- ${event.end_time}`}
                    </p>
                  </div>
                  {event.status !== 'completed' && (
                    <div>
                      <button
                        onClick={() => markCompleted(event.id)}
                        className="inline-flex items-center shadow-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm leading-5 font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        Complete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

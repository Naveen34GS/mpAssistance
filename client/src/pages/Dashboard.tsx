import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle2, Clock, StickyNote, Files, Wallet, ShieldAlert, User, XCircle } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  status: 'pending' | 'completed' | 'cancelled';
}

const FEATURES = [
  { name: 'Notes', href: '/notes', icon: StickyNote, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'Tasks', href: '/events', icon: CalendarIcon, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { name: 'Documents', href: '/documents', icon: Files, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  { name: 'Finance Manager', href: '/finance', icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'PWS Management', href: '/pws', icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  { name: 'Profile', href: '#', icon: User, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
];

export default function Dashboard() {
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const markCompleted = async (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/events/${event.id}`, { ...event, status: 'completed' });
      fetchTodayEvents();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const navigateToTask = (taskId: string) => {
    navigate('/events', { state: { editTaskId: taskId } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back! Access your features or view what's happening today.
        </p>
      </div>

      {/* Features Grid (3x2) */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.name}
              to={feature.href}
              className="flex flex-col items-center justify-center p-3 sm:py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800 transition-all group"
            >
              <div className={`p-2.5 rounded-full ${feature.bg} mb-2 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white text-center leading-tight">
                {feature.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Today's Tasks</dt>
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
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Today's Tasks</h3>
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
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tasks today</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enjoy your free time!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {todayEvents.map((event) => {
                const isCompleted = event.status === 'completed';
                const isCancelled = event.status === 'cancelled';
                
                let iconBg = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
                let Icon = Clock;
                
                if (isCompleted) {
                  iconBg = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
                  Icon = CheckCircle2;
                } else if (isCancelled) {
                  iconBg = 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
                  Icon = XCircle;
                }

                return (
                  <li 
                    key={event.id} 
                    onClick={() => navigateToTask(event.id)}
                    className="relative flex items-center space-x-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800 cursor-pointer transition-colors"
                  >
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${iconBg}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isCompleted ? 'text-gray-500' : (isCancelled ? 'text-red-500' : 'text-gray-900 dark:text-white')} truncate`}>
                        {event.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {event.start_time}
                      </p>
                    </div>
                    {event.status === 'pending' && (
                      <div>
                        <button
                          onClick={(e) => markCompleted(event, e)}
                          className="inline-flex items-center shadow-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm leading-5 font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          Complete
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

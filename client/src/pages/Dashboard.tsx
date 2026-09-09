import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle2, Clock, StickyNote, Files, Wallet, ShieldAlert, User, XCircle, Loader2 } from 'lucide-react';

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
  const [popupEvent, setPopupEvent] = useState<Event | null>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'completed' | 'cancelled'>('pending');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [customDate, setCustomDate] = useState<string>('');

  useEffect(() => {
    fetchEvents(dateFilter, customDate);
  }, [dateFilter, customDate]);

  const fetchEvents = async (filter: string = dateFilter, selectedCustomDate: string = customDate) => {
    setLoading(true);
    try {
      let dateStr = '';
      if (filter === 'custom' && selectedCustomDate) {
        dateStr = selectedCustomDate;
      } else {
        const dateObj = new Date();
        if (filter === 'yesterday') {
          dateObj.setDate(dateObj.getDate() - 1);
        } else if (filter === 'tomorrow') {
          dateObj.setDate(dateObj.getDate() + 1);
        }
        dateStr = format(dateObj, 'yyyy-MM-dd');
      }
      
      const { data } = await api.get(`/events?date=${dateStr}`);
      setTodayEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setCustomDate(e.target.value);
      setDateFilter('custom');
    }
  };

  const updateStatus = async (event: Event, status: string) => {
    setIsUpdating(status);
    try {
      await api.put(`/events/${event.id}`, { ...event, status });
      await fetchEvents(dateFilter, customDate);
      setPopupEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    } finally {
      setIsUpdating(null);
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

      {/* Tasks Container */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        
        {/* Date Filter Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg w-full">
            {['yesterday', 'today', 'tomorrow'].map(d => (
              <button
                key={d}
                onClick={() => { setDateFilter(d); setCustomDate(''); }}
                className={`flex-1 px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${dateFilter === d ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                {d}
              </button>
            ))}
            <label className={`relative flex items-center justify-center w-10 sm:w-12 ml-1 rounded-md transition-all cursor-pointer ${dateFilter === 'custom' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <CalendarIcon size={18} />
              <input
                type="date"
                value={customDate}
                onChange={handleCustomDateChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
            </label>
          </div>
        </div>

        {/* Summary Cards (Tabs) inside the container */}
        <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
          <div className="text-center mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {dateFilter === 'custom' && customDate 
                ? format(new Date(customDate), 'MMM d, yyyy') 
                : dateFilter === 'yesterday' 
                  ? format(new Date(new Date().setDate(new Date().getDate() - 1)), 'MMM d, yyyy')
                  : dateFilter === 'tomorrow'
                    ? format(new Date(new Date().setDate(new Date().getDate() + 1)), 'MMM d, yyyy')
                    : format(new Date(), 'MMM d, yyyy')}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            {[
              { id: 'pending', label: 'Pending', count: todayEvents.filter(e => e.status === 'pending').length, color: 'text-orange-600 dark:text-orange-400', bg: selectedTab === 'pending' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500' },
              { id: 'completed', label: 'Completed', count: todayEvents.filter(e => e.status === 'completed').length, color: 'text-green-600 dark:text-green-400', bg: selectedTab === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500' },
              { id: 'cancelled', label: 'Cancelled', count: todayEvents.filter(e => e.status === 'cancelled').length, color: 'text-red-600 dark:text-red-400', bg: selectedTab === 'cancelled' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex flex-col items-center justify-center py-3 px-2 sm:p-4 rounded-xl border transition-all text-center ${tab.bg}`}
              >
                <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none">{tab.count}</span>
                <span className={`text-[10px] sm:text-xs font-semibold mt-1.5 uppercase tracking-wider ${tab.color}`}>{tab.label}</span>
              </button>
            ))}
          </div>
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
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No task</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enjoy your free time!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {todayEvents.filter(e => e.status === selectedTab).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No task</p>
                </div>
              ) : todayEvents.filter(e => e.status === selectedTab).map((event) => {
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
                    onClick={() => setPopupEvent(event)}
                    className="relative flex items-center space-x-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800 cursor-pointer transition-colors"
                  >
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${iconBg}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isCompleted ? 'text-gray-500' : (isCancelled ? 'text-red-500' : 'text-gray-900 dark:text-white')} truncate`}>
                        {event.title}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {/* Event Details Popup */}
      {popupEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setPopupEvent(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-700">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 dark:text-white pr-4" id="modal-title">
                    {popupEvent.title}
                  </h3>
                  <button type="button" onClick={() => setPopupEvent(null)} className="text-gray-400 hover:text-gray-500">
                    <XCircle size={24} />
                  </button>
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Time</p>
                    <p className="text-base text-gray-900 dark:text-white font-medium">{formatTime(popupEvent.start_time)}</p>
                  </div>
                  {popupEvent.description && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Description</p>
                      <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap">{popupEvent.description}</p>
                    </div>
                  )}
                  <div>
                     <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Change Status</p>
                     <div className="flex gap-2">
                       <button
                         type="button"
                         disabled={isUpdating !== null}
                         onClick={() => updateStatus(popupEvent, 'pending')}
                         className={`flex-1 flex justify-center items-center py-2 px-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${popupEvent.status === 'pending' ? 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                       >
                         {isUpdating === 'pending' ? <Loader2 size={16} className="animate-spin" /> : 'Pending'}
                       </button>
                       <button
                         type="button"
                         disabled={isUpdating !== null}
                         onClick={() => updateStatus(popupEvent, 'completed')}
                         className={`flex-1 flex justify-center items-center py-2 px-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${popupEvent.status === 'completed' ? 'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                       >
                         {isUpdating === 'completed' ? <Loader2 size={16} className="animate-spin" /> : 'Completed'}
                       </button>
                       <button
                         type="button"
                         disabled={isUpdating !== null}
                         onClick={() => updateStatus(popupEvent, 'cancelled')}
                         className={`flex-1 flex justify-center items-center py-2 px-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${popupEvent.status === 'cancelled' ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                       >
                         {isUpdating === 'cancelled' ? <Loader2 size={16} className="animate-spin" /> : 'Cancelled'}
                       </button>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

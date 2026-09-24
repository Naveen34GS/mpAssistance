import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Bell, User as UserIcon } from 'lucide-react';
import api from '../lib/api';

export default function DashboardLayout() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [eventsRes, bdaysRes] = await Promise.all([
          api.get('/events'),
          api.get('/birthdays')
        ]);
        const items = [];
        if (eventsRes.data) {
          items.push(...eventsRes.data.slice(0, 3).map((e: any) => ({ id: e.id, text: `Task: ${e.title}`, date: e.date, link: '/events' })));
        }
        if (bdaysRes.data) {
          items.push(...bdaysRes.data.slice(0, 2).map((b: any) => ({ id: b.id, text: `Birthday: ${b.person_name}`, date: b.birthday_date, link: '/birthdays' })));
        }
        setNotifications(items);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50/50 dark:bg-gray-900 overflow-hidden">
      {/* Top Header */}
      <header className="flex-shrink-0 flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center justify-center w-10 h-10 hover:opacity-80 transition-opacity" title="Home">
            <img src="/icon-192.png" alt="Home" className="w-8 h-8 rounded-lg shadow-sm" />
          </Link>
          <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-indigo-600 bg-clip-text text-transparent hidden sm:inline">
            Assistant
          </span>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-400 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 rounded-xl transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-6 h-6" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-950"></span>
              )}
            </button>
            
            {showNotifications && (
              <>
                {/* Mobile overlay to close on click outside */}
                <div className="fixed inset-0 sm:hidden z-40" onClick={() => setShowNotifications(false)}></div>
                <div className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-80 sm:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50 transform sm:translate-x-0 translate-x-[calc(50%-1.25rem)] sm:translate-x-0" style={{ right: '0' }}>
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
                    Recent Notifications
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">No new notifications</div>
                    ) : (
                      notifications.map((notif, i) => (
                        <Link key={i} to={notif.link} onClick={() => setShowNotifications(false)} className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700/50 transition-colors">
                          <div className="text-sm text-gray-800 dark:text-gray-200">{notif.text}</div>
                          <div className="text-xs text-gray-500 mt-1">{notif.date}</div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            to="/profile"
            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-400 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 rounded-xl transition-colors"
            title="Profile"
          >
            <UserIcon className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

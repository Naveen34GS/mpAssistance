
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Power, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/useAuth';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50/50 dark:bg-gray-900 overflow-hidden">
      {/* Top Header */}
      <header className="flex-shrink-0 flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-400 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 rounded-xl transition-colors" title="Home">
            <Home className="w-6 h-6" />
          </Link>
          <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">
            MyAssistant
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-700 dark:text-orange-300 font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="ml-3 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            title="Sign Out"
          >
            <Power className="w-6 h-6" />
          </button>
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

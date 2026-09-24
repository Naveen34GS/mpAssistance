import { useState } from 'react';
import { useAuth } from '../store/useAuth';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { BellRing, Loader2, Power } from 'lucide-react';
import { subscribeToPushNotifications } from '../lib/pushNotifications';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const [isTesting, setIsTesting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await subscribeToPushNotifications();
      await api.post('/notifications/test');
      toast.success('Test notification scheduled! You will receive it in 5 seconds.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule notification. Have you allowed permissions?');
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/login');
    }, 2500);
  };

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 text-2xl font-bold">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
                <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <BellRing className="text-orange-500" /> Notification Settings
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Test if push notifications are working properly on your device. Ensure you have granted permission for notifications. The notification should arrive exactly 5 seconds after you click the button.
                </p>
                <button
                  onClick={handleTestNotification}
                  disabled={isTesting}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2.5 px-5 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellRing className="w-5 h-5" />}
                  Test Notification
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 py-3 rounded-xl font-bold transition-colors"
              >
                <Power size={20} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-gray-950 transition-all duration-1000">
          <img 
            src="/icon-512.png" 
            alt="Logo" 
            className="w-32 h-32 rounded-3xl shadow-2xl animate-[grayscale_2.5s_ease-in-out_forwards]"
          />
          <h2 className="mt-8 text-xl font-bold text-gray-500 animate-pulse">Signing you out safely...</h2>
          
          <style>{`
            @keyframes grayscale {
              0% { filter: grayscale(0%); transform: scale(1); opacity: 1; }
              50% { filter: grayscale(50%); transform: scale(1.05); opacity: 0.8; }
              100% { filter: grayscale(100%); transform: scale(0.9); opacity: 0.3; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

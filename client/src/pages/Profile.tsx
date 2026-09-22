import { useState } from 'react';
import { useAuth } from '../store/useAuth';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { BellRing, Loader2 } from 'lucide-react';
import { subscribeToPushNotifications } from '../lib/pushNotifications';

export default function Profile() {
  const { user } = useAuth();
  const [isTesting, setIsTesting] = useState(false);

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      // Ensure we are subscribed before testing
      await subscribeToPushNotifications();
      
      await api.post('/notifications/test');
      toast.success('Test notification scheduled! You will receive it in 5 seconds.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule notification. Have you allowed permissions?');
    } finally {
      setIsTesting(false);
    }
  };

  return (
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
        </div>
      </div>
    </div>
  );
}

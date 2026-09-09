import api from './api';

export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return;
  }

  try {
    // 1. Register the service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered!');

    // 2. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // 3. Get VAPID public key from backend
    const { data: vapidPublicKey } = await api.get('/notifications/vapid-public-key');
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Subscribe to push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // 5. Send subscription to our backend
    await api.post('/notifications/subscribe', subscription);
    console.log('Successfully subscribed to push notifications');
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
  }
};

'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api';
// NEW: Import Firebase messaging
import { getFirebaseApp } from '@/lib/firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

interface PushNotificationSetupProps {
  userId: string;
}

export default function PushNotificationSetup({ userId }: PushNotificationSetupProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hide, setHide] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dontAskNotifications') === 'true';
    }
    return false;
  });

  const getFCMToken = async () => {
    try {
      setLoading(true);
      setError(null);
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        setError('Push notifications are only supported in the browser.');
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('VAPID public key not configured');
      // Dynamically import firebase/messaging only in browser
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
      const app = getFirebaseApp();
      const messaging = getMessaging(app);
      // Register service worker for Firebase messaging
      const registration = await navigator.serviceWorker.register('/sw.js');
      // Get FCM token from Firebase
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) throw new Error('Failed to get FCM token from Firebase');
      setFcmToken(token);
      // Send token to backend
      await apiClient.updateFCMToken(token);
      setSuccess('Push notifications enabled successfully!');
      setIsEnabled(true);
      // Listen for foreground messages (optional)
      onMessage(messaging, (payload) => {
        // Optionally show a toast or in-app notification
        // Example: toast(payload.notification?.title || 'New notification');
      });
    } catch (error) {
      setError('Failed to enable push notifications: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const initializePushNotifications = async () => {
    try {
      if (typeof window === 'undefined') return;
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setPermission(permission);
        if (permission === 'granted') {
          await getFCMToken();
        } else {
          setError('Notification permission is required to enable push notifications');
        }
      } else if (Notification.permission === 'granted') {
        await getFCMToken();
      } else {
        setError('Notification permission denied. Please enable it in your browser settings.');
      }
    } catch (error) {
      setError('Failed to initialize push notifications: ' + (error as Error).message);
    }
  };

  // Only update hide state if dontAskNotifications is set, otherwise follow permission
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dontAsk = localStorage.getItem('dontAskNotifications');
      if (dontAsk === 'true') {
        setHide(true);
      } else if (Notification.permission === 'granted') {
        setHide(true);
      } else {
        setHide(false);
      }
    }
  }, [permission]);

  // Hide if not supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setIsSupported(true);
        setPermission(Notification.permission);
      }
      if ('serviceWorker' in navigator) {
        initializePushNotifications();
      }
    }
  }, []);

  // Hide if permission becomes granted
  // useEffect(() => {
  //   if (permission === 'granted') setHide(true);
  //   else if (permission === 'denied' || permission === 'default') setHide(false);
  // }, [permission]);

  if (hide) return null;

  const togglePushNotifications = async (enabled: boolean) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      if (enabled) {
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          setPermission(permission);
          if (permission !== 'granted') {
            setError('Notification permission required to enable push notifications.');
            return;
          }
        }
        await getFCMToken();
      } else {
        await apiClient.updatePushSettings(false);
        setFcmToken(null);
        setSuccess('Push notifications disabled successfully!');
      }
      setIsEnabled(enabled);
    } catch (error) {
      setError('Failed to update push notification settings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return <Badge variant="destructive">Not Supported</Badge>;
    }
    if (permission === 'denied') {
      return <Badge variant="destructive">Permission Denied</Badge>;
    }
    if (permission === 'granted' && fcmToken) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Mobile Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Push notifications are not supported in this browser.
              </p>
            </div>
            {getStatusBadge()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Mobile Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Push Notifications</p>
            <p className="text-xs text-gray-500">
              Receive instant notifications on your device
            </p>
          </div>
          <Switch
            checked={isEnabled && permission === 'granted' && !!fcmToken}
            onCheckedChange={togglePushNotifications}
            disabled={loading || permission === 'denied'}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="text-xs text-gray-500">
              Current notification status
            </p>
          </div>
          {getStatusBadge()}
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
        {permission === 'denied' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Permission Required:</strong> Please enable notifications in your browser settings to receive push notifications.
            </p>
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            Updating settings...
          </div>
        )}
        <div className="flex justify-end">
          <Button
            variant="link"
            className="text-xs text-gray-500 mt-2"
            onClick={() => {
              localStorage.setItem('dontAskNotifications', 'true');
              setHide(true);
            }}
          >
            Don't ask again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 
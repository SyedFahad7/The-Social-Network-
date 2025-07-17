'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function DebugNotifications() {
  const [logs, setLogs] = useState<string[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [userAgent, setUserAgent] = useState('');
  const [protocol, setProtocol] = useState(window.location.protocol);
  const [hostname, setHostname] = useState(window.location.hostname);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    addLog('=== NOTIFICATION DEBUG START ===');
    addLog(`User Agent: ${navigator.userAgent}`);
    addLog(`Protocol: ${window.location.protocol}`);
    addLog(`Hostname: ${window.location.hostname}`);
    addLog(`Full URL: ${window.location.href}`);
    
    setUserAgent(navigator.userAgent);
    setProtocol(window.location.protocol);
    setHostname(window.location.hostname);

    // Check browser support
    if ('Notification' in window) {
      setIsSupported(true);
      addLog('✅ Notifications API is supported');
      setPermission(Notification.permission);
      addLog(`Current permission: ${Notification.permission}`);
    } else {
      addLog('❌ Notifications API is NOT supported');
    }

    // Check service worker support
    if ('serviceWorker' in navigator) {
      addLog('✅ Service Worker is supported');
    } else {
      addLog('❌ Service Worker is NOT supported');
    }

    // Check if HTTPS or localhost
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      addLog('✅ Protocol is secure (HTTPS or localhost)');
    } else {
      addLog('❌ Protocol is NOT secure - notifications require HTTPS or localhost');
    }

    // Check if its a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    addLog(`Device type: ${isMobile ? 'Mobile' : 'Desktop'}`);

    // Check if it's Chrome
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    addLog(`Browser: ${isChrome ? 'Chrome' : 'Other'}`);

    addLog('===INITIAL CHECK COMPLETE ===');
  }, []);

  const testPermissionRequest = async () => {
    addLog('=== TESTING PERMISSION REQUEST ===');
    
    if (!isSupported) {
      addLog('❌ Cannot test - notifications not supported');
      return;
    }

    addLog(`Permission before request: ${Notification.permission}`);
    
    try {
      addLog('Requesting permission...');
      const result = await Notification.requestPermission();
      addLog(`Permission result: ${result}`);
      setPermission(result);
      
      if (result === 'granted') {
        addLog('✅ Permission granted successfully!');
      } else if (result === 'denied') {
        addLog('❌ Permission denied by user');
      } else {
        addLog('⚠️ Permission request was dismissed');
      }
    } catch (error) {
      addLog(`❌ Error requesting permission: ${error}`);
    }
  };

  const testServiceWorker = async () => {
    addLog('=== TESTING SERVICE WORKER ===');
    
    if (!(('serviceWorker' in navigator))) {
      addLog('❌ Service Worker not supported');
      return;
    }

    try {
      addLog('Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js');
      addLog(`Service worker registered: ${registration.scope}`);
      
      addLog('Waiting for service worker to be ready...');
      await navigator.serviceWorker.ready;
      addLog('✅ Service worker is ready');
      
      const sw = registration.active;
      if (sw) {
        addLog(`Active service worker: ${sw.scriptURL}`);
      } else {
        addLog('⚠️ No active service worker');
      }
    } catch (error) {
      addLog(`❌ Service worker error: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    const logText = logs.join('\n');
    navigator.clipboard.writeText(logText);
    addLog('📋 Logs copied to clipboard');
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Notification Debug Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Browser Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Supported:</span>
              <Badge variant={isSupported ? 'default' : 'destructive'} className="ml-2">
                {isSupported ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Permission:</span>
              <Badge 
                variant={
                  permission === 'granted' ? 'default' : 
                  permission === 'denied' ? 'destructive' : 'secondary'
                } 
                className="ml-2">
                {permission}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Protocol:</span>
              <Badge variant={protocol === 'https:' ? 'default' : 'destructive'} className="ml-2">
                {protocol}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Hostname:</span>
              <span className="ml-2 text-sm">{hostname}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={testPermissionRequest} className="w-full">
              Test Permission Request
            </Button>
            <Button onClick={testServiceWorker} variant="outline" className="w-full">
              Test Service Worker
            </Button>
            <div className="flex gap-2">
              <Button onClick={clearLogs} variant="outline" size="sm" className="flex-1">
                Clear Logs
              </Button>
              <Button onClick={copyLogs} variant="outline" size="sm" className="flex-1">
                Copy Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-md max-h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click the test buttons above to start debugging.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="font-medium text-yellow-800">Troubleshooting Tips:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• If permission is "denied", check your browsers site settings</li>
          <li>• On mobile Chrome, go to Settings → Site Settings → Notifications</li>
          <li>• Make sure the site is not blocked in notification settings</li>
          <li>• Try refreshing the page and testing again</li>
          <li>• Check if your browser requires HTTPS for notifications</li>
        </ul>
      </div>
    </div>
  );
} 
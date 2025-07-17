'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPermissionPage() {
  const [permission, setPermission] = useState<string>('unknown');
  const [loading, setLoading] = useState(false);

  const testPermission = async () => {
    setLoading(true);
    try {
      console.log('Testing notification permission...');
      console.log('Current permission:', Notification.permission);
      
      const result = await Notification.requestPermission();
      console.log('Permission result:', result);
      setPermission(result);
      
      if (result === 'granted') {
        alert('Permission granted!');
      } else {
        alert(`Permission ${result}. Please check browser settings.`);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      alert('Error requesting permission: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Test Notification Permission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p><strong>Current Permission:</strong> {Notification.permission}</p>
            <p><strong>Last Result:</strong> {permission}</p>
          </div>
          
          <Button 
            onClick={testPermission} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Requesting...' : 'Request Notification Permission'}
          </Button>
          
          <div className="text-sm text-gray-600">           <p>This will show a browser prompt asking for notification permission.</p>
            <p>If you don't see a prompt, check your browser settings.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
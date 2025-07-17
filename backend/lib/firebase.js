// backend/lib/firebase.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseApp;

if (!admin.apps.length) {
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  firebaseApp = admin.app();
}

// Helper to ensure all data values are strings
function stringifyDataFields(data) {
  const result = {};
  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const value = data[key];
    if (value === undefined) continue; // Skip undefined values
    if (typeof value === 'string') result[key] = value;
    else result[key] = JSON.stringify(value);
  }
  return result;
}

// Send push notification to a single user
async function sendPushNotification(fcmToken, notification) {
  if (!fcmToken) {
    throw new Error('FCM token is required');
  }

  const rawData = {
    title: notification.title,
    body: notification.message,
    type: notification.type || 'general',
    notificationId: notification.notificationId || '',
    ...notification.data
  };
  const message = {
    token: fcmToken,
    data: stringifyDataFields(rawData),
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'academic_portal'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await firebaseApp.messaging().send(message);
    console.log('Push notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

// Send push notification to multiple users
async function sendPushNotificationToMultiple(fcmTokens, notification) {
  if (!fcmTokens || fcmTokens.length === 0) {
    throw new Error('FCM tokens are required');
  }

  const rawData = {
    title: notification.title,
    body: notification.message,
    type: notification.type || 'general',
    notificationId: notification.notificationId || '',
    ...notification.data
  };
  const message = {
    data: stringifyDataFields(rawData),
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'academic_portal'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await firebaseApp.messaging().sendMulticast({
      tokens: fcmTokens,
      ...message
    });
    console.log('Multicast push notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    return response;
  } catch (error) {
    // If /batch 404 error, fallback to single sends
    if (
      error &&
      error.errorInfo &&
      error.errorInfo.message &&
      error.errorInfo.message.includes('/batch')
    ) {
      console.warn('sendMulticast failed with /batch 404. Falling back to single sends.');
      let successCount = 0;
      let failureCount = 0;
      let responses = [];
      for (const token of fcmTokens) {
        try {
          const res = await sendPushNotification(token, notification);
          responses.push({ token, success: true, res });
          successCount++;
        } catch (err) {
          responses.push({ token, success: false, error: err });
          failureCount++;
        }
      }
      console.log('Fallback single sends complete:', { successCount, failureCount });
      return { successCount, failureCount, responses };
    } else {
      console.error('Error sending multicast push notification:', error);
      throw error;
    }
  }
}

// Send push notification to topic
async function sendPushNotificationToTopic(topic, notification) {
  const message = {
    topic: topic,
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: {
      type: notification.type || 'general',
      notificationId: notification.notificationId || '',
      ...notification.data
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'academic_portal'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await firebaseApp.messaging().send(message);
    console.log('Topic push notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending topic push notification:', error);
    throw error;
  }
}

module.exports = {
  sendPushNotification,
  sendPushNotificationToMultiple,
  sendPushNotificationToTopic
}; 
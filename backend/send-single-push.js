require('dotenv').config();
const { sendPushNotification } = require('./lib/firebase');

// Replace with your actual FCM token
const fcmToken = 'fpC8p10l1rGtcKrqsBVsiu:APA91bF-R5darfOJKwS5z_uaxsBsJlrHCNJYiE1jKZ9175yvRYH1j6uzr-UKWkXvXS7paFbbb8BszEHnDqFka1vwOULK9-Qry3Nppn4ChNTxhPZweeTk6LQ';

const notification = {
  title: 'Test Notification',
  body: 'This is a test push to a single device!',
  type: 'test',
  notificationId: 'test123',
  data: {} // any extra data as string values
};

sendPushNotification(fcmToken, notification)
  .then(response => {
    console.log('Push sent successfully:', response);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error sending push:', error);
    process.exit(1);
  });

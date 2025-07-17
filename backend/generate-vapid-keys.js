const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys Generated:');
console.log('=====================');
console.log('Public Key (NEXT_PUBLIC_VAPID_PUBLIC_KEY):');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key (VAPID_PRIVATE_KEY):');
console.log(vapidKeys.privateKey);
console.log('\nAdd these to your .env.local file:');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey); 
// Simple VAPID key generation (for testing purposes)
// In production, you should use the web-push package

const crypto = require('crypto');

// Generate a simple VAPID key pair for testing
function generateVAPIDKeys() {
  const privateKey = crypto.randomBytes(32);
  const publicKey = crypto.randomBytes(65);
  
  return {
    publicKey: publicKey.toString('base64url'),
    privateKey: privateKey.toString('base64url')
  };
}

const keys = generateVAPIDKeys();

console.log('Test VAPID Keys Generated:');
console.log('==========================');
console.log('Public Key (NEXT_PUBLIC_VAPID_PUBLIC_KEY):');
console.log(keys.publicKey);
console.log('\nPrivate Key (VAPID_PRIVATE_KEY):');
console.log(keys.privateKey);
console.log('\nAdd these to your .env.local file:');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\nNote: These are test keys. For production, use web-push package.'); 
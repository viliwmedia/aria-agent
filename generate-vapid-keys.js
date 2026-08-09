// Run this once, after `npm install`, to generate the two keys push
// notifications need. Copy the output into your .env (or Railway's
// Variables tab) as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
//
//   node generate-vapid-keys.js
//
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('\nAdd these to your environment variables:\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\nKeep the private key secret \u2014 treat it like a password.\n');

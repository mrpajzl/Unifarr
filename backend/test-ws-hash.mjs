import crypto from 'crypto';

const password = 'Cx3250ftrm?';
const salt = 'idplx8ei';

console.log('Trying to match hash: dad7e0beadb0185aa51ca6dd12fab20708e3993b\n');

// Common patterns for webshare-like systems
const combinations = [
  // Basic combinations
  ['SHA1(password + salt)', crypto.createHash('sha1').update(password + salt).digest('hex')],
  ['SHA1(salt + password)', crypto.createHash('sha1').update(salt + password).digest('hex')],
  
  // Double hash
  ['SHA1(SHA1(password) + salt)', crypto.createHash('sha1').update(crypto.createHash('sha1').update(password).digest('hex') + salt).digest('hex')],
  ['SHA1(salt + SHA1(password))', crypto.createHash('sha1').update(salt + crypto.createHash('sha1').update(password).digest('hex')).digest('hex')],
  
  // Digest first
  ['SHA1(MD5(password) + salt)', crypto.createHash('sha1').update(crypto.createHash('md5').update(password).digest('hex') + salt).digest('hex')],
  
  // Binary operations
  ['SHA1(password) then hash with salt', (() => {
    const h1 = crypto.createHash('sha1').update(password).digest();
    return crypto.createHash('sha1').update(Buffer.concat([h1, Buffer.from(salt)])).digest('hex');
  })()],
  
  // Hex operations
  ['SHA1(hex(password) + salt)', crypto.createHash('sha1').update(Buffer.from(password).toString('hex') + salt).digest('hex')],
  
  // Czech/European style (sometimes use different encoding)
  ['SHA1(latin1(password + salt))', crypto.createHash('sha1').update(password + salt, 'latin1').digest('hex')],
];

console.log('Testing combinations:\n');
combinations.forEach(([name, hash]) => {
  const match = hash === 'dad7e0beadb0185aa51ca6dd12fab20708e3993b' ? ' ✅ MATCH!' : '';
  console.log(`${name}:`);
  console.log(`  ${hash}${match}`);
});

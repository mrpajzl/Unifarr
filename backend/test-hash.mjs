import crypto from 'crypto';

const password = 'Cx3250ftrm?';
const salt = 'idplx8ei';

// Try different hash combinations
console.log('Testing different hash combinations:\n');

// 1. SHA1(password)
const hash1 = crypto.createHash('sha1').update(password).digest('hex');
console.log('SHA1(password):', hash1);

// 2. SHA1(salt + password)
const hash2 = crypto.createHash('sha1').update(salt + password).digest('hex');
console.log('SHA1(salt + password):', hash2);

// 3. SHA1(password + salt)
const hash3 = crypto.createHash('sha1').update(password + salt).digest('hex');
console.log('SHA1(password + salt):', hash3);

// 4. MD5
const hash4 = crypto.createHash('md5').update(salt + password).digest('hex');
console.log('MD5(salt + password):', hash4);

console.log('\nExpected from HAR:', 'dad7e0beadb0185aa51ca6dd12fab20708e3993b');

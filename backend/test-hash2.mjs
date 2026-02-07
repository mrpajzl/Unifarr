import crypto from 'crypto';

const password = 'Cx3250ftrm?';
const salt = 'idplx8ei';
const username = 'pajzl';

console.log('Testing more combinations:\n');

// Maybe it's SHA1(SHA1(password) + salt)
const innerHash = crypto.createHash('sha1').update(password).digest('hex');
const hash5 = crypto.createHash('sha1').update(innerHash + salt).digest('hex');
console.log('SHA1(SHA1(password) + salt):', hash5);

// Maybe it's SHA1(username:password)
const hash6 = crypto.createHash('sha1').update(username + ':' + password).digest('hex');
console.log('SHA1(username:password):', hash6);

// Maybe MD5(password) + salt then SHA1
const md5Pass = crypto.createHash('md5').update(password).digest('hex');
const hash7 = crypto.createHash('sha1').update(md5Pass + salt).digest('hex');
console.log('SHA1(MD5(password) + salt):', hash7);

// Maybe it's digest token
const hash8 = crypto.createHash('md5').update(password + ':' + salt).digest('hex');
console.log('MD5(password:salt):', hash8);

// Try SHA256
const hash9 = crypto.createHash('sha256').update(salt + password).digest('hex');
console.log('SHA256(salt + password):', hash9.substring(0, 40));

console.log('\nExpected:', 'dad7e0beadb0185aa51ca6dd12fab20708e3993b');

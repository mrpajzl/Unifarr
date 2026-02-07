import { readFileSync } from 'fs';

const settings = JSON.parse(readFileSync('./settings.json', 'utf-8'));

async function testWebshare() {
  const username = settings.webshare.username;
  const password = settings.webshare.password;
  
  console.log('Testing different credential combinations...\n');
  
  // Test 1: As-is
  console.log('Test 1: username_or_email parameter');
  let response = await fetch('https://webshare.cz/api/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username_or_email: username,
      password: password,
      keep_logged_in: '1',
    }),
  });
  console.log('Response:', (await response.text()).substring(0, 200));
  
  // Test 2: Just 'username' instead of 'username_or_email'
  console.log('\nTest 2: username parameter');
  response = await fetch('https://webshare.cz/api/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: username,
      password: password,
      keep_logged_in: '1',
    }),
  });
  console.log('Response:', (await response.text()).substring(0, 200));
  
  // Test 3: Manual URL encoding
  console.log('\nTest 3: Manual body construction');
  const body = `username_or_email=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&keep_logged_in=1`;
  response = await fetch('https://webshare.cz/api/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body,
  });
  console.log('Response:', (await response.text()).substring(0, 200));
}

testWebshare();

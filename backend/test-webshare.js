const settings = require('./settings.json');

async function testWebshare() {
  const credentials = {
    username: settings.webshare.username,
    password: settings.webshare.password
  };
  
  console.log('Testing Webshare login...');
  console.log('Username:', credentials.username);
  
  try {
    const response = await fetch('https://webshare.cz/api/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username_or_email: credentials.username,
        password: credentials.password,
        keep_logged_in: '1',
      }),
    });
    
    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', text.substring(0, 500));
    
    const tokenMatch = text.match(/<token>([^<]+)<\/token>/);
    if (tokenMatch) {
      console.log('✅ Token found:', tokenMatch[1]);
    } else {
      console.log('❌ No token in response');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testWebshare();

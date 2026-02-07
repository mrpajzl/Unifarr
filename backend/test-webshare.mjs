import { readFileSync } from 'fs';

const settings = JSON.parse(readFileSync('./settings.json', 'utf-8'));

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
      
      // Now try search
      console.log('\nTesting search with token...');
      const searchResponse = await fetch('https://webshare.cz/api/search/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams({
          what: 'Avatar (2009)',
          category: 'video',
          wst: tokenMatch[1],
          limit: '25',
          offset: '0',
          sort: 'largest',
        }),
      });
      
      const searchText = await searchResponse.text();
      console.log('Search response status:', searchResponse.status);
      console.log('Search response:', searchText.substring(0, 1000));
      
      // Count files
      const fileMatches = searchText.matchAll(/<file>/g);
      console.log('Files found:', Array.from(fileMatches).length);
    } else {
      console.log('❌ No token in response');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testWebshare();

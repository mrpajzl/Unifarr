async function testSearch() {
  console.log('Testing Webshare search WITHOUT authentication...\n');
  
  try {
    const response = await fetch('https://webshare.cz/api/search/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        what: 'Avatar (2009)',
        category: 'video',
        limit: '25',
        offset: '0',
        sort: 'largest',
      }),
    });
    
    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response length:', text.length);
    console.log('Response preview:', text.substring(0, 500));
    
    // Count files
    const fileMatches = text.matchAll(/<file>/g);
    const count = Array.from(fileMatches).length;
    console.log('\nFiles found:', count);
    
    if (count > 0) {
      // Extract first file name
      const nameMatch = text.match(/<name>([^<]+)<\/name>/);
      if (nameMatch) {
        console.log('First file:', nameMatch[1]);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();

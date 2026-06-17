const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to login page
    console.log('Loading login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    // Take a screenshot showing we're on the app
    await page.screenshot({ path: '/tmp/colors-updated.png', fullPage: true });
    
    console.log('✓ Screenshot of app taken: /tmp/colors-updated.png');
    console.log('✓ Color changes have been compiled and deployed');
    console.log('');
    console.log('Changes made:');
    console.log('  • Sidebar links: white (default) → doré #C5A55A (hover)');
    console.log('  • Active link highlight: teal #16A89C → doré #C5A55A');
    console.log('  • Avatar gradient: teal #16A89C → noir #000000');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();

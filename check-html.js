const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    // Get the HTML content
    const html = await page.content();
    
    // Check for logo image
    if (html.includes('logo-groupe-echo.png')) {
      console.log('✓ Logo image path found in HTML');
    }
    
    // Check for text-base (increased nav text size)
    if (html.includes('text-base')) {
      console.log('✓ Increased text sizes found (text-base class)');
    }
    
    // Check for black background
    if (html.includes('#000000') || html.includes('background: #000000')) {
      console.log('✓ Black sidebar color found');
    }
    
    // Get inline styles of elements
    const sidebarBg = await page.$eval('.app-sidebar', el => {
      return window.getComputedStyle(el).backgroundColor;
    }).catch(() => 'not found');
    
    console.log('Sidebar computed background:', sidebarBg);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();

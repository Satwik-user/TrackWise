// Quick test to check for frontend errors
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Capture console messages
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Capture uncaught exceptions
  page.on('pageerror', (error) => {
    errors.push(`Page error: ${error.message}`);
  });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Wait a bit for any async operations
    await page.waitForTimeout(3000);
    
    // Try clicking on different navigation items
    const navItems = ['Schedules', 'Trains', 'Stations', 'Optimization', 'Analytics'];
    
    for (const item of navItems) {
      try {
        await page.click(`text=${item}`);
        await page.waitForTimeout(1000);
      } catch (e) {
        console.log(`Could not click ${item}`);
      }
    }
    
    console.log('Errors found:', errors.length);
    if (errors.length > 0) {
      console.log('Error details:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('No errors found! 🎉');
    }
    
  } catch (error) {
    console.log('Failed to load page:', error.message);
  }
  
  await browser.close();
})();
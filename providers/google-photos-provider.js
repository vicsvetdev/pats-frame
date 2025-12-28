const puppeteer = require('puppeteer-core');
const BaseProvider = require('./base-provider');

/**
 * Google Photos provider.
 * Scrapes public Google Photos albums using Puppeteer.
 */
class GooglePhotosProvider extends BaseProvider {
  constructor(albumUrl) {
    super();
    this.albumUrl = albumUrl;
    this.cachedUrls = [];
    this.chromiumPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';
  }

  async initialize() {
    console.log(`GooglePhotosProvider initializing with album: ${this.albumUrl}`);
    await this.refreshCache();
  }

  async getRandomImageBuffer() {
    if (this.cachedUrls.length === 0) {
      throw new Error('No images cached. Call refreshCache() first.');
    }

    const randomIndex = Math.floor(Math.random() * this.cachedUrls.length);
    const imageUrl = this.cachedUrls[randomIndex];

    console.log(`Fetching random image (${randomIndex + 1}/${this.cachedUrls.length}): ${imageUrl.substring(0, 80)}...`);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async refreshCache() {
    console.log('Starting Google Photos album scrape...');
    const startTime = Date.now();

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: this.chromiumPath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer'
        ]
      });

      const page = await browser.newPage();

      // Set a reasonable viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to the album
      console.log(`Navigating to album: ${this.albumUrl}`);
      await page.goto(this.albumUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait for images to start loading
      await page.waitForSelector('img', { timeout: 30000 });

      // Scroll through the page to load all images (infinite scroll)
      const imageUrls = await this._scrollAndCollectImages(page);

      this.cachedUrls = imageUrls;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Scrape complete. Found ${imageUrls.length} images in ${elapsed}s`);

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async _scrollAndCollectImages(page) {
    const collectedUrls = new Set();
    let noNewContentCount = 0;
    const maxNoNewContentAttempts = 15;
    let lastLoggedCount = 0;
    let previousScrollTop = -1;

    // Intercept network requests to capture image URLs as they load
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      // Capture Google Photos image URLs from network requests
      if (url.includes('googleusercontent.com/pw/')) {
        collectedUrls.add(url);
      }
      request.continue();
    });

    // Wait for the photo grid to initially load
    console.log('Waiting for photo grid to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Find the scrollable container (Google Photos uses a custom scroller)
    const scrollContainerSelector = await page.evaluate(() => {
      // Find the element with the largest scrollHeight that's scrollable
      let maxScrollHeight = 0;
      let selector = null;
      
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollHeight > el.clientHeight + 500 && el.scrollHeight > maxScrollHeight) {
          maxScrollHeight = el.scrollHeight;
          // Try to build a selector
          if (el.className) {
            selector = '.' + el.className.split(' ')[0];
          }
        }
      });
      
      return selector;
    });

    console.log(`Using scroll container: ${scrollContainerSelector || 'window'}`);

    // Collect initial images
    await this._collectFromDOM(page, collectedUrls);
    console.log(`Initial load: ${collectedUrls.size} images`);

    while (noNewContentCount < maxNoNewContentAttempts) {
      const previousSize = collectedUrls.size;

      // Scroll the container
      const scrollInfo = await page.evaluate((selector) => {
        let container;
        if (selector) {
          container = document.querySelector(selector);
        }
        
        if (container && container.scrollHeight > container.clientHeight) {
          container.scrollTop += 2000;
          return { 
            scrollTop: container.scrollTop, 
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight
          };
        } else {
          window.scrollBy(0, 2000);
          return { 
            scrollTop: window.scrollY, 
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: window.innerHeight
          };
        }
      }, scrollContainerSelector);

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 800));

      // Collect any new images from DOM
      await this._collectFromDOM(page, collectedUrls);

      // Check if we're still scrolling and finding new content
      const isAtBottom = scrollInfo.scrollTop + scrollInfo.clientHeight >= scrollInfo.scrollHeight - 100;
      const noNewImages = collectedUrls.size === previousSize;
      const notScrolling = scrollInfo.scrollTop === previousScrollTop;

      if ((isAtBottom && noNewImages) || (notScrolling && noNewImages)) {
        noNewContentCount++;
      } else {
        noNewContentCount = 0;
      }
      
      previousScrollTop = scrollInfo.scrollTop;

      // Log progress
      if (collectedUrls.size - lastLoggedCount >= 100) {
        console.log(`Found ${collectedUrls.size} unique images so far... (scroll: ${scrollInfo.scrollTop}/${scrollInfo.scrollHeight})`);
        lastLoggedCount = collectedUrls.size;
      }
    }

    // Convert all URLs to high resolution
    const highResUrls = Array.from(collectedUrls).map(url => {
      let highRes = url.replace(/=w\d+-h\d+[^=]*$/, '=w2048-h2048');
      highRes = highRes.replace(/=s\d+[^=]*$/, '=s2048');
      if (!highRes.includes('=w') && !highRes.includes('=s')) {
        highRes = highRes + '=w2048-h2048';
      }
      return highRes;
    });

    console.log(`Scraping finished. Total: ${highResUrls.length} images`);
    return highResUrls;
  }

  async _collectFromDOM(page, collectedUrls) {
    const urls = await page.evaluate(() => {
      const urls = [];
      
      // Method 1: data-latest-bg attribute
      document.querySelectorAll('[data-latest-bg]').forEach(el => {
        const url = el.getAttribute('data-latest-bg');
        if (url && url.includes('googleusercontent.com')) {
          urls.push(url);
        }
      });

      // Method 2: background-image style
      document.querySelectorAll('div').forEach(div => {
        const bg = window.getComputedStyle(div).backgroundImage;
        if (bg && bg.includes('googleusercontent.com/pw/')) {
          const match = bg.match(/url\("([^"]+)"\)/);
          if (match && match[1]) {
            urls.push(match[1]);
          }
        }
      });
      
      return urls;
    });

    urls.forEach(url => collectedUrls.add(url));
  }

  getCacheSize() {
    return this.cachedUrls.length;
  }

  getName() {
    return 'google-photos';
  }
}

module.exports = GooglePhotosProvider;

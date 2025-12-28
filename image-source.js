const fs = require('fs');
const path = require('path');
const LocalProvider = require('./providers/local-provider');
const GooglePhotosProvider = require('./providers/google-photos-provider');

/**
 * Load configuration from config.json
 */
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (err) {
    console.log('No config.json found, using defaults');
    return {};
  }
}

/**
 * Image source manager.
 * Handles provider auto-detection, initialization, and cache refresh scheduling.
 */
class ImageSource {
  constructor() {
    this.provider = null;
    this.refreshIntervalId = null;
    this.lastRefresh = null;
    this.config = loadConfig();
  }

  /**
   * Initialize the image source.
   * Auto-detects provider from config and initializes it.
   * Blocks until the provider is ready (cache populated).
   * @returns {Promise<void>}
   */
  async initialize() {
    const albumUrl = this.config.albumUrl;
    const refreshHours = this.config.cacheRefreshHours || 24;

    if (albumUrl) {
      const providerType = this._detectProvider(albumUrl);
      console.log(`Detected provider: ${providerType} for URL: ${albumUrl}`);

      switch (providerType) {
        case 'google-photos':
          this.provider = new GooglePhotosProvider(albumUrl);
          break;
        case 'icloud':
          throw new Error('iCloud provider not yet implemented');
        default:
          throw new Error(`Unknown provider type: ${providerType}`);
      }
    } else {
      console.log('No albumUrl configured, using local provider');
      this.provider = new LocalProvider();
    }

    // Initialize provider (blocks until ready)
    await this.provider.initialize();
    this.lastRefresh = new Date();

    // Schedule periodic refresh (only for remote providers)
    if (albumUrl && refreshHours > 0) {
      const refreshMs = refreshHours * 60 * 60 * 1000;
      console.log(`Scheduling cache refresh every ${refreshHours} hours`);
      
      this.refreshIntervalId = setInterval(async () => {
        try {
          console.log('Starting scheduled cache refresh...');
          await this.provider.refreshCache();
          this.lastRefresh = new Date();
          console.log('Scheduled cache refresh complete');
        } catch (err) {
          console.error('Scheduled cache refresh failed:', err.message);
        }
      }, refreshMs);
    }
  }

  /**
   * Get a random image buffer from the current provider.
   * @returns {Promise<Buffer>}
   */
  async getRandomImage() {
    if (!this.provider) {
      throw new Error('ImageSource not initialized. Call initialize() first.');
    }
    return this.provider.getRandomImageBuffer();
  }

  /**
   * Get status information about the image source.
   * @returns {object}
   */
  getStatus() {
    return {
      provider: this.provider ? this.provider.getName() : null,
      cachedImages: this.provider ? this.provider.getCacheSize() : 0,
      lastRefresh: this.lastRefresh ? this.lastRefresh.toISOString() : null
    };
  }

  /**
   * Force a cache refresh.
   * @returns {Promise<void>}
   */
  async forceRefresh() {
    if (!this.provider) {
      throw new Error('ImageSource not initialized. Call initialize() first.');
    }
    await this.provider.refreshCache();
    this.lastRefresh = new Date();
  }

  /**
   * Detect provider type from URL pattern.
   * @param {string} url
   * @returns {string}
   */
  _detectProvider(url) {
    if (!url) {
      return 'local';
    }

    const lowerUrl = url.toLowerCase();

    // Google Photos patterns
    if (lowerUrl.includes('photos.app.goo.gl') || 
        lowerUrl.includes('photos.google.com/share')) {
      return 'google-photos';
    }

    // iCloud patterns (future)
    if (lowerUrl.includes('icloud.com/sharedalbum')) {
      return 'icloud';
    }

    throw new Error(`Unable to detect provider from URL: ${url}`);
  }

  /**
   * Clean up resources (stop refresh interval).
   */
  shutdown() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }
}

module.exports = new ImageSource();

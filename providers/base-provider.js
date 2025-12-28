/**
 * Base class for image providers.
 * Defines the interface that all providers must implement.
 */
class BaseProvider {
  constructor() {
    if (this.constructor === BaseProvider) {
      throw new Error('BaseProvider is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Initialize the provider (e.g., scrape album, load cache).
   * Called once on startup.
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Get a random image as a Buffer.
   * @returns {Promise<Buffer>}
   */
  async getRandomImageBuffer() {
    throw new Error('getRandomImageBuffer() must be implemented by subclass');
  }

  /**
   * Refresh the cache (e.g., re-scrape album).
   * @returns {Promise<void>}
   */
  async refreshCache() {
    throw new Error('refreshCache() must be implemented by subclass');
  }

  /**
   * Get the number of cached images.
   * @returns {number}
   */
  getCacheSize() {
    throw new Error('getCacheSize() must be implemented by subclass');
  }

  /**
   * Get the provider name for logging/debugging.
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }
}

module.exports = BaseProvider;

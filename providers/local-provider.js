const fs = require('fs');
const path = require('path');
const BaseProvider = require('./base-provider');

/**
 * Local file provider.
 * Serves a static image from the local filesystem.
 * Used as fallback when no ALBUM_URL is configured.
 */
class LocalProvider extends BaseProvider {
  constructor(imagePath) {
    super();
    this.imagePath = imagePath || path.join(__dirname, '..', 'Pats10.jpg');
  }

  async initialize() {
    if (!fs.existsSync(this.imagePath)) {
      throw new Error(`Local image not found: ${this.imagePath}`);
    }
    console.log(`LocalProvider initialized with image: ${this.imagePath}`);
  }

  async getRandomImageBuffer() {
    return fs.promises.readFile(this.imagePath);
  }

  async refreshCache() {
    // No-op for local provider
  }

  getCacheSize() {
    return 1;
  }

  getName() {
    return 'local';
  }
}

module.exports = LocalProvider;

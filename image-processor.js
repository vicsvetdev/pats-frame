const resizer = require("./resizer");
const ditherer = require("./ditherer");

class ImageProcessor {
  constructor() {
    // Configuration settings (Enhanced Mode)
    this.options = {
      exposure: 1.0,
      saturation: 1.5,
      // S-Curve Parameters
      strength: 0.9,
      shadowBoost: 0.0,
      highlightCompress: 1.5,
      midpoint: 0.5
    };
  }

  /**
   * Main entry point to process an image from a Buffer
   * @param {Buffer} buffer
   * @returns {Promise<Buffer>}
   */
  async processBuffer(buffer) {
    console.log(`Processing image from buffer (${buffer.length} bytes)`);
    
    // 1. Load Image from buffer
    let image = await resizer.loadImage(buffer);

    // 2. Resize and Crop
    image = resizer.resizeAndCenterCrop(image);

    // 3. Process Pixels (Dither & Tone Map)
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    ditherer.process(image.bitmap.data, width, height, this.options);
    
    // 4. Encode to BMP
    return resizer.encodeToBMP(image);
  }

  /**
   * Legacy method to process an image from disk to BMP buffer
   * @param {string} sourcePath
   * @returns {Promise<Buffer>}
   */
  async process(sourcePath) {
    console.log(`Processing image from: ${sourcePath}`);
    
    // 1. Load Image
    let image = await resizer.loadImage(sourcePath);

    // 2. Resize and Crop
    image = resizer.resizeAndCenterCrop(image);

    // 3. Process Pixels (Dither & Tone Map)
    // We modify the buffer directly in place
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // Process the data buffer
    ditherer.process(image.bitmap.data, width, height, this.options);
    
    // 4. Encode to BMP
    return resizer.encodeToBMP(image);
  }
}

module.exports = new ImageProcessor();

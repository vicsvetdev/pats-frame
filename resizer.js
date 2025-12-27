const { Jimp } = require("jimp");

class Resizer {
  /**
   * Loads image using Jimp
   * @param {string} path
   * @returns {Promise<Jimp>}
   */
  async loadImage(path) {
    return await Jimp.read(path);
  }

  /**
   * Resizes and crops the image to fill the target dimensions
   * Automatically determines 800x480 or 480x800 based on orientation
   * @param {Jimp} image
   * @returns {Jimp}
   */
  resizeAndCenterCrop(image) {
    // Determine target dimensions based on orientation
    const isPortrait = image.bitmap.height > image.bitmap.width;
    const width = isPortrait ? 480 : 800;
    const height = isPortrait ? 800 : 480;

    // cover() resizes the image to fill the given width and height while maintaining aspect ratio.
    // The excess parts are cropped (center-weighted by default in Jimp)
    return image.cover({ w: width, h: height });
  }

  /**
   * Encodes the Jimp image to BMP buffer
   * @param {Jimp} image
   * @returns {Promise<Buffer>}
   */
  async encodeToBMP(image) {
    return image.getBuffer("image/bmp");
  }

  /**
   * Creates a new Jimp image from raw pixel data
   * @param {Buffer|Uint8Array} data 
   * @param {number} width 
   * @param {number} height 
   * @returns {Jimp}
   */
  createFromData(data, width, height) {
    return new Jimp({
      data: Buffer.from(data),
      width: width,
      height: height
    });
  }
}

module.exports = new Resizer();

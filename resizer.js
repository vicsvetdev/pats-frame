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
   * Resizes and crops the image to fill the target dimensions (800x480)
   * Portrait images are rotated 90° counter-clockwise to fill the landscape display
   * @param {Jimp} image
   * @returns {Jimp}
   */
  resizeAndCenterCrop(image) {
    const isPortrait = image.bitmap.height > image.bitmap.width;
    
    // Rotate portrait images 90° counter-clockwise to fit landscape display
    if (isPortrait) {
      image.rotate(90);
    }

    // Always output 800x480 for the e-ink display
    // cover() resizes the image to fill the given width and height while maintaining aspect ratio.
    // The excess parts are cropped (center-weighted by default in Jimp)
    return image.cover({ w: 800, h: 480 });
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

const { Jimp } = require("jimp");
const { createCanvas, Image } = require("canvas");
const { ditherImage, getDefaultPalettes, getDeviceColors, replaceColors } = require("epdoptimize");

class ImageProcessor {
  constructor() {
    // Load palette and device colors for Spectra 6 display
    // Using standard library calls as verified by debug-epd.js
    this.palette = getDefaultPalettes("spectra6");
    this.deviceColors = getDeviceColors("spectra6");
  }

  /**
   * Main entry point to process an image from disk to BMP buffer
   * @param {string} sourcePath
   * @returns {Promise<Buffer>}
   */
  async process(sourcePath) {
    console.log(`Processing image from: ${sourcePath}`);
    
    // 1. Load Image
    let jimpImage = await this.loadImage(sourcePath);

    // 2. Determine target dimensions based on orientation
    const { width, height } = this.normalizeDimensions(jimpImage);

    // 3. Resize and Crop
    jimpImage = this.resizeAndCenterCrop(jimpImage, width, height);

    // 4. Dither (Jimp -> Canvas -> Dither -> Jimp)
    jimpImage = await this.applyDithering(jimpImage);
    
    // 5. Encode to BMP
    return this.encodeToBMP(jimpImage);
  }

  /**
   * Loads image using Jimp
   * @param {string} path
   */
  async loadImage(path) {
    return await Jimp.read(path);
  }

  /**
   * Determines if target should be 800x480 or 480x800
   * @param {Jimp} image
   */
  normalizeDimensions(image) {
    const isPortrait = image.bitmap.height > image.bitmap.width;
    return {
      width: isPortrait ? 480 : 800,
      height: isPortrait ? 800 : 480,
    };
  }

  /**
   * Resizes and crops the image to fill the target dimensions
   * @param {Jimp} image
   * @param {number} width
   * @param {number} height
   */
  resizeAndCenterCrop(image, width, height) {
    // cover() resizes the image to fill the given width and height while maintaining aspect ratio.
    // The excess parts are cropped (center-weighted by default in Jimp)
    return image.cover({ w: width, h: height });
  }

  /**
   * Applies dithering using epdoptimize via node-canvas
   * @param {Jimp} image
   */
  async applyDithering(image) {
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Convert Jimp image to a format Canvas can read (Buffer of RGBA)
    // Jimp's bitmap.data is a Buffer
    
    // Create Input Canvas
    const inputCanvas = createCanvas(width, height);
    const inputCtx = inputCanvas.getContext("2d");
    
    // Create ImageData for Canvas
    // node-canvas ImageData constructor expects a Uint8ClampedArray
    const imageData = inputCtx.createImageData(width, height);
    imageData.data.set(new Uint8ClampedArray(image.bitmap.data));
    inputCtx.putImageData(imageData, 0, 0);

    // Create Output Canvas
    const outputCanvas = createCanvas(width, height);
    
    // Apply Dithering
    // ditherImage(sourceCanvas, targetCanvas, options)
    // IMPORTANT: The library writes to targetCanvas.getContext('2d'), but we need to ensure the buffer is flushed/ready
    await ditherImage(inputCanvas, outputCanvas, {
      ditheringType: "errorDiffusion", 
      errorDiffusionMatrix: "floydSteinberg",
      palette: this.palette,
    });
    
    // Create Final Canvas for color mapped result
    const finalCanvas = createCanvas(width, height);

    // Apply Color Replacement
    // replaceColors(sourceCanvas, targetCanvas, options)
    // We use outputCanvas as source here because it now holds the dithered image
    replaceColors(outputCanvas, finalCanvas, {
        originalColors: this.palette,
        replaceColors: this.deviceColors
    });

    // Extract data back from Final Canvas
    const finalCtx = finalCanvas.getContext("2d");
    const finalImageData = finalCtx.getImageData(0, 0, width, height);

    // Create new Jimp image from mapped data
    // We create a new image instead of modifying the existing one to ensure clean buffer
    const newImage = new Jimp({
        data: Buffer.from(finalImageData.data),
        width: width,
        height: height
    });
    
    return newImage;
  }

  /**
   * Encodes the Jimp image to BMP buffer
   * @param {Jimp} image
   */
  async encodeToBMP(image) {
    return image.getBuffer("image/bmp");
  }
}

module.exports = new ImageProcessor();

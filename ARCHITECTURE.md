# Service Architecture

## Overview
This service is a Node.js-based microservice designed to transform standard JPEG images into optimized BMP bitmaps suitable for Spectra 6 E-ink displays. It runs on a lightweight Alpine Linux environment and processes images on-demand.

## Core Modules

### 1. `server.js` (Interface Layer)
-   **Role**: Entry point and HTTP Server.
-   **Framework**: `fastify`.
-   **Responsibilities**:
    -   Exposes the `GET /image` endpoint.
    -   Validates the existence of the source image.
    -   Invokes the `ImageProcessor`.
    -   Streams the processed BMP buffer to the client with `Content-Type: image/bmp`.
    -   Handles errors and logging.

### 2. `image-processor.js` (Domain Logic)
-   **Role**: Encapsulates all image manipulation logic.
-   **Dependencies**:
    -   `jimp`: Used for image loading, resizing (cropping), and final BMP encoding.
    -   `canvas` (node-canvas): Provides a virtual DOM canvas for the dithering library.
    -   `epdoptimize`: Performs dithering and color mapping specific to E-ink technology.
-   **Pipeline Methods**:
    -   `loadImage(path)`: Reads source from disk.
    -   `normalizeDimensions(image)`: Determines target resolution (800x480 or 480x800) based on source orientation.
    -   `resizeAndCenterCrop(image, width, height)`: Scales and crops the image to fill the display area without distortion.
    -   `applyDithering(image)`:
        1.  Converts image data to Canvas format.
        2.  Applies **Floyd-Steinberg error diffusion** using the Spectra 6 palette.
        3.  Maps the dithered visual colors to the specific hardware signal values required by the display.
    -   `encodeToBMP(image)`: Exports the final pixel data as a Windows Bitmap (BMP).

## Data Flow
1.  **Request**: Client requests `GET /image`.
2.  **Processing Trigger**: Server initiates processing of the configured source file (e.g., `Pats10.jpg`).
3.  **Image Pipeline**:
    *   **Input**: Load Source JPG.
    *   **Geometry**: Detect orientation -> Resize & Center Crop (cover).
    *   **Dithering**: Apply `epdoptimize` dithering algorithm.
    *   **Color Mapping**: Transform dithered colors to Spectra 6 device colors.
    *   **Output**: Encode to BMP Buffer.
4.  **Response**: Server responds with binary BMP data.

## Deployment Environment
-   **Container**: Docker.
-   **Base Image**: `node:20-alpine`.
-   **System Dependencies**: `libc6-compat`, `build-base`, `cairo-dev`, `pango-dev`, `jpeg-dev`, `giflib-dev` (Required for `node-canvas` native bindings).
-   **Optimization**: Production dependencies only (`npm ci --only=production`).

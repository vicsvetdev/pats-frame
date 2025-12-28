# Service Architecture

## Overview
This service is a Node.js-based microservice designed to transform standard JPEG images into optimized BMP bitmaps suitable for Spectra 6 E-ink displays. It supports fetching random images from public photo albums (Google Photos, with future support for iCloud) or serving a local static image. It runs on a lightweight Alpine Linux environment and processes images on-demand.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              STARTUP                                     │
│                                                                          │
│  ┌──────────┐      ┌────────────────┐      ┌─────────────────────────┐  │
│  │ server.js│─────►│ image-source.js│─────►│ Provider (auto-detected)│  │
│  └──────────┘      └────────────────┘      └───────────┬─────────────┘  │
│                            │                           │                 │
│                            │              ┌────────────┴────────────┐    │
│                            │              ▼                         ▼    │
│                            │    ┌──────────────────┐    ┌────────────┐  │
│                            │    │ google-photos-   │    │  local-    │  │
│                            │    │ provider.js      │    │  provider  │  │
│                            │    │ (Puppeteer)      │    │  .js       │  │
│                            │    └────────┬─────────┘    └────────────┘  │
│                            │             │                               │
│                            │             ▼                               │
│                            │    ┌──────────────────┐                    │
│                            │    │ Scrape album     │                    │
│                            │    │ Cache URLs       │                    │
│                            │    │ (~1-2 min)       │                    │
│                            │    └──────────────────┘                    │
│                            │                                             │
│                            ▼                                             │
│                    Server Ready                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW                                   │
│                                                                          │
│    GET /image                                                            │
│        │                                                                 │
│        ▼                                                                 │
│  ┌──────────┐     ┌────────────────┐     ┌─────────────────────────┐    │
│  │ server.js│────►│ image-source.js│────►│ Pick random URL         │    │
│  └──────────┘     └────────────────┘     │ Download image (~1-2s)  │    │
│                           │              └─────────────────────────┘    │
│                           ▼                                              │
│                   ┌───────────────────┐                                  │
│                   │image-processor.js │                                  │
│                   │  ┌─────────────┐  │                                  │
│                   │  │ Load Buffer │  │                                  │
│                   │  └──────┬──────┘  │                                  │
│                   │         ▼         │                                  │
│                   │  ┌─────────────┐  │                                  │
│                   │  │Resize & Crop│  │                                  │
│                   │  └──────┬──────┘  │                                  │
│                   │         ▼         │                                  │
│                   │  ┌─────────────┐  │                                  │
│                   │  │  Dithering  │  │                                  │
│                   │  └──────┬──────┘  │                                  │
│                   │         ▼         │                                  │
│                   │  ┌─────────────┐  │                                  │
│                   │  │ Encode BMP  │  │                                  │
│                   │  └─────────────┘  │                                  │
│                   └───────────────────┘                                  │
│                           │                                              │
│                           ▼                                              │
│                   Response (image/bmp)                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. `server.js` (Interface Layer)
-   **Role**: Entry point and HTTP Server.
-   **Framework**: `fastify`.
-   **Responsibilities**:
    -   Initializes the image source on startup.
    -   Exposes the `GET /image` endpoint.
    -   Invokes the `ImageProcessor` with image buffer from the source.
    -   Streams the processed BMP buffer to the client with `Content-Type: image/bmp`.
    -   Handles errors and logging.

### 2. `image-source.js` (Source Abstraction Layer)
-   **Role**: Manages image providers and caching.
-   **Responsibilities**:
    -   Auto-detects provider type from `ALBUM_URL` environment variable.
    -   Initializes the appropriate provider on startup.
    -   Schedules periodic cache refresh (default: every 24 hours).
    -   Exposes `getRandomImage()` to fetch a random image buffer.

### 3. `providers/` (Provider Layer)
Abstract interface for different image sources with the following implementations:

#### `base-provider.js`
-   **Role**: Abstract base class defining the provider interface.
-   **Methods**:
    -   `initialize()`: Setup and initial cache population.
    -   `getRandomImageBuffer()`: Returns a random image as Buffer.
    -   `refreshCache()`: Re-scrapes/reloads the image list.

#### `local-provider.js`
-   **Role**: Serves a static local image file.
-   **Use Case**: Fallback when no `ALBUM_URL` is configured.

#### `google-photos-provider.js`
-   **Role**: Fetches random images from public Google Photos albums.
-   **Technology**: Puppeteer with system Chromium (headless browser).
-   **Process**:
    1.  Launch headless Chromium.
    2.  Navigate to public album URL.
    3.  Scroll through infinite-scroll to load all images.
    4.  Extract high-resolution image URLs.
    5.  Cache URLs in memory.
-   **URL Patterns**: `photos.app.goo.gl/*`, `photos.google.com/share/*`

### 4. `image-processor.js` (Domain Logic)
-   **Role**: Encapsulates all image manipulation logic.
-   **Dependencies**:
    -   `jimp`: Used for image loading, resizing (cropping), and final BMP encoding.
-   **Pipeline Methods**:
    -   `processBuffer(buffer)`: Main entry point for processing image buffers.
    -   `process(path)`: Legacy method for processing local files.

### 5. `resizer.js` (Geometry Operations)
-   **Role**: Handles image loading and geometric transformations.
-   **Methods**:
    -   `loadImage(pathOrBuffer)`: Reads source from disk or buffer.
    -   `resizeAndCenterCrop(image)`: Scales and crops to 800x480 or 480x800 based on orientation.
    -   `encodeToBMP(image)`: Exports the final pixel data as Windows Bitmap.

### 6. `ditherer.js` (Color Processing)
-   **Role**: Performs E-ink specific color optimization.
-   **Process**:
    -   Applies **Floyd-Steinberg error diffusion** using the Spectra 6 palette.
    -   Maps dithered visual colors to hardware signal values.

## Provider Auto-Detection

The system automatically detects the provider based on the `ALBUM_URL` pattern:

| URL Pattern | Provider |
|-------------|----------|
| `photos.app.goo.gl/*` | `google-photos` |
| `photos.google.com/share/*` | `google-photos` |
| `icloud.com/sharedalbum/*` | `icloud` (future) |
| (not set) | `local` |

## Caching Strategy

For remote album providers:

1.  **On Startup**: Full album scrape, blocks until complete (~1-2 minutes for large albums).
2.  **In Memory**: Image URLs cached in memory for fast random selection.
3.  **Periodic Refresh**: Cache refreshed every N hours (configurable via `CACHE_REFRESH_HOURS`).
4.  **Request Path**: Random URL selection (<1ms) + image download (~1-2s).

## Deployment Environment
-   **Container**: Docker.
-   **Base Image**: `node:20-alpine`.
-   **System Dependencies**: 
    -   `libc6-compat`, `build-base`, `cairo-dev`, `pango-dev`, `jpeg-dev`, `giflib-dev` (for `node-canvas`)
    -   `chromium`, `nss`, `freetype`, `harfbuzz`, `ca-certificates`, `ttf-freefont` (for Puppeteer)
-   **Optimization**: Production dependencies only (`npm ci --only=production`).

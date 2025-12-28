# Pats Frame Service

A Node.js microservice designed to process and serve images for Spectra 6 E-ink displays. Supports fetching random images from public photo albums or serving a static local image.

## Features
*   **Public Album Support**: Fetches random images from public Google Photos albums (iCloud support planned).
*   **On-Demand Processing**: Processes images when requested.
*   **Smart Resizing**: Automatically detects orientation and crops/resizes to fill the screen (800x480 or 480x800).
*   **E-ink Optimization**: Dithers images using Floyd-Steinberg error diffusion for the Spectra 6 7-color e-paper display.
*   **Format Conversion**: Serves the final result as a standard BMP file.

## Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for design details.

## Configuration

Edit `config.json`:

```json
{
  "albumUrl": "https://photos.app.goo.gl/your-album-id",
  "cacheRefreshHours": 24
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `albumUrl` | No | (none) | Google Photos album URL. If not set, uses local `Pats10.jpg` |
| `cacheRefreshHours` | No | `24` | How often to re-scrape the album (hours) |

### Supported Album Providers

| Provider | URL Pattern | Status |
|----------|-------------|--------|
| Google Photos | `https://photos.app.goo.gl/...` | Supported |
| Google Photos | `https://photos.google.com/share/...` | Supported |
| iCloud | `https://icloud.com/sharedalbum/...` | Planned |
| Local File | (no URL set) | Supported |

## Docker

### Build

```bash
docker build -t pats-frame .
```

### Run

```bash
docker run -d -p 8040:8080 --name pats-frame --restart unless-stopped pats-frame
```

Replace `8040` with whatever external port you want.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/image` | GET | Returns a processed BMP image |
| `/health` | GET | Health check endpoint |
| `/status` | GET | Returns provider info, cache size, last refresh time |

## Startup Behavior

When `albumUrl` is configured:

1.  Container starts and detects provider from URL.
2.  Scrapes the album to build image cache (~1-2 minutes for large albums).
3.  Server begins accepting requests.
4.  Cache refreshes automatically every `cacheRefreshHours` hours.

The first `/image` request will be fast (~1-2 seconds) since caching happens during startup.

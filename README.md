# Pats Frame Service

A Node.js microservice designed to process and serve images for Spectra 6 E-ink displays.

## Features
*   **On-Demand Processing**: Processes the source image when requested.
*   **Smart Resizing**: Automatically detects orientation and crops/resizes the image to fill the screen (800x480 or 480x800).
*   **E-ink Optimization**: Dithers the image using Floyd-Steinberg error diffusion and maps colors specifically for the Spectra 6 7-color e-paper display.
*   **Format Conversion**: Serves the final result as a standard BMP file.

## Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for design details.

## Setup

### Prerequisites
*   Node.js 20+
*   Docker (optional)

### Running Locally
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the server:
    ```bash
    node server.js
    ```
3.  Access the image:
    `http://localhost:8080/image`

### Docker
1.  Build the image:
    ```bash
    docker build -t pats-frame .
    ```
2.  Run the container:
    ```bash
    docker run -p 8080:8080 pats-frame
    ```

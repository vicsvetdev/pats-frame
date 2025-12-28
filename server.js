const fastify = require('fastify')({ logger: true });
const imageProcessor = require('./image-processor');
const imageSource = require('./image-source');

// Constants
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// Routes
fastify.get('/image', async (request, reply) => {
  try {
    // Get random image buffer from source
    const imageBuffer = await imageSource.getRandomImage();

    // Process the image
    const bmpBuffer = await imageProcessor.processBuffer(imageBuffer);

    // Serve the result
    reply
      .type('image/bmp')
      .send(bmpBuffer);

  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Image processing failed', message: err.message });
  }
});

fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

fastify.get('/status', async (request, reply) => {
  return imageSource.getStatus();
});

// Start Server
const start = async () => {
  try {
    // Initialize image source (blocks until cache is ready)
    console.log('Initializing image source...');
    await imageSource.initialize();
    console.log('Image source ready:', imageSource.getStatus());

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  imageSource.shutdown();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

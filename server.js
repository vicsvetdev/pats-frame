// Patterns that indicate bot/scanner probes (not legitimate traffic)
const BOT_PROBE_PATTERNS = [
  /^\/\.git/,
  /^\/\.env/,
  /^\/\.svn/,
  /^\/\.hg/,
  /^\/wp-/,
  /^\/wordpress/,
  /^\/admin/,
  /^\/phpmyadmin/i,
  /^\/developmentserver/,
  /^\/config\./,
  /^\/backup/,
  /^\/\.well-known\/security\.txt$/,  // Allow security.txt, block others
];

const fastify = require('fastify')({ 
  logger: {
    level: 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          host: request.headers?.host,
          remoteAddress: request.ip,
          remotePort: request.socket?.remotePort
        };
      }
    }
  }
});
const imageProcessor = require('./image-processor');
const imageSource = require('./image-source');

// Constants
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// Suppress logging for bot probe requests
fastify.addHook('onRequest', async (request, reply) => {
  const url = request.url;
  const isBotProbe = BOT_PROBE_PATTERNS.some(pattern => pattern.test(url));
  
  if (isBotProbe) {
    // Mark request to suppress response logging
    request.isBotProbe = true;
  }
});

// Custom 404 handler that suppresses logging for bot probes
fastify.setNotFoundHandler((request, reply) => {
  if (!request.isBotProbe) {
    fastify.log.warn({ url: request.url, method: request.method }, 'Route not found');
  }
  reply.code(404).send({ error: 'Not Found' });
});

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

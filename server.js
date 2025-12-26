const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs');
const imageProcessor = require('./image-processor');

// Constants
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const IMAGE_PATH = path.join(__dirname, 'Pats10.jpg');

// Routes
fastify.get('/image', async (request, reply) => {
  try {
    if (!fs.existsSync(IMAGE_PATH)) {
      reply.code(404).send({ error: 'Source image not found' });
      return;
    }

    // Trigger on-demand processing
    const bmpBuffer = await imageProcessor.process(IMAGE_PATH);

    // Serve the result
    reply
      .type('image/bmp')
      .send(bmpBuffer);

  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Image processing failed' });
  }
});

fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
});

// Start Server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

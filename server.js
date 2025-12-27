const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs');
const imageProcessor = require('./image-processor');

// Constants
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const IMAGE_PATH = path.join(__dirname, 'Pats10.jpg');
const C_ALG_PATH = path.join(__dirname, 'Pat_c_alg.bmp');
const WEB_ALG_PATH = path.join(__dirname, 'Pat_web_alg.bmp');

let requestCounter = 0;

// Routes
fastify.get('/image', async (request, reply) => {
  try {
    const mode = requestCounter % 3;
    requestCounter++;
    
    let bmpBuffer;

    if (mode === 0) {
      if (!fs.existsSync(IMAGE_PATH)) {
        reply.code(404).send({ error: 'Source image not found' });
        return;
      }
      // Trigger on-demand processing
      bmpBuffer = await imageProcessor.process(IMAGE_PATH);
    } else if (mode === 1) {
       if (!fs.existsSync(C_ALG_PATH)) {
        reply.code(404).send({ error: 'C alg image not found' });
        return;
      }
      bmpBuffer = await fs.promises.readFile(C_ALG_PATH);
    } else {
       if (!fs.existsSync(WEB_ALG_PATH)) {
        reply.code(404).send({ error: 'Web alg image not found' });
        return;
      }
      bmpBuffer = await fs.promises.readFile(WEB_ALG_PATH);
    }

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

const Bull = require('bull');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const queues = new Map();

exports.createQueue = (name) => {
  if (queues.has(name)) {
    return queues.get(name);
  }

  const queue = new Bull(name, {
    redis: {
      host: REDIS_HOST,
      port: REDIS_PORT
    }
  });

  // Process jobs
  queue.process(async (job) => {
    console.log(`Processing job ${job.id}:`, job.data);
    
    // Simulate computation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      result: 'Job completed',
      processedAt: new Date().toISOString()
    };
  });

  queues.set(name, queue);
  return queue;
};

exports.getQueue = (name) => {
  return queues.get(name);
};
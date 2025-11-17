const express = require('express');
const { createQueue, getQueue } = require('./queue/bullQueue');
const computeTasks = require('./tasks/computeTasks');

const app = express();
const PORT = process.env.PORT || 3003;
const SERVICE_NAME = process.env.SERVICE_NAME || 'compute-service-1';

app.use(express.json());

// Initialize queue
const jobQueue = createQueue('compute-jobs');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Ready check endpoint
app.get('/ready', async (req, res) => {
  try {
    const queueHealth = await jobQueue.isReady();
    res.json({
      status: 'ready',
      service: SERVICE_NAME,
      queue: queueHealth ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: SERVICE_NAME,
      error: error.message
    });
  }
});

// Submit computation job
app.post('/api/compute/job', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data are required' });
    }

    const job = await jobQueue.add({
      type,
      data,
      submittedAt: new Date().toISOString(),
      service: SERVICE_NAME
    });

    res.status(202).json({
      message: 'Job submitted successfully',
      jobId: job.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Job submission error:', error);
    res.status(500).json({ error: 'Failed to submit job' });
  }
});

// Get job status
app.get('/api/compute/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();

    res.json({
      jobId: job.id,
      status: state,
      progress,
      data: job.data,
      result: job.returnvalue
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to retrieve job' });
  }
});

// Process computation directly (synchronous)
app.post('/api/compute/direct', async (req, res) => {
  try {
    const { operation, operands } = req.body;

    if (!operation || !operands) {
      return res.status(400).json({ error: 'Operation and operands are required' });
    }

    let result;
    switch (operation) {
      case 'add':
        result = computeTasks.add(operands);
        break;
      case 'multiply':
        result = computeTasks.multiply(operands);
        break;
      case 'factorial':
        result = computeTasks.factorial(operands[0]);
        break;
      case 'fibonacci':
        result = computeTasks.fibonacci(operands[0]);
        break;
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    res.json({
      operation,
      operands,
      result,
      service: SERVICE_NAME,
      computedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Computation error:', error);
    res.status(500).json({ error: 'Computation failed' });
  }
});

// Get queue stats
app.get('/api/compute/stats', async (req, res) => {
  try {
    const counts = await jobQueue.getJobCounts();
    res.json({
      service: SERVICE_NAME,
      queue: counts
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    error: 'Internal server error',
    service: SERVICE_NAME
  });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Compute Service running on port ${PORT}`);
});

module.exports = app;
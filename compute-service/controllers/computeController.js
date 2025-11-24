const computeTasks = require('../tasks/computeTasks');
const { createQueue } = require('../queue/bullQueue');

const jobQueue = createQueue('compute-jobs');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.computeDirect = async (req, res) => {
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
      case 'subtract':
        result = computeTasks.subtract(operands);
        break;
      case 'multiply':
        result = computeTasks.multiply(operands);
        break;
      case 'divide':
        result = computeTasks.divide(operands);
        break;
      case 'power':
        if (operands.length !== 2) {
          return res.status(400).json({ error: 'Power operation requires exactly 2 operands: base and exponent' });
        }
        result = computeTasks.power(operands[0], operands[1]);
        break;
      case 'factorial':
        if (operands.length !== 1) {
          return res.status(400).json({ error: 'Factorial operation requires exactly 1 operand' });
        }
        result = computeTasks.factorial(operands[0]);
        break;
      case 'fibonacci':
        if (operands.length !== 1) {
          return res.status(400).json({ error: 'Fibonacci operation requires exactly 1 operand' });
        }
        result = computeTasks.fibonacci(operands[0]);
        break;
      case 'primeCheck':
        if (operands.length !== 1) {
          return res.status(400).json({ error: 'Prime check operation requires exactly 1 operand' });
        }
        result = computeTasks.primeCheck(operands[0]);
        break;
      case 'sumOfSquares':
        result = computeTasks.sumOfSquares(operands);
        break;
      case 'average':
        result = computeTasks.average(operands);
        break;
      case 'matrixMultiply':
        if (!operands[0] || !operands[1]) {
          return res.status(400).json({ error: 'Two matrices are required for matrix multiplication' });
        }
        result = computeTasks.matrixMultiply(operands[0], operands[1]);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid operation', 
          supported: ['add', 'subtract', 'multiply', 'divide', 'power', 'factorial', 'fibonacci', 'primeCheck', 'sumOfSquares', 'average', 'matrixMultiply']
        });
    }


    res.json({
      operation,
      operands,
      result,
      service: process.env.SERVICE_NAME || 'compute-service-1',
      computedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Computation error:', error);
    res.status(500).json({ 
      error: 'Computation failed',
      message: error.message 
    });
  }
};

exports.submitJob = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data are required' });
    }

    const job = await jobQueue.add({
      type,
      data,
      submittedAt: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'compute-service-1'
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
};

exports.getJobStatus = async (req, res) => {
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
};

exports.getStats = async (req, res) => {
  try {
    const counts = await jobQueue.getJobCounts();
    res.json({
      service: process.env.SERVICE_NAME || 'compute-service-1',
      queue: counts
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
};


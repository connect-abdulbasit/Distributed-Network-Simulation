const path = require('path');
const localDb = require(path.join(__dirname, '../../shared/db/localDb'));

exports.getDataById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const dataItem = await localDb.getDataItemById(id);
    if (!dataItem) {
      return res.status(404).json({ error: 'Data not found' });
    }

    res.json({
      message: 'Data retrieved successfully',
      data: dataItem
    });
  } catch (error) {
    console.error('Get data by id error:', error);
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
};

exports.dataWorker = async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  res.json({
    message: 'Data worker completed',
    service: process.env.SERVICE_NAME || 'data-service-1',
    timestamp: new Date().toISOString()
  });
};
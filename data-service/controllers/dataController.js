// In-memory data store (replace with database in production)
const dataStore = new Map();

exports.createData = async (req, res) => {
  try {
    const { key, value, metadata } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const dataItem = {
      id: Date.now().toString(),
      key,
      value,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dataStore.set(key, dataItem);

    res.status(201).json({
      message: 'Data created successfully',
      data: dataItem
    });
  } catch (error) {
    console.error('Create data error:', error);
    res.status(500).json({ error: 'Failed to create data' });
  }
};

exports.getData = async (req, res) => {
  try {
    const { key } = req.params;

    const dataItem = dataStore.get(key);
    if (!dataItem) {
      return res.status(404).json({ error: 'Data not found' });
    }

    res.json({
      message: 'Data retrieved successfully',
      data: dataItem
    });
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
};

exports.getAllData = async (req, res) => {
  try {
    const allData = Array.from(dataStore.values());
    
    res.json({
      message: 'Data retrieved successfully',
      count: allData.length,
      data: allData
    });
  } catch (error) {
    console.error('Get all data error:', error);
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
};

exports.updateData = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, metadata } = req.body;

    const dataItem = dataStore.get(key);
    if (!dataItem) {
      return res.status(404).json({ error: 'Data not found' });
    }

    dataItem.value = value || dataItem.value;
    dataItem.metadata = metadata || dataItem.metadata;
    dataItem.updatedAt = new Date().toISOString();

    dataStore.set(key, dataItem);

    res.json({
      message: 'Data updated successfully',
      data: dataItem
    });
  } catch (error) {
    console.error('Update data error:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
};

exports.deleteData = async (req, res) => {
  try {
    const { key } = req.params;

    if (!dataStore.has(key)) {
      return res.status(404).json({ error: 'Data not found' });
    }

    dataStore.delete(key);

    res.json({
      message: 'Data deleted successfully'
    });
  } catch (error) {
    console.error('Delete data error:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
};
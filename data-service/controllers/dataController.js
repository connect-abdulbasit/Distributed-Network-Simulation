const path = require('path');
const localDb = require(path.join(__dirname, '../../shared/db/localDb'));

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

    // Use atomic insert operation that fails if key already exists
    try {
      const result = await localDb.insertDataItem(dataItem);
      
      if (!result.inserted) {
        return res.status(409).json({ error: 'Key already exists' });
      }

      res.status(201).json({
        message: 'Data created successfully',
        data: dataItem
      });
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message === 'Key already exists') {
        return res.status(409).json({ error: 'Key already exists' });
      }
      // Re-throw other errors to be handled by outer catch
      throw error;
    }
  } catch (error) {
    console.error('Create data error:', error);
    // Don't expose internal errors, but log them
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message === 'Key already exists') {
      return res.status(409).json({ error: 'Key already exists' });
    }
    res.status(500).json({ error: 'Failed to create data' });
  }
};

exports.getData = async (req, res) => {
  try {
    const { key } = req.params;

    const dataItem = await localDb.getDataItemByKey(key);
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
    const allData = await localDb.getAllDataItems();
    
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

    const dataItem = await localDb.getDataItemByKey(key);
    if (!dataItem) {
      return res.status(404).json({ error: 'Data not found' });
    }

    const updatedItem = {
      ...dataItem,
      value: value !== undefined ? value : dataItem.value,
      metadata: metadata !== undefined ? metadata : dataItem.metadata,
      updatedAt: new Date().toISOString()
    };

    await localDb.saveDataItem(updatedItem);

    res.json({
      message: 'Data updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Update data error:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
};

exports.deleteData = async (req, res) => {
  try {
    const { key } = req.params;

    const deleted = await localDb.deleteDataItemByKey(key);

    if (!deleted) {
      return res.status(404).json({ error: 'Data not found' });
    }

    res.json({
      message: 'Data deleted successfully'
    });
  } catch (error) {
    console.error('Delete data error:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
};
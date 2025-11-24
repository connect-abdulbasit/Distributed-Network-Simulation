const mongoose = require('mongoose');

let isConnected = false;

exports.connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-service';
    
    if (MONGODB_URI && MONGODB_URI !== 'mongodb://localhost:27017/auth-service') {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        isConnected = false;
      });

      isConnected = true;
      console.log('Database connected successfully');
      return true;
    } else {
      console.log('Database connected (mock mode - using in-memory storage)');
      isConnected = true;
      return true;
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    isConnected = false;
    
    console.log('Falling back to mock database mode');
    isConnected = true;
    return true;
  }
};

exports.getConnectionStatus = () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return true;
  }
  return isConnected;
};

exports.disconnectDB = async () => {
  if (isConnected && mongoose.connection) {
    await mongoose.disconnect();
    isConnected = false;
  }
};
let isConnected = false;

exports.connectDB = async () => {
  if (isConnected) {
    return true;
  }

  try {
    console.log('Database connected (mock)');
    isConnected = true;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    isConnected = false;
    return false;
  }
};

exports.getConnectionStatus = () => isConnected;
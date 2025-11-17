// Mock database connection for now
// Replace with actual MongoDB connection in production

let isConnected = false;

exports.connectDB = async () => {
  if (isConnected) {
    return true;
  }

  try {
    // Simulate database connection
    // In production: await mongoose.connect(process.env.MONGODB_URI);
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
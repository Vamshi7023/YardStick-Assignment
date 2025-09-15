const mongoose = require('mongoose');

  let connectingPromise;

  /**
   * Connect to MongoDB (Atlas/local) using Mongoose.
   * Reads MONGODB_URI or MONGO_URI at runtime so dotenv can load first.
   */
  async function connectDB() {
    // Reuse existing connection
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (connectingPromise) return connectingPromise;

    const uri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      ''; // accept both for compatibility

    if (!uri) {
      throw new Error(
        'Missing MONGODB_URI (or MONGO_URI). Add it to your .env. Example:\n' +
          'MONGODB_URI="mongodb+srv://root:12345@notes.bvmrknx.mongodb.net/saas_notes"'
      );
    }

    mongoose.set('strictQuery', true);

    connectingPromise = mongoose
      .connect(uri, {
        autoIndex: true,
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => {
        const { host, name } = mongoose.connection;
        console.log(`MongoDB connected (${host}/${name})`);
        return mongoose.connection;
      })
      .catch((err) => {
        console.error('MongoDB connection error', err);
        process.exit(1);
      });

    return connectingPromise;
  }

  async function closeDB() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await closeDB();
    } finally {
      process.exit(0);
    }
  });

  module.exports = { connectDB, closeDB };
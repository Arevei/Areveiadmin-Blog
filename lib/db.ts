import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

function getMongoUri() {
  const uri = process.env.DB_URL?.replace(/\s+/g, "").trim();

  if (!uri) {
    throw new Error("Missing DB_URL. Add your MongoDB connection string to arvadmin/.env");
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error("DB_URL must start with mongodb:// or mongodb+srv://");
  }

  if (!uri.includes("@")) {
    throw new Error(
      "DB_URL looks incomplete. Keep the full MongoDB URI on one line, including the @cluster host."
    );
  }

  return uri;
}

export async function connectToDatabase() {
  if (!globalForMongoose.mongooseCache) {
    globalForMongoose.mongooseCache = {
      conn: null,
      promise: null,
    };
  }

  const cache = globalForMongoose.mongooseCache;

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(getMongoUri(), {
      dbName: process.env.DB_NAME || "arevei_blog",
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

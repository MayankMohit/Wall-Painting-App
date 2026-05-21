// This file uses a singleton pattern to manage the MongoDB connection using Mongoose. 
// It ensures that only one connection is established and reused across the application, 
// which is especially important in serverless environments where functions may be invoked multiple times.

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

declare global {
  var _mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const cached = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
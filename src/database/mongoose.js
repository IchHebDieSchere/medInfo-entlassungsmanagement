import mongoose from 'mongoose'
import { config } from '../config/env.js'

export const connectToDatabase = async () => {
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 5000
  })

  console.log('MongoDB connected')
}

export const disconnectFromDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return
  }

  await mongoose.disconnect()

  console.log('MongoDB disconnected')
}

export const isDatabaseReady = () => {
  return mongoose.connection.readyState === 1
}
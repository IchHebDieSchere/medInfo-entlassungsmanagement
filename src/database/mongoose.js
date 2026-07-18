import mongoose from 'mongoose'

import { config } from '../config/env.js'
import { logger } from '../observability/logger.js'

export const connectToDatabase = async () => {
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 5000
  })

  logger.info('MongoDB connected', {
    database: mongoose.connection.name
  })
}

export const disconnectFromDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return
  }

  const databaseName = mongoose.connection.name

  await mongoose.disconnect()

  logger.info('MongoDB disconnected', {
    database: databaseName
  })
}

export const isDatabaseReady = () => {
  return mongoose.connection.readyState === 1
}
import { config } from '../config/env.js'

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  const hasValidStatusCode =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599

  const statusCode = hasValidStatusCode
    ? error.statusCode
    : 500

  const code =
    error.code ||
    (statusCode >= 500
      ? 'INTERNAL_SERVER_ERROR'
      : 'REQUEST_ERROR')

  const hideInternalMessage =
    config.nodeEnv === 'production' && statusCode >= 500

  const message = hideInternalMessage
    ? 'Internal server error'
    : error.message || 'An unexpected error occurred'

  console.error({
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    error: error.stack || error.message
  })

  return res.status(statusCode).json({
    error: {
      code,
      message
    }
  })

  return res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.id
    }
  })
}
import { config } from '../config/env.js'
import {
  logger,
  sanitizeRequestPath,
  serializeError
} from '../observability/logger.js'

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  const isInvalidJson =
    error instanceof SyntaxError && error.type === 'entity.parse.failed'

  const hasValidStatusCode =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599

  const statusCode = isInvalidJson
    ? 400
    : hasValidStatusCode
      ? error.statusCode
      : 500

  const hasApplicationErrorCode =
    typeof error.code === 'string' && error.code.length > 0

  const code = isInvalidJson
    ? 'INVALID_JSON'
    : hasApplicationErrorCode
      ? error.code
      : statusCode >= 500
        ? 'INTERNAL_SERVER_ERROR'
        : 'REQUEST_ERROR'

  const hideInternalMessage =
    config.nodeEnv === 'production' && statusCode >= 500

  const message = isInvalidJson
    ? 'Request body contains invalid JSON'
    : hideInternalMessage
      ? 'Internal server error'
      : error.message || 'An unexpected error occurred'

  res.locals.errorCode = code

  if (statusCode >= 500) {
    logger.error('Request processing failed', {
      requestId: req.id,
      method: req.method,
      path: sanitizeRequestPath(req.originalUrl.split('?')[0]),
      statusCode,
      code,
      error: serializeError(error, {
        includeStack: config.nodeEnv !== 'production'
      })
    })
  }

  const hasDetails =
    error.details !== undefined &&
    error.details !== null &&
    (!Array.isArray(error.details) || error.details.length > 0)

  return res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.id,
      ...(hasDetails ? { details: error.details } : {})
    }
  })
}

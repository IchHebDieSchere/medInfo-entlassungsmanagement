import { logger, sanitizeRequestPath } from '../observability/logger.js'

const getDurationMs = startedAt => {
  const durationNanoseconds = process.hrtime.bigint() - startedAt

  const durationMilliseconds = Number(durationNanoseconds) / 1_000_000

  return Number(durationMilliseconds.toFixed(2))
}

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint()

  const pathWithoutQuery = req.originalUrl.split('?')[0]

  const requestPath = sanitizeRequestPath(pathWithoutQuery)

  let requestLogged = false

  const writeRequestLog = outcome => {
    if (requestLogged) {
      return
    }

    requestLogged = true

    const context = {
      requestId: req.id,
      method: req.method,
      path: requestPath,
      statusCode: res.statusCode,
      durationMs: getDurationMs(startedAt),
      outcome,
      ...(res.locals.errorCode ? { errorCode: res.locals.errorCode } : {})
    }

    if (outcome === 'aborted') {
      logger.warn('HTTP request aborted', context)
      return
    }

    if (res.statusCode >= 500) {
      logger.error('HTTP request completed', context)
      return
    }

    if (res.statusCode >= 400) {
      logger.warn('HTTP request completed', context)
      return
    }

    logger.info('HTTP request completed', context)
  }

  res.once('finish', () => {
    writeRequestLog('completed')
  })

  res.once('close', () => {
    if (!res.writableEnded) {
      writeRequestLog('aborted')
    }
  })

  next()
}

const uuidPathSegmentPattern =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi

export const sanitizeRequestPath = path => {
  if (typeof path !== 'string') {
    return 'unknown'
  }

  return path.replace(uuidPathSegmentPattern, '/:id')
}

export const serializeError = (error, { includeStack = false } = {}) => {
  if (!(error instanceof Error)) {
    return {
      message: String(error)
    }
  }

  return {
    name: error.name,
    message: error.message,
    ...(includeStack && error.stack ? { stack: error.stack } : {})
  }
}

const writeLog = (level, message, context = {}) => {
  const safeContext = { ...context }

  delete safeContext.timestamp
  delete safeContext.level
  delete safeContext.message

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safeContext
  }

  const output = JSON.stringify(entry)

  if (level === 'error') {
    console.error(output)
    return
  }

  if (level === 'warn') {
    console.warn(output)
    return
  }

  console.log(output)
}

export const logger = Object.freeze({
  info: (message, context) => {
    writeLog('info', message, context)
  },

  warn: (message, context) => {
    writeLog('warn', message, context)
  },

  error: (message, context) => {
    writeLog('error', message, context)
  }
})

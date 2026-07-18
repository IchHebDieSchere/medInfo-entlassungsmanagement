const allowedNodeEnvs = new Set([
  'development',
  'test',
  'production'
])

const parseNodeEnv = value => {
  if (!allowedNodeEnvs.has(value)) {
    throw new Error(`Invalid NODE_ENV value: ${value}`)
  }

  return value
}

const parsePort = value => {
  const port = Number.parseInt(value, 10)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`)
  }

  return port
}

const getMongoDbUri = nodeEnv => {
  const configuredUri = process.env.MONGODB_URI?.trim()

  if (configuredUri) {
    return configuredUri
  }

  if (nodeEnv === 'production') {
    throw new Error(
      'MONGODB_URI is required when NODE_ENV is production'
    )
  }

  if (nodeEnv === 'test') {
    return 'mongodb://127.0.0.1:27017/med-info-fhir-test'
  }

  return 'mongodb://127.0.0.1:27017/med-info-fhir'
}

const nodeEnv = parseNodeEnv(
  process.env.NODE_ENV || 'development'
)

const parseCorsOrigins = value => {
  const origins = value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  for (const origin of origins) {
    let parsedOrigin

    try {
      parsedOrigin = new URL(origin)
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`)
    }

    if (
      !['http:', 'https:'].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin
    ) {
      throw new Error(`Invalid CORS origin: ${origin}`)
    }
  }

  return Object.freeze([
    ...new Set(origins)
  ])
}

const parsePositiveInteger = (value, name) => {
  const parsedValue = Number(value)

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    throw new Error(
      `${name} must be a positive integer`
    )
  }

  return parsedValue
}

export const config = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT || '3000'),
  mongodbUri: getMongoDbUri(nodeEnv),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS || ''),
  rateLimitWindowMs: parsePositiveInteger(
    process.env.RATE_LIMIT_WINDOW_MS || '60000',
    'RATE_LIMIT_WINDOW_MS'
  ),
  rateLimitMaxRequests: parsePositiveInteger(
    process.env.RATE_LIMIT_MAX_REQUESTS || '100',
    'RATE_LIMIT_MAX_REQUESTS'
  )
})

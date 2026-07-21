const allowedNodeEnvs = new Set(['development', 'test', 'production'])

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
    throw new Error('MONGODB_URI is required when NODE_ENV is production')
  }

  if (nodeEnv === 'test') {
    return 'mongodb://127.0.0.1:27017/med-info-fhir-test'
  }

  return 'mongodb://127.0.0.1:27017/med-info-fhir'
}

const parseFhirBaseUrl = value => {
  let parsedUrl

  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error(`Invalid FHIR_BASE_URL value: ${value}`)
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`FHIR_BASE_URL must use http or https: ${value}`)
  }

  return parsedUrl.href.replace(/\/$/, '')
}

const getFhirBaseUrl = () => {
  const configuredUrl = process.env.FHIR_BASE_URL?.trim()

  if (configuredUrl) {
    return parseFhirBaseUrl(configuredUrl)
  }

  return 'http://localhost:8080/fhir'
}

const nodeEnv = parseNodeEnv(process.env.NODE_ENV || 'development')

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

  return Object.freeze([...new Set(origins)])
}

const parsePositiveInteger = (value, name) => {
  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`${name} must be a positive integer`)
  }

  return parsedValue
}

const parseBoolean = (value, name) => {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  throw new Error(`${name} must be either true or false`)
}

const parseTrustProxy = value => {
  if (value === 'true' || value === 'false') {
    return parseBoolean(value, 'TRUST_PROXY')
  }

  return parsePositiveInteger(value, 'TRUST_PROXY')
}

const getRequiredAuthValue = (name, enabled) => {
  const value = process.env[name]?.trim()

  if (enabled && !value) {
    throw new Error(`${name} is required when authentication is enabled`)
  }

  return value || null
}

const getAuthConfig = nodeEnv => {
  const enabled = parseBoolean(
    process.env.AUTH_ENABLED || (nodeEnv === 'production' ? 'true' : 'false'),
    'AUTH_ENABLED'
  )

  const publicKey =
    getRequiredAuthValue('JWT_PUBLIC_KEY', enabled)?.replace(/\\n/g, '\n') ||
    null

  const issuer = getRequiredAuthValue('JWT_ISSUER', enabled)

  const audience = getRequiredAuthValue('JWT_AUDIENCE', enabled)

  return Object.freeze({
    enabled,
    algorithm: 'RS256',
    publicKey,
    issuer,
    audience
  })
}

const getHttpConfig = () => {
  const requestTimeoutMs = parsePositiveInteger(
    process.env.HTTP_REQUEST_TIMEOUT_MS || '30000',
    'HTTP_REQUEST_TIMEOUT_MS'
  )

  const headersTimeoutMs = parsePositiveInteger(
    process.env.HTTP_HEADERS_TIMEOUT_MS || '15000',
    'HTTP_HEADERS_TIMEOUT_MS'
  )

  if (headersTimeoutMs > requestTimeoutMs) {
    throw new Error(
      'HTTP_HEADERS_TIMEOUT_MS must not exceed HTTP_REQUEST_TIMEOUT_MS'
    )
  }

  return Object.freeze({
    requestTimeoutMs,
    headersTimeoutMs,
    keepAliveTimeoutMs: parsePositiveInteger(
      process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || '5000',
      'HTTP_KEEP_ALIVE_TIMEOUT_MS'
    ),
    shutdownTimeoutMs: parsePositiveInteger(
      process.env.HTTP_SHUTDOWN_TIMEOUT_MS || '10000',
      'HTTP_SHUTDOWN_TIMEOUT_MS'
    )
  })
}

export const config = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT || '3000'),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY || 'false'),
  mongodbUri: getMongoDbUri(nodeEnv),
  fhirBaseUrl: getFhirBaseUrl(),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS || ''),
  rateLimitWindowMs: parsePositiveInteger(
    process.env.RATE_LIMIT_WINDOW_MS || '60000',
    'RATE_LIMIT_WINDOW_MS'
  ),
  rateLimitMaxRequests: parsePositiveInteger(
    process.env.RATE_LIMIT_MAX_REQUESTS || '100',
    'RATE_LIMIT_MAX_REQUESTS'
  ),
  http: getHttpConfig(),
  auth: getAuthConfig(nodeEnv)
})

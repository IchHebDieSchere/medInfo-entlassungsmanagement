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

export const config = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT || '3000'),
  mongodbUri: getMongoDbUri(nodeEnv)
})
import { AppError } from '../errors/app-error.js'

const supportedLocations = new Set(['body', 'params', 'query'])

const formatValidationIssues = (location, issues) => {
  return issues.map(issue => ({
    location,
    path: issue.path.join('.') || location,
    code: issue.code,
    message: issue.message
  }))
}

export const validateRequest = schemas => {
  const entries = Object.entries(schemas)

  for (const [location] of entries) {
    if (!supportedLocations.has(location)) {
      throw new Error(`Unsupported request validation location: ${location}`)
    }
  }

  return (req, res, next) => {
    const validated = {}
    const details = []

    for (const [location, schema] of entries) {
      const result = schema.safeParse(req[location])

      if (!result.success) {
        details.push(...formatValidationIssues(location, result.error.issues))

        continue
      }

      validated[location] = result.data
    }

    if (details.length > 0) {
      next(
        new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', {
          details
        })
      )

      return
    }

    req.validated = Object.freeze(validated)
    next()
  }
}

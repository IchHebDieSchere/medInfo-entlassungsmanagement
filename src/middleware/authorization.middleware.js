import { config } from '../config/env.js'
import { AppError } from '../errors/app-error.js'

export const createScopeAuthorizer = ({
  enabled = config.auth.enabled
} = {}) => {
  return (...requiredScopes) => {
    const uniqueRequiredScopes = [...new Set(requiredScopes)]

    return (req, res, next) => {
      if (!enabled) {
        next()
        return
      }

      if (!req.user) {
        next(
          new AppError(
            401,
            'AUTHENTICATION_REQUIRED',
            'Authentication is required'
          )
        )

        return
      }

      const grantedScopes = new Set(req.user.scopes)

      const missingScopes = uniqueRequiredScopes.filter(
        scope => !grantedScopes.has(scope)
      )

      if (missingScopes.length > 0) {
        next(
          new AppError(
            403,
            'INSUFFICIENT_SCOPE',
            `Required scope missing: ${missingScopes.join(', ')}`
          )
        )

        return
      }

      next()
    }
  }
}

export const requireScopes = createScopeAuthorizer()

import { rateLimit } from 'express-rate-limit'

import { config } from '../config/env.js'
import { AppError } from '../errors/app-error.js'

export const createApiRateLimiter = ({
  windowMs = config.rateLimitWindowMs,
  limit = config.rateLimitMaxRequests
} = {}) => {
  return rateLimit({
    windowMs,
    limit,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    skip: req => req.method === 'OPTIONS',

    handler: (req, res, next, options) => {
      next(
        new AppError(
          options.statusCode,
          'RATE_LIMIT_EXCEEDED',
          'Too many requests, please try again later'
        )
      )
    }
  })
}

export const apiRateLimiter = createApiRateLimiter()

import { AppError } from '../errors/app-error.js'

export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    404,
    'ROUTE_NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} not found`
  )

  next(error)
}

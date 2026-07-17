import { randomUUID } from 'node:crypto'

const requestIdPattern =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/

const getRequestId = req => {
  const providedRequestId = req.get('x-request-id')

  if (
    providedRequestId &&
    requestIdPattern.test(providedRequestId)
  ) {
    return providedRequestId
  }

  return randomUUID()
}

export const requestIdHandler = (req, res, next) => {
  const requestId = getRequestId(req)

  req.id = requestId
  res.setHeader('x-request-id', requestId)

  next()
}
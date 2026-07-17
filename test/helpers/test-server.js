export const startTestServer = app => {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1')

    server.once('listening', () => resolve(server))
    server.once('error', reject)
  })
}

export const stopTestServer = server => {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

export const getTestServerUrl = server => {
  const address = server.address()

  if (!address || typeof address === 'string') {
    throw new Error('Could not determine test server address')
  }

  return `http://127.0.0.1:${address.port}`
}
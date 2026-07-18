import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  failOnErrors: true,

  definition: {
    openapi: '3.0.3',

    info: {
      title: 'MedInfo – Entlassungsmanagement API',
      version: '1.0.0',
      description:
        'REST-API für das Entlassungsmanagement und die Verwaltung von Patienten'
    },

    servers: [
      {
        url: '/',
        description: 'Aktuell verwendeter API-Server'
      }
    ],

    tags: [
      {
        name: 'System',
        description: 'Status und Erreichbarkeit der Anwendung'
      },
      {
        name: 'Patients',
        description: 'Verwaltung von Patienten'
      }
    ],

    components: {
      parameters: {
        RequestId: {
          name: 'x-request-id',
          in: 'header',
          required: false,
          description:
            'Optionale Korrelations-ID; wird ansonsten vom Server erzeugt',
          schema: {
            type: 'string',
            maxLength: 100,
            pattern:
              '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$',
            example: 'swagger-test-123'
          }
        }
      },

      schemas: {
        CreatePatientRequest: {
          type: 'object',
          additionalProperties: false,
          required: [
            'familyName'
          ],
          properties: {
            familyName: {
              type: 'string',
              minLength: 1,
              example: 'Mustermann'
            },
            givenName: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1
              },
              example: [
                'Erika'
              ]
            },
            birthDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '1990-01-01'
            }
          }
        },

        UpdatePatientRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            familyName: {
              type: 'string',
              minLength: 1,
              example: 'Musterfrau'
            },
            givenName: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1
              },
              example: [
                'Erika',
                'Maria'
              ]
            },
            birthDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '1990-01-01'
            }
          }
        },

        Patient: {
          type: 'object',
          additionalProperties: false,
          required: [
            'patientId',
            'familyName',
            'givenName',
            'birthDate',
            'createdAt',
            'updatedAt'
          ],
          properties: {
            patientId: {
              type: 'string',
              format: 'uuid',
              example:
                'a38e7f0a-69f0-4ab8-b668-e446730bc220'
            },
            familyName: {
              type: 'string',
              example: 'Mustermann'
            },
            givenName: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: [
                'Erika'
              ]
            },
            birthDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '1990-01-01'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-07-18T12:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-07-18T12:00:00.000Z'
            }
          }
        },

        PatientResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'data'
          ],
          properties: {
            data: {
              $ref: '#/components/schemas/Patient'
            }
          }
        },

        Pagination: {
          type: 'object',
          additionalProperties: false,
          required: [
            'page',
            'limit',
            'totalItems',
            'totalPages',
            'hasPreviousPage',
            'hasNextPage'
          ],
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 20
            },
            totalItems: {
              type: 'integer',
              minimum: 0,
              example: 1
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              example: 1
            },
            hasPreviousPage: {
              type: 'boolean',
              example: false
            },
            hasNextPage: {
              type: 'boolean',
              example: false
            }
          }
        },

        PatientListResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'data',
            'meta'
          ],
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Patient'
              }
            },
            meta: {
              type: 'object',
              additionalProperties: false,
              required: [
                'pagination'
              ],
              properties: {
                pagination: {
                  $ref: '#/components/schemas/Pagination'
                }
              }
            }
          }
        },

        ErrorResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'error'
          ],
          properties: {
            error: {
              type: 'object',
              additionalProperties: false,
              required: [
                'code',
                'message',
                'requestId'
              ],
              properties: {
                code: {
                  type: 'string',
                  example: 'PATIENT_NOT_FOUND'
                },
                message: {
                  type: 'string',
                  example: 'Patient wurde nicht gefunden'
                },
                requestId: {
                  type: 'string',
                  example:
                    '87fdb42a-5112-45de-8908-26fa047bf080'
                }
              }
            }
          }
        },

        StatusResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'status'
          ],
          properties: {
            status: {
              type: 'string',
              enum: [
                'ok'
              ],
              example: 'ok'
            }
          }
        },

        ReadinessResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'status',
            'checks'
          ],
          properties: {
            status: {
              type: 'string',
              enum: [
                'ready',
                'not_ready'
              ],
              example: 'ready'
            },
            checks: {
              type: 'object',
              additionalProperties: false,
              required: [
                'database'
              ],
              properties: {
                database: {
                  type: 'string',
                  enum: [
                    'up',
                    'down'
                  ],
                  example: 'up'
                }
              }
            }
          }
        }
      },

      responses: {
        RateLimitExceeded: {
          description: 'Zu viele Requests',
          headers: {
            'Retry-After': {
              description:
                'Sekunden bis ein erneuter Request möglich ist',
              schema: {
                type: 'integer'
              }
            },
            RateLimit: {
              description:
                'Aktueller Zustand des Request-Limits',
              schema: {
                type: 'string'
              }
            }
          },
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      },
    }
  },

  apis: [
    './src/routes/system.routes.js',
    './src/modules/patients/patient.routes.js'
  ]
}

export const swaggerSpecification = swaggerJsdoc(options)
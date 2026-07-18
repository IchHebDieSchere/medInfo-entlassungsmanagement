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
        url: 'http://localhost:3000',
        description: 'Lokale Entwicklungsumgebung'
      }
    ],

    tags: [
      {
        name: 'Patients',
        description: 'Verwaltung von Patienten'
      },
      {
        name: 'System',
        description: 'Status und Erreichbarkeit der Anwendung'
      }
    ],

    components: {
      schemas: {
        CreatePatientRequest: {
          type: 'object',

          required: ['familyName'],

          properties: {
            familyName: {
              type: 'string',
              example: 'Mustermann'
            },

            givenName: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Erika']
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

          properties: {
            familyName: {
              type: 'string',
              example: 'Musterfrau'
            },

            givenName: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Erika', 'Maria']
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

          properties: {
            patientId: {
              type: 'string',
              format: 'uuid',
              example: 'a38e7f0a-69f0-4ab8-b668-e446730bc220'
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
              example: ['Erika']
            },

            birthDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '1990-01-01'
            },

            createdAt: {
              type: 'string',
              format: 'date-time'
            },

            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        ErrorResponse: {
          type: 'object',

          properties: {
            message: {
              type: 'string',
              example: 'Patient wurde nicht gefunden'
            }
          }
        }
      }
    }
  },

  apis: ['./src/modules/patients/patient.routes.js']
}

export const swaggerSpecification = swaggerJsdoc(options)
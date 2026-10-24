/**
 * Swagger / OpenAPI configuration.
 * Served at GET /api/docs
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { PORT } from './index.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Swan Digital Solutions - Lead Management System API',
      version: '1.0.0',
      description:
        'REST API for the Swan LMS. Authenticate via cookie-based JWT. All responses follow a consistent envelope: { success, data, meta }.',
      contact: { name: 'Swan Digital Solutions', email: 'dev@swandigitalsolutions.com' },
    },
    servers: [
      { url: `http://localhost:${PORT}/api/v1`, description: 'Local development' },
      { url: 'https://api.swandigitalsolutions.com/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

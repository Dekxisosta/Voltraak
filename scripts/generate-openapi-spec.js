#!/usr/bin/env node

/**
 * OpenAPI 3.0 Specification Generator for Voltraak IMS
 * 
 * Generates a complete OpenAPI specification from the API contracts
 * Usage: node scripts/generate-openapi-spec.js [output-file]
 */

const fs = require('fs');
const path = require('path');

// Base OpenAPI 3.0 specification
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Voltraak Inventory Management System API',
    description: 'Comprehensive REST API for inventory management, procurement, and reporting for WalangBrownout Appliances',
    version: '1.0.0',
    contact: {
      name: 'Voltraak Development Team',
      email: 'dev@voltraak.com'
    },
    license: {
      name: 'Proprietary',
      url: 'https://voltraak.com/license'
    }
  },
  servers: [
    {
      url: 'https://api.voltraak.com/api',
      description: 'Production server'
    },
    {
      url: 'https://staging-api.voltraak.com/api',
      description: 'Staging server'
    },
    {
      url: 'http://localhost:8000/api',
      description: 'Development server'
    }
  ],
  security: [
    {
      bearerAuth: []
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login'
      }
    },
    schemas: {},
    responses: {},
    parameters: {}
  },
  paths: {},
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management'
    },
    {
      name: 'Products',
      description: 'Product catalog management'
    },
    {
      name: 'Batches',
      description: 'Batch tracking and expiry management'
    },
    {
      name: 'Stock Transactions',
      description: 'Inventory movements and adjustments'
    },
    {
      name: 'Physical Counts',
      description: 'Cycle counting and variance analysis'
    },
    {
      name: 'Suppliers',
      description: 'Supplier management'
    },
    {
      name: 'Purchase Orders',
      description: 'Purchase order lifecycle'
    },
    {
      name: 'Procurement',
      description: 'Reorder points and procurement requests'
    },
    {
      name: 'Reporting',
      description: 'Analytics and business intelligence'
    },
    {
      name: 'Users',
      description: 'User management and administration'
    }
  ]
};

// Common schema components
const commonSchemas = {
  Error: {
    type: 'object',
    required: ['success', 'message', 'timestamp'],
    properties: {
      success: {
        type: 'boolean',
        example: false
      },
      message: {
        type: 'string',
        example: 'An error occurred'
      },
      errors: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      },
      timestamp: {
        type: 'string',
        format: 'date-time'
      }
    }
  },
  SuccessResponse: {
    type: 'object',
    required: ['success', 'timestamp'],
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string'
      },
      data: {
        type: 'object'
      },
      timestamp: {
        type: 'string',
        format: 'date-time'
      }
    }
  },
  PaginationMeta: {
    type: 'object',
    properties: {
      current_page: {
        type: 'integer',
        example: 1
      },
      last_page: {
        type: 'integer',
        example: 10
      },
      per_page: {
        type: 'integer',
        example: 15
      },
      total: {
        type: 'integer',
        example: 150
      },
      from: {
        type: 'integer',
        example: 1
      },
      to: {
        type: 'integer',
        example: 15
      }
    }
  }
};

// Authentication endpoints
const authPaths = {
  '/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'User authentication',
      description: 'Authenticate user credentials and return JWT token',
      security: [], // No authentication required
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'manager@voltraak.com'
                },
                password: {
                  type: 'string',
                  minLength: 6,
                  example: 'password123'
                },
                remember: {
                  type: 'boolean',
                  default: false
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          token: { type: 'string' },
                          api_token: { type: 'string' },
                          expires_in: { type: 'integer' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '401': {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        '422': {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },
  '/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'User logout',
      description: 'Invalidate current session and revoke tokens',
      responses: {
        '200': {
          description: 'Logout successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        }
      }
    }
  },
  '/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current user',
      description: 'Retrieve authenticated user profile',
      responses: {
        '200': {
          description: 'User profile retrieved',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/User' }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  }
};

// Product management endpoints
const productPaths = {
  '/inventory/products': {
    get: {
      tags: ['Products'],
      summary: 'List products',
      description: 'Retrieve paginated list of products with filtering',
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, default: 1 }
        },
        {
          name: 'per_page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 15 }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Search in name, SKU, description',
          schema: { type: 'string' }
        },
        {
          name: 'category',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'low_stock',
          in: 'query',
          schema: { type: 'boolean' }
        }
      ],
      responses: {
        '200': {
          description: 'Products retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          products: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Product' }
                          },
                          pagination: { $ref: '#/components/schemas/PaginationMeta' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Products'],
      summary: 'Create product',
      description: 'Create new product with inventory settings',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateProductRequest' }
          }
        }
      },
      responses: {
        '201': {
          description: 'Product created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          product: { $ref: '#/components/schemas/Product' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  }
};

// Data model schemas
const dataSchemas = {
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      name: { type: 'string', example: 'John Manager' },
      email: { type: 'string', format: 'email', example: 'manager@voltraak.com' },
      role: { 
        type: 'string', 
        enum: ['warehouse', 'inventory_staff', 'manager'],
        example: 'manager' 
      },
      role_display: { type: 'string', example: 'Manager' },
      department: { type: 'string', nullable: true, example: 'Operations' },
      is_active: { type: 'boolean', example: true },
      last_login_at: { type: 'string', format: 'date-time', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  Product: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      name: { type: 'string', example: 'Samsung Refrigerator 21cu' },
      sku: { type: 'string', example: 'SAMSUNG-RF21' },
      description: { type: 'string', nullable: true },
      category: { type: 'string', example: 'Appliances' },
      unit_price: { type: 'number', example: 25990.00 },
      cost_price: { type: 'number', nullable: true, example: 20000.00 },
      current_stock: { type: 'integer', example: 15 },
      available_stock: { type: 'integer', example: 12 },
      reserved_stock: { type: 'integer', example: 3 },
      reorder_point: { type: 'integer', example: 5 },
      reorder_quantity: { type: 'integer', example: 20 },
      stock_status: { 
        type: 'string', 
        enum: ['in_stock', 'low_stock', 'out_of_stock', 'critical'],
        example: 'in_stock'
      },
      is_seasonal: { type: 'boolean', example: false },
      seasonal_months: { 
        type: 'array', 
        items: { type: 'integer', minimum: 1, maximum: 12 },
        nullable: true
      },
      storage_location: { type: 'string', nullable: true, example: 'A1-B2' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  CreateProductRequest: {
    type: 'object',
    required: ['name', 'sku', 'category', 'unit_price'],
    properties: {
      name: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 255,
        example: 'Samsung Refrigerator 21cu'
      },
      sku: { 
        type: 'string', 
        pattern: '^[A-Z0-9-]+$',
        example: 'SAMSUNG-RF21'
      },
      description: { type: 'string', maxLength: 1000, nullable: true },
      category: { type: 'string', maxLength: 100, example: 'Appliances' },
      unit_price: { 
        type: 'number', 
        minimum: 0, 
        multipleOf: 0.01,
        example: 25990.00
      },
      cost_price: { 
        type: 'number', 
        minimum: 0, 
        nullable: true,
        example: 20000.00
      },
      storage_location: { type: 'string', maxLength: 50, nullable: true },
      is_seasonal: { type: 'boolean', default: false },
      seasonal_months: { 
        type: 'array', 
        items: { type: 'integer', minimum: 1, maximum: 12 }
      },
      reorder_point: { type: 'integer', minimum: 0, default: 10 },
      reorder_quantity: { type: 'integer', minimum: 0, default: 50 }
    }
  },
  Batch: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      product_id: { type: 'integer', example: 1 },
      batch_number: { type: 'string', example: 'BATCH-2024-001' },
      quantity: { type: 'integer', example: 50 },
      available_quantity: { type: 'integer', example: 45 },
      reserved_quantity: { type: 'integer', example: 5 },
      manufacture_date: { type: 'string', format: 'date', example: '2024-01-10' },
      expiry_date: { type: 'string', format: 'date', example: '2025-01-10' },
      status: { 
        type: 'string', 
        enum: ['safe', 'warning', 'expired'],
        example: 'safe'
      },
      days_to_expiry: { type: 'integer', example: 350 },
      supplier_batch_code: { type: 'string', nullable: true },
      storage_location: { type: 'string', nullable: true },
      received_at: { type: 'string', format: 'date-time' }
    }
  }
};

// Combine all schemas
openApiSpec.components.schemas = {
  ...commonSchemas,
  ...dataSchemas
};

// Combine all paths
openApiSpec.paths = {
  ...authPaths,
  ...productPaths
};

// Common error responses
openApiSpec.components.responses = {
  UnauthorizedError: {
    description: 'Authentication required',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  },
  ForbiddenError: {
    description: 'Insufficient permissions',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  },
  NotFoundError: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  },
  ValidationError: {
    description: 'Validation failed',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  }
};

// Generate the specification file
function generateSpec() {
  const outputFile = process.argv[2] || 'docs/API-Contracts/openapi.yaml';
  const yaml = require('js-yaml');
  
  try {
    const yamlString = yaml.dump(openApiSpec, {
      indent: 2,
      lineWidth: 120,
      noRefs: false
    });
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, yamlString);
    console.log(`OpenAPI specification generated: ${outputFile}`);
    
    // Also generate JSON version
    const jsonFile = outputFile.replace('.yaml', '.json');
    fs.writeFileSync(jsonFile, JSON.stringify(openApiSpec, null, 2));
    console.log(`OpenAPI specification generated: ${jsonFile}`);
    
  } catch (error) {
    console.error('Error generating OpenAPI spec:', error);
    process.exit(1);
  }
}

// Generate Swagger UI HTML
function generateSwaggerUI() {
  const swaggerHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Voltraak IMS API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: './openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.presets.standalone
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: "StandaloneLayout"
    });
  </script>
</body>
</html>`;

  fs.writeFileSync('docs/API-Contracts/swagger-ui.html', swaggerHtml);
  console.log('Swagger UI generated: docs/API-Contracts/swagger-ui.html');
}

// Check if js-yaml is available
try {
  require('js-yaml');
  generateSpec();
  generateSwaggerUI();
} catch (error) {
  console.error('js-yaml package not found. Installing...');
  console.log('Please run: npm install js-yaml');
  console.log('Then run this script again.');
  
  // Generate JSON version without YAML
  const outputFile = process.argv[2] || 'docs/API-Contracts/openapi.json';
  const outputDir = path.dirname(outputFile);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(openApiSpec, null, 2));
  console.log(`OpenAPI JSON specification generated: ${outputFile}`);
  generateSwaggerUI();
}
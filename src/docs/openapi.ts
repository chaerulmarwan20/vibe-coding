export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "vibe-coding API",
    version: "1.0.0",
    description:
      "API manajemen user & session authentication. Register, login, lihat user saat ini, dan logout dengan Bearer token.",
  },
  servers: [{ url: "http://localhost:3000", description: "Development" }],
  tags: [
    { name: "Users", description: "Registrasi & autentikasi user" },
    { name: "Health", description: "Health check server & database" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        description: "Token session (UUID v4) dari endpoint login",
      },
    },
    schemas: {
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", maxLength: 255, example: "Budi" },
          email: {
            type: "string",
            maxLength: 255,
            example: "budi@example.com",
          },
          password: { type: "string", maxLength: 255, example: "rahasia" },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "budi@example.com" },
          password: { type: "string", example: "rahasia" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Budi" },
          email: { type: "string", example: "budi@example.com" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      HealthStatus: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          database: { type: "string", example: "connected" },
          uptime: { type: "number", example: 12.34 },
        },
      },
    },
  },
  paths: {
    "/api/users": {
      post: {
        tags: ["Users"],
        summary: "Registrasi user baru",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Registrasi sukses",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { type: "string", example: "OK" } },
                },
                example: { data: "OK" },
              },
            },
          },
          "400": {
            description:
              "Validasi gagal (field kosong, format email salah, melebihi 255 karakter, atau email sudah terdaftar)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                examples: {
                  "Field kosong": {
                    value: { error: "Name, email, dan password wajib diisi" },
                  },
                  "Format email salah": {
                    value: { error: "Format email tidak valid" },
                  },
                  "Name kepanjangan": {
                    value: { error: "Name maksimal 255 karakter" },
                  },
                  "Email kepanjangan": {
                    value: { error: "Email maksimal 255 karakter" },
                  },
                  "Password kepanjangan": {
                    value: { error: "Password maksimal 255 karakter" },
                  },
                  "Email sudah terdaftar": {
                    value: { error: "Email sudah terdaftar" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Kesalahan internal",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                example: { error: "Terjadi kesalahan internal" },
              },
            },
          },
        },
      },
    },
    "/api/users/login": {
      post: {
        tags: ["Users"],
        summary: "Login, mengembalikan token session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login sukses, berisi token session UUID v4",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "string",
                      example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                  },
                },
                example: {
                  data: "550e8400-e29b-41d4-a716-446655440000",
                },
              },
            },
          },
          "400": {
            description: "Email atau password kosong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                example: { error: "Email dan password wajib diisi" },
              },
            },
          },
          "401": {
            description: "Email atau password salah",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                example: { error: "Email atau Password salah" },
              },
            },
          },
          "500": {
            description: "Kesalahan internal",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                example: { error: "Terjadi kesalahan internal" },
              },
            },
          },
        },
      },
    },
    "/api/users/current": {
      get: {
        tags: ["Users"],
        summary: "Data user yang sedang login",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Data user saat ini",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/User" },
                  },
                },
                example: {
                  data: {
                    id: 1,
                    name: "Budi",
                    email: "budi@example.com",
                    created_at: "2026-09-29T02:00:00.000Z",
                  },
                },
              },
            },
          },
          "401": {
            description: "Token tidak ada atau tidak valid",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                example: { error: "Unauthorized" },
              },
            },
          },
          "500": {
            description: "Kesalahan internal",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                example: { error: "Terjadi kesalahan internal" },
              },
            },
          },
        },
      },
    },
    "/api/users/logout": {
      delete: {
        tags: ["Users"],
        summary: "Logout, hapus session token",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Logout sukses",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { type: "string", example: "OK" } },
                },
                example: { data: "OK" },
              },
            },
          },
          "401": {
            description: "Token tidak ada atau tidak valid",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                example: { error: "Unauthorized" },
              },
            },
          },
          "500": {
            description: "Kesalahan internal",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
                example: { error: "Terjadi kesalahan internal" },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check server & koneksi database",
        responses: {
          "200": {
            description: "Server sehat, database terhubung",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthStatus" },
                example: {
                  status: "ok",
                  database: "connected",
                  uptime: 12.34,
                },
              },
            },
          },
          "503": {
            description: "Server jalan tapi database tidak terhubung",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthStatus" },
                example: {
                  status: "ok",
                  database: "unreachable",
                  uptime: 12.34,
                },
              },
            },
          },
        },
      },
    },
  },
};

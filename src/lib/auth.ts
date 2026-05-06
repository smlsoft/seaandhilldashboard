import { betterAuth } from "better-auth";
import { createClient } from "@libsql/client";
import { LibsqlDialect } from "kysely-libsql";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

// Local dev: file:./auth.db | Production (Turso): uses TURSO_DATABASE_URL
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./auth.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  database: {
    dialect: new LibsqlDialect({ client }),
    type: "sqlite",
  },
  user: {
    additionalFields: {
      allowed_branches: {
        type: "string",
        required: false,
        defaultValue: "[]",
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!allowedEmails.includes(user.email)) {
            throw new Error("ไม่มีสิทธิ์เข้าถึงระบบนี้");
          }
          return { data: user };
        },
      },
    },
  },
});

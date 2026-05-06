import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const sqlite = new Database("./auth.db");

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  database: sqlite,
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

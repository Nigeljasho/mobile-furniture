import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
dotenv.config();

import { connectDB } from "./config/db";
import { httpLogger, logger } from "./utils/logger";

import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import cartRoutes from "./routes/cart.routes";
import mpesaRoutes from "./routes/mpesa.routes";
import orderRoutes from "./routes/order.routes";
import produRoutes from "./routes/product.routes";
import reviewRoutes from "./routes/review.routes";
import testRoutes from "./routes/test.routes";
import userRoutes from "./routes/user.routes";

const app = express();
app.use(express.json());

// Log ALL incoming requests FIRST
app.use((req, res, next) => {
  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logger.info(`🌐 INCOMING REQUEST: ${req.method} ${req.url}`);
  logger.info(`🌐 Full path: ${req.path}`);
  logger.info(`🌐 Origin: ${req.headers.origin}`);
  logger.info(`🌐 User-Agent: ${req.headers["user-agent"]}`);
  if (req.body && Object.keys(req.body).length > 0) {
    logger.info(`🌐 Body: ${JSON.stringify(req.body)}`);
  }
  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  next();
});

app.use(
  cors({
    origin: "*",
  }),
);
app.use(httpLogger);

//routes
const apiVersion = `/api/${process.env.API_VERSION || "v1"}`;

app.use(`${apiVersion}/auth`, authRoutes);
app.use(`${apiVersion}/products`, produRoutes);
app.use(`${apiVersion}/cart`, cartRoutes);
app.use(`${apiVersion}/order`, orderRoutes);
app.use(`${apiVersion}/review`, reviewRoutes);
app.use(`${apiVersion}/mpesa`, mpesaRoutes);
app.use(`${apiVersion}/users`, userRoutes);
app.use(`${apiVersion}/admin`, adminRoutes);
app.use(`${apiVersion}/test`, testRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  logger.info("🏥 HEALTH CHECK REQUEST RECEIVED");
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    testMode: process.env.TEST_MODE === "true",
    message: "Server is running!",
  });
});

app.get(`${apiVersion}/health`, (req, res) => {
  logger.info("🏥 HEALTH CHECK REQUEST RECEIVED (API v1)");
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    testMode: process.env.TEST_MODE === "true",
    message: "Server is running!",
  });
});

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(Number(PORT), "0.0.0.0", () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API base path: ${apiVersion}`);

      // Test mode indicator
      if (process.env.TEST_MODE === "true") {
        logger.info(`🧪 🧪 🧪 TEST MODE ENABLED 🧪 🧪 🧪`);
        logger.info(`🧪 Payments will auto-complete WITHOUT M-Pesa/ngrok`);
        logger.info(`🧪 Stock will be reduced immediately and stay reduced`);
        logger.info(`🧪 Set TEST_MODE=false in .env to use real M-Pesa`);
      } else {
        const explicitCallback = process.env.MPESA_CALLBACK_URL;
        const fallbackBase = process.env.BASE_URL || "";
        const callbackUrl =
          explicitCallback ||
          `${fallbackBase.replace(/\/+$/, "")}/api/v1/mpesa/callback`;
        logger.info(`🔔 M-Pesa Callback URL: ${callbackUrl}`);
        logger.info(
          `⚠️  Make sure the BASE_URL in .env is accessible from the internet!`,
        );
      }
    });
  })
  .catch((error) => {
    logger.error("DB connection failed", error);
  });

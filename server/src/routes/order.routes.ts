import { Router } from "express";
import {
    cancelOrder,
    calculateShippingCost,
    getBuyersOrders,
    getSellersOrders,
    initiatePayment,
    makeOrder,
    updateStatus,
} from "../controllers/order.controller";
import { authenticate } from "../middleware/auth";
import { schemas, validate } from "../middleware/validator";
import { logger } from "../utils/logger";

const router = Router();

// Log all requests to order routes
router.use((req, res, next) => {
  logger.info(`🎯 ORDER ROUTE HIT: ${req.method} ${req.path}`);
  logger.info(`🎯 Full URL: ${req.originalUrl}`);
  logger.info(`🎯 Body: ${JSON.stringify(req.body)}`);
  next();
});

router.get("/buyer/:id", authenticate, getBuyersOrders);
router.get("/seller/:id", authenticate, getSellersOrders);

// Calculate shipping cost (for cart preview)
router.post("/calculate-shipping", calculateShippingCost);

// new initiate-payment (mpesa only)
router.post(
  "/initiate-payment",
  authenticate,
  validate(schemas.makeOrder),
  initiatePayment,
);

// keep but disabled (returns 405)
router.post("/", authenticate, validate(schemas.makeOrder), makeOrder);

router.put("/:id", authenticate, updateStatus);
router.put("/cancel/:id", authenticate, cancelOrder);

export default router;

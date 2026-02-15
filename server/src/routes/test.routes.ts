import { Router } from "express";
import Cart from "../models/cart.models";
import MpesaTransaction from "../models/mpesa.models";
import Order from "../models/orde.models";
import Product from "../models/product.models";
import { logger } from "../utils/logger";

const router = Router();

const resolveCallbackUrl = () => {
  const explicit = process.env.MPESA_CALLBACK_URL?.trim();
  if (explicit) return explicit;
  const baseUrl = process.env.BASE_URL?.trim() || "";
  return `${baseUrl.replace(/\/+$/, "")}/api/v1/mpesa/callback`;
};

// Manual callback trigger for testing purposes
router.post("/manual-callback/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const tx = await MpesaTransaction.findById(transactionId);

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (tx.status === "success") {
      return res.status(400).json({ message: "Transaction already processed" });
    }

    logger.info(
      `🔧 MANUAL CALLBACK TRIGGERED for transaction ${transactionId}`,
    );

    const meta: any = tx.metadata || {};

    // Check if items exist in metadata
    if (!meta.items || meta.items.length === 0) {
      logger.error("❌ No items found in transaction metadata");
      return res
        .status(400)
        .json({ message: "No items in transaction metadata" });
    }

    logger.info(`📦 Processing ${meta.items.length} items`);

    // Stock was already reduced during payment initiation - update existing order
    logger.info(
      `✅ Stock was already reduced when payment was initiated - updating existing order`,
    );

    // Find the order that was created during payment initiation
    const orderId = tx.order || meta.orderId;
    if (!orderId) {
      logger.error("❌ No order ID found in transaction");
      return res
        .status(400)
        .json({ message: "Order ID not found in transaction" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      logger.error(`❌ Order ${orderId} not found`);
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order payment status to paid
    order.paymentStatus = "paid";
    order.mpesaReceiptNumber = `TEST-${Date.now()}`;
    order.mpesaCheckoutRequestID = tx.checkoutRequestId || null;
    await order.save();

    // Clear user's cart after successful payment
    await Cart.findOneAndDelete({ user: meta.buyerId });

    // Update transaction status to success
    tx.status = "success";
    tx.resultCode = 0;
    tx.resultDesc = "Manual callback - payment successful";
    tx.mpesaReceiptNumber = `TEST-${Date.now()}`;
    await tx.save();

    logger.info(
      `✅ ORDER UPDATED (MANUAL): ${order.orderNumber} | Status: paid`,
    );

    return res.status(200).json({
      success: true,
      message: "Manual callback processed successfully",
      order,
      transaction: tx,
    });
  } catch (error: any) {
    logger.error("❌ Error in manual callback:", error);
    return res.status(500).json({
      error: "Failed to process manual callback",
      details: error.message,
    });
  }
});

// Check callback configuration
router.get("/callback-info", (req, res) => {
  const baseUrl = process.env.BASE_URL;
  const callbackUrl = resolveCallbackUrl();

  return res.json({
    baseUrl,
    mpesaCallbackEnv: process.env.MPESA_CALLBACK_URL || null,
    callbackUrl,
    message: "This is the callback URL that M-Pesa will call",
    note: "Make sure this URL is accessible from the internet (use ngrok for local testing)",
  });
});

// Diagnose transaction and predict what would happen
router.get("/diagnose/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const tx = await MpesaTransaction.findById(transactionId);

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const meta: any = tx.metadata || {};
    const diagnosis: any = {
      transactionId: tx._id,
      status: tx.status,
      amount: tx.amount,
      hasMetadata: !!tx.metadata,
      hasItems: !!(meta.items && meta.items.length > 0),
      itemCount: meta.items?.length || 0,
      items: [],
    };

    // Check each item
    if (meta.items) {
      for (const item of meta.items) {
        const product = await Product.findById(item.product);
        diagnosis.items.push({
          productId: item.product,
          productName: product?.name || "Unknown",
          requestedQuantity: item.quantity,
          currentStock: product?.stock || 0,
          canFulfill: product ? product.stock >= item.quantity : false,
          stockAfterOrder: product ? product.stock - item.quantity : 0,
        });
      }
    }

    // Overall status
    diagnosis.canProcessOrder = diagnosis.items.every((i: any) => i.canFulfill);
    diagnosis.recommendation = diagnosis.canProcessOrder
      ? "✅ Ready to process - call /test/manual-callback/:id"
      : "❌ Cannot process - insufficient stock";

    return res.json(diagnosis);
  } catch (error: any) {
    logger.error("Error in diagnose:", error);
    return res.status(500).json({
      error: "Failed to diagnose transaction",
      details: error.message,
    });
  }
});

export default router;

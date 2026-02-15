import axios from "axios";
import { Buffer } from "buffer";
import { Request, Response } from "express";
import MpesaTransaction from "../models/mpesa.models";
import { logger } from "../utils/logger";
import { getAccessToken } from "./token";

const generateTimestamp = () => {
  return new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
};

const shortCode = process.env.BUSINESS_SHORT_CODE || "174379";
const PASS_KEY = process.env.PASS_KEY;

// ✅ Helper to format phone number for M-Pesa
const formatPhoneNumber = (phone: string): string => {
  // Remove any spaces, dashes, or special characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Remove leading + if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // If starts with 0, replace with 254
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1);
  }

  // If doesn't start with 254, add it
  if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }

  return cleaned;
};

const normalizeAccountReference = (value?: string): string => {
  const cleaned = (value || "FurnitureApp").replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned || "FurnitureApp").slice(0, 12);
};

const normalizeTransactionDesc = (value?: string): string => {
  const cleaned = (value || "Furniture payment")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();
  return (cleaned || "Furniture").slice(0, 13);
};

async function initiatePayment({
  amount,
  products,
  phoneNumber,
  accountReference,
  transactionDesc,
}: {
  amount: number;
  products?: any[];
  phoneNumber: string;
  accountReference?: string;
  transactionDesc?: string;
}) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      logger.error("Failed to retrieve access token");
      throw new Error("Failed to get M-Pesa access token");
    }

    // ✅ Validate and format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    logger.info(
      `📱 Phone number formatted: ${phoneNumber} -> ${formattedPhone}`,
    );

    // ✅ Validate phone number length
    if (formattedPhone.length !== 12) {
      throw new Error(
        `Invalid phone number format: ${formattedPhone}. Must be 12 digits (254XXXXXXXXX)`,
      );
    }

    // ✅ Validate amount (minimum 1 KES)
    const roundedAmount = Math.round(Math.max(1, amount));
    logger.info(`💰 Amount: ${amount} -> ${roundedAmount} KES`);

    const timestamp = generateTimestamp();
    const password = Buffer.from(
      `${shortCode}${PASS_KEY}${timestamp}`,
    ).toString("base64");

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: roundedAmount, // ✅ Use rounded amount
      PartyA: formattedPhone, // ✅ Formatted phone
      PartyB: shortCode,
      PhoneNumber: formattedPhone, // ✅ Formatted phone
      CallBackURL: `${process.env.BASE_URL}/api/v1/mpesa/callback`,
      AccountReference: normalizeAccountReference(accountReference),
      TransactionDesc: normalizeTransactionDesc(transactionDesc),
    };

    logger.info("🚀 M-Pesa STK Push Request:", {
      ...payload,
      Password: "***HIDDEN***",
    });
    logger.info(`🔔 IMPORTANT: Callback URL is ${payload.CallBackURL}`);

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers },
    );

    logger.info("✅ M-Pesa STK Push Response:", response.data);
    return response.data;
  } catch (error: any) {
    logger.error("❌ Error initiating M-Pesa payment:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // ✅ Return error details for debugging
    return {
      error: "Failed to initiate payment",
      details: error.response?.data || error.message,
    };
  }
}

export const mpesaController = {
  initiatePayment,
  async getTransaction(req: Request, res: Response) {
    try {
      const tx = await MpesaTransaction.findById(req.params.id);
      if (!tx)
        return res.status(404).json({ message: "Transaction not found" });
      let order = null;
      if (tx.order) {
        order = await (
          await import("../models/orde.models")
        ).default.findById(tx.order);
      }
      return res.status(200).json({ transaction: tx, order });
    } catch (error) {
      logger.error("Error fetching transaction", error);
      return res.status(500).json({ error: "Failed to fetch transaction" });
    }
  },

  async getTransactions(req: Request, res: Response) {
    try {
      const transactions = await MpesaTransaction.find()
        .sort({ createdAt: -1 })
        .limit(100);
      return res.status(200).json(transactions);
    } catch (error) {
      logger.error("Error fetching transactions", error);
      return res.status(500).json({ error: "Failed to fetch transactions" });
    }
  },
};

import { Request, Response } from "express";
import mongoose from "mongoose";

import Cart from "../models/cart.models";
import Product from "../models/product.models";
import { logger } from "../utils/logger";

const FREE_DELIVERY_THRESHOLD = 50000; // Free delivery for orders above $100
const NORMAL_SHIPPING_FEE = 1500; // Flat shipping fee for orders below the threshold

const calculateShipping = (subtotal: number): number => {
  if (subtotal <= 0) return 0;

  // Free delivery if subtotal is above the threshold
  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    return 0;
  }

  // Otherwise, use normal shipping fee
  return NORMAL_SHIPPING_FEE;
};

const calculateTotals = (items: { price: number; quantity: number }[]) => {
  const subTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const shipping = calculateShipping(subTotal); // Random shipping not exceeding half of subtotal
  const total = subTotal + shipping;
  return { subTotal, shipping, total };
};

export const addToCart = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { productId, price, quantity = 1 } = req.body;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  if (!productId) {
    return res
      .status(400)
      .json({ success: false, message: "Product ID is required" });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Quantity must be a positive number" });
  }

  if (req.user?.role && req.user.role !== "buyer") {
    res.status(403).json({ success: false, message: "Need to be a buyer" });
    return;
  }

  try {
    console.log("🔍 Step 1: Finding product with ID:", productId);
    const product = await Product.findById(productId);
    if (!product) {
      console.log("❌ Product not found:", productId);
      return res
        .status(400)
        .json({ success: false, message: "Product not found" });
    }
    console.log("✅ Product found:", { 
      name: product.name, 
      price: product.price,
      price_type: typeof product.price,
      price_is_valid: typeof product.price === 'number' && !isNaN(product.price)
    });
    
    // Validate price
    if (typeof product.price !== 'number' || isNaN(product.price)) {
      console.error("❌ Product has invalid price:", product.price);
      logger.error("Product price validation failed", { 
        product: productId, 
        price: product.price,
        priceType: typeof product.price 
      });
      return res
        .status(400)
        .json({ success: false, message: "Product has invalid price" });
    }

    console.log("🔍 Step 2: Converting userId to ObjectId:", userId);
    let userObjectId: mongoose.Types.ObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
      console.log("✅ UserId converted:", userObjectId.toString());
    } catch (idErr) {
      console.error("❌ Failed to convert userId to ObjectId:", userId, idErr);
      logger.error("UserId conversion error", { userId, error: idErr });
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID format" });
    }

    console.log("🔍 Step 3: Finding cart for user:", userObjectId.toString());
    let cart = await Cart.findOne({ user: userObjectId });

    if (!cart) {
      console.log("🔍 Step 4: Creating new cart");
      const itemData = {
        product: product._id,
        quantity: qty,
        // Prefer authoritative DB price; fall back to request price if provided
        price: Number(product.price ?? price),
      };
      console.log("📦 Single item data:", {
        product: itemData.product?.toString(),
        quantity: itemData.quantity,
        price: itemData.price,
      });
      
      // Validate item data before creating cart
      if (!itemData.product) {
        throw new Error("Product ID is missing from item");
      }
      if (typeof itemData.price !== 'number' || itemData.price < 0) {
        throw new Error(`Invalid price: ${itemData.price}`);
      }
      if (typeof itemData.quantity !== 'number' || itemData.quantity <= 0) {
        throw new Error(`Invalid quantity: ${itemData.quantity}`);
      }

      const totals = calculateTotals([itemData]);
      console.log("💰 Calculated totals:", totals);
      
      const cartData = {
        user: userObjectId,
        items: [itemData],
        subTotal: totals.subTotal,
        shipping: totals.shipping,
        total: totals.total,
      };
      console.log("🛒 Cart data to save:", {
        user: cartData.user?.toString(),
        items: cartData.items.map(i => ({
          product: i.product?.toString(),
          quantity: i.quantity,
          price: i.price,
        })),
        subTotal: cartData.subTotal,
        shipping: cartData.shipping,
        total: cartData.total,
      });
      
      cart = new Cart(cartData);
      console.log("🛒 New cart instance created");
      console.log("🛒 Cart items after creation:", (cart.items as any).map((item: any) => ({
        product: item.product?.toString?.() || item.product,
        quantity: item.quantity,
        price: item.price,
      })));
    } else {
      // Ensure items array exists
      if (!cart.items || cart.items.length === 0) {
        // Initialize empty array properly for Mongoose
        (cart as any).items = [];
      }

      const itemIndex = cart.items.findIndex(
        (it: any) => it.product?.toString() === product._id.toString(),
      );

      if (itemIndex > -1) {
        // Update existing item
        const item = cart.items[itemIndex];
        if (item) {
          item.quantity = (item.quantity ?? 0) + qty;
          cart.markModified('items');
        }
      } else {
        // Add new item
        const newItem = {
          product: product._id,
          quantity: qty,
          price: Number(product.price),
        };
        console.log("📦 New item to push:", {
          product: newItem.product?.toString(),
          quantity: newItem.quantity,
          price: newItem.price,
        });
        
        // Validate new item
        if (!newItem.product) {
          throw new Error("Product ID is missing from new item");
        }
        if (typeof newItem.price !== 'number' || newItem.price < 0) {
          throw new Error(`Invalid price in new item: ${newItem.price}`);
        }
        
        (cart.items as any).push(newItem);
        cart.markModified('items');
        console.log("✅ New item added to cart");
      }

      const totals = calculateTotals(
        (cart.items as any).map((it: any) => ({
          price: Number(it.price || 0),
          quantity: Number(it.quantity || 0),
        })),
      );
      cart.subTotal = totals.subTotal;
      cart.shipping = totals.shipping;
      cart.total = totals.total;
    }

    console.log("💾 Attempting to save cart...");
    console.log("📋 Final cart before save:", {
      user: (cart as any).user?.toString?.() || (cart as any).user,
      items: (cart as any).items?.map((item: any) => ({
        product: item.product?.toString?.() || item.product,
        quantity: item.quantity,
        price: item.price,
      })),
      subTotal: (cart as any).subTotal,
      shipping: (cart as any).shipping,
      total: (cart as any).total,
    });
    
    try {
      // Validate before saving
      const validationError = cart.validateSync();
      if (validationError) {
        console.error("❌ CART VALIDATION ERROR (Before Save):", validationError);
        logger.error("Cart validation error before save", { 
          errors: validationError.errors 
        });
        throw validationError;
      }
      
      await cart.save();
      console.log("✅ Cart saved successfully");
    } catch (saveErr) {
      console.error("❌ CART SAVE ERROR:", saveErr);
      const saveErrMsg = saveErr instanceof Error ? saveErr.message : String(saveErr);
      logger.error("Cart save failed", { 
        error: saveErrMsg,
        errors: saveErr instanceof mongoose.Error.ValidationError ? saveErr.errors : undefined
      });
      throw saveErr;
    }
    console.log("📥 Populating product details...");
    try {
      await cart.populate("items.product");
      console.log("✅ Cart populated");
    } catch (popErr) {
      console.error("❌ CART POPULATE ERROR:", popErr);
      logger.error("Cart populate failed", { error: popErr });
      throw popErr;
    }
    logger.info("Item added to cart", cart);
    return res
      .status(200)
      .json({ success: true, message: "Item added to cart", cart });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : "";
    
    let validationErrors: any = null;
    if (err instanceof mongoose.Error.ValidationError) {
      validationErrors = Object.entries(err.errors).map(([path, error]) => ({
        path,
        message: error.message,
      }));
    }
    
    logger.error("❌ CART ADD ERROR", { 
      error: errorMsg, 
      stack: errorStack,
      userId,
      productId,
      validationErrors,
      url: req.url,
      method: req.method
    });
    console.error("❌ DETAILED CART ERROR:", {
      message: errorMsg,
      stack: errorStack,
      name: (err as any)?.name,
      userId,
      productId,
      validationErrors,
    });
    
    const statusCode = err instanceof mongoose.Error.ValidationError ? 400 : 500;
    return res.status(statusCode).json({ 
      error: errorMsg,
      message: "Server error", 
      details: errorMsg,
      validationErrors,
      productId,
      timestamp: new Date().toISOString()
    });
  }
};

export const updateCart = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id: productId } = req.params; // ✅ Use 'id' from route parameter
  const { quantity } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!productId || Array.isArray(productId)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  try {
    // ✅ Convert IDs to ObjectId for accurate matching
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const cart = await Cart.findOne({
      user: userObjectId,
      "items.product": productObjectId,
    });
    if (!cart) return res.status(404).json({ message: "Cart item not found" });

    cart.items = cart.items ?? [];
    // ✅ Use toString() for comparison
    const item = cart.items.find((it) => it.product.toString() === productId);
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    item.quantity = Number(quantity);
    const totals = calculateTotals(
      cart.items.map((it) => ({ price: it.price, quantity: it.quantity ?? 0 })),
    );
    cart.subTotal = totals.subTotal;
    cart.shipping = totals.shipping;
    cart.total = totals.total;

    await cart.save();
    await cart.populate("items.product");
    logger.info("Item in cart updated:", cart);
    return res.status(200).json({ success: true, cart });
  } catch (err) {
    logger.error("Failed to update cart item", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const removeItem = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id: productId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!productId || Array.isArray(productId)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const cart = await Cart.findOneAndUpdate(
      { user: userObjectId },
      { $pull: { items: { product: productObjectId } } },
      { new: true },
    ).populate("items.product");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items ?? [];
    const totals = calculateTotals(
      cart.items.map((it) => ({ price: it.price, quantity: it.quantity ?? 0 })),
    );
    cart.subTotal = totals.subTotal;
    cart.shipping = totals.shipping;
    cart.total = totals.total;
    await cart.save();
    logger.info("Item removed from cart");
    return res.status(200).json({ success: true, cart });
  } catch (err) {
    logger.error("Failed to remove item from cart", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const getItems = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const cart = await Cart.findOne({ user: userObjectId }).populate(
      "items.product",
    );
    if (!cart || (Array.isArray(cart.items) && cart.items.length === 0)) {
      return res
        .status(200)
        .json({ success: true, cart: null, message: "No items in cart" });
    }

    return res.status(200).json({ success: true, cart });
  } catch (err) {
    logger.error("Failed to fetch cart items", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

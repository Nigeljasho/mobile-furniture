import { Product, RegisterInput, Review, makeOrder } from "@/types";
import axios from "axios";
import Constants from "expo-constants";

const ApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "https://mobile-furniture.onrender.com/api/v1";

export const api = axios.create({
  baseURL: ApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Add token to requests automatically
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export const registerUser = async (userData: RegisterInput) => {
  try {
    const response = await api.post("/auth/register", userData);
    const data = response.data;
    return {
      token: data.token,
      user: {
        id: data.user._id || data.user.id, // <-- map _id to id
        fullName: data.user.fullName,
        email: data.user.email,
        role: data.user.role,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ERR_NETWORK") {
        throw new Error(
          `Cannot connect to server. Make sure your backend is running on ${ApiUrl}`,
        );
      }
      if (error.response) {
        throw new Error(error.response.data?.message || "Registration failed");
      }
    }
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    const data = response.data;
    return {
      token: data.token,
      user: {
        id: data.user._id || data.user.id, // <-- map _id to id
        fullName: data.user.fullName,
        email: data.user.email,
        role: data.user.role,
        // add other fields if needed
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ERR_NETWORK") {
        throw new Error(
          `Cannot connect to server. Check EXPO_PUBLIC_API_URL and backend status: ${ApiUrl}`,
        );
      }
      if (error.code === "ECONNABORTED") {
        throw new Error(
          "Server took too long to respond. Try again in a few seconds.",
        );
      }
      if (error.response) {
        throw new Error(error.response.data?.message || "Login failed");
      }
    }
    throw error;
  }
};

export const getUserProfile = async (id: string) => {
  const response = await api.get(`/auth/profile/${id}`);
  const data = response.data;
  return {
    id: data._id || data.id, // <-- map _id to id
    fullName: data.fullName,
    email: data.email,
    role: data.role,
    location: data.location,
  };
};

export const addProduct = async (formData: FormData) => {
  try {
    const response = await api.post("/products", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("Add product response:", response.data);
    return response.data;
  } catch (err) {
    console.error("Failed to add product", err);
    if (axios.isAxiosError(err)) {
      throw new Error(err.response?.data?.message || "Failed to add product");
    }
    throw err;
  }
};

export const updateProduct = async (id: string, productData: Product) => {
  try {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  } catch (err) {
    console.error("Failed to update Product", err);
    throw err;
  }
};

export const getProducts = async () => {
  try {
    const response = await api.get("/products");
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error.message;
    }
    throw error;
  }
};

export const getProduct = async (id: string) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error.message;
    }
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch (err) {
    console.error("Failed to delete Product", err);
    throw err;
  }
};

export const updateStock = async (id: string, stock: number) => {
  try {
    const response = await api.put(`/products/${id}/stock`, { stock });
    return response.data;
  } catch (err) {
    console.error("Failed to update stock", err);
    throw err;
  }
};

export const getProductListing = async (sellerId: string) => {
  try {
    // Make sure the parameter name matches your backend route
    const response = await api.get(`/products/listing/${sellerId}`);
    return response.data.listings || [];
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error.message;
    }
    throw error;
  }
};

export const addToCart = async (payload: {
  productId: string;
  quantity: number;

}) => {
  try {
    const cartPayload = {
          productId: payload.productId,
          quantity: payload.quantity,
        
    };

  console.log("✅ Using test-proven payload:", JSON.stringify(cartPayload, null, 2));
    // Backend extracts userId from JWT token (req.user.id)
    const response = await api.post("/cart/", cartPayload);
    return response.data;
  } catch (err) {
    console.error("Failed to add product to cart", err);
    if (axios.isAxiosError(err)) {
      const errorData = err.response?.data as any;
      const errorMessage = errorData?.details || errorData?.message || "Failed to add to cart";
      console.error("Cart API Error Details:", {
        status: err.response?.status,
        message: errorMessage,
        fullResponse: errorData,
      });
      throw new Error(errorMessage);
    }
    throw err;
  }
};

export const updateCart = async (productId: string, quantity: number) => {
  try {
    const response = await api.put(`/cart/${productId}`, { quantity });
    return response.data; // { success: true, cart }
  } catch (err) {
    console.error("Failed to update cart", err);
    if (axios.isAxiosError(err)) {
      throw new Error(err.response?.data?.message || "Failed to update cart");
    }
    throw err;
  }
};

export const removeFromCart = async (productId: string) => {
  try {
    const response = await api.delete(`/cart/${productId}`);
    return response.data;
  } catch (err) {
    console.error("Failed to remove from cart:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message || "Failed to remove from cart",
      );
    }
    throw err;
  }
};

export const getCart = async () => {
  try {
    const response = await api.get("/cart/");
    return response.data;
  } catch (err) {
    console.error("Failed to get cart:", err);
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) {
        throw new Error("Authentication required");
      }
      throw new Error(err.response?.data?.message || "Failed to get cart");
    }
    throw err;
  }
};

export const addReview = async (data: Review) => {
  try {
    console.log("Sending review to API:", data);
    const res = await api.post("/review/", data);
    console.log("Review API response:", res.data);
    return res.data;
  } catch (err) {
    console.error("Failed to add Review", err);
    if (axios.isAxiosError(err)) {
      throw new Error(err.response?.data?.message || "Failed to add review");
    }
    throw err;
  }
};

export const getReviews = async (sellerId: string) => {
  try {
    const res = await api.get(`/review/seller/${sellerId}`);
    return res.data;
  } catch (err) {
    console.error("Failed to get reviews", err);
    if (axios.isAxiosError(err)) {
      throw new Error(err.response?.data?.message || "Failed to get reviews");
    }
    throw err;
  }
};

export const order = async (payload: makeOrder) => {
  try {
    // Backend extracts userId from JWT token (req.user.id)
    const response = await api.post("/order/initiate-payment", payload);
    return response.data;
  } catch (err) {
    console.error("Failed to make order:", err);
    if (axios.isAxiosError(err)) {
      const message = err.response?.data?.message || "Failed to create order";
      const detail = err.response?.data?.error;
      if (detail) {
        const detailText =
          typeof detail === "string" ? detail : JSON.stringify(detail);
        throw new Error(`${message}: ${detailText}`);
      }
      throw new Error(message);
    }
    throw err;
  }
};

export const getOrder = async (id: string) => {
  try {
    const response = await api.get(`/order/seller/${id}`); // or /order/buyer/${id}
    return response.data;
  } catch (err) {
    console.error("Failed to get orders:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(err.response?.data?.message || "Failed to get orders");
    }
    throw err;
  }
};

export const getOrderById = async (orderId: string) => {
  try {
    const response = await api.get(`/order/${orderId}`);
    return response.data;
  } catch (err) {
    console.error("Failed to get order:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(err.response?.data?.message || "Failed to get order");
    }
    throw err;
  }
};

export const getBuyerOrders = async (buyerId: string) => {
  try {
    const response = await api.get(`/order/buyer/${buyerId}`);
    return response.data;
  } catch (err) {
    console.error("Failed to get buyer orders:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message || "Failed to get buyer orders",
      );
    }
    throw err;
  }
};

export const getSellerOrders = async (sellerId: string) => {
  try {
    const response = await api.get(`/order/seller/${sellerId}`);
    return response.data;
  } catch (err) {
    console.error("Failed to get seller orders:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message || "Failed to get seller orders",
      );
    }
    throw err;
  }
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    const response = await api.put(`/order/${orderId}`, { status });
    return response.data;
  } catch (err) {
    console.error("Failed to update order status:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message || "Failed to update order status",
      );
    }
    throw err;
  }
};

export const updateProductWithImage = async (
  id: string,
  formData: FormData,
) => {
  try {
    const response = await api.put(`/products/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (err) {
    console.error("Failed to update product with image:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message || "Failed to update product",
      );
    }
    throw err;
  }
};
/**
 * Update seller's location (for shipping calculation)
 */
export const updateSellerLocation = async (locationData: {
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
}) => {
  try {
    const response = await api.patch("/users/location", locationData);
    return response.data;
  } catch (err) {
    console.error("Failed to update seller location:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message || "Failed to update location",
      );
    }
    throw err;
  }
};

/**
 * Calculate shipping cost based on product and buyer's delivery city
 */
export const calculateShipping = async (productId: string, buyerCity: string) => {
  try {
    const response = await api.post("/order/calculate-shipping", {
      productId,
      buyerCity,
    });
    return response.data;
  } catch (err) {
    console.error("Failed to calculate shipping:", err);
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message || "Failed to calculate shipping",
      );
    }
    throw err;
  }
};

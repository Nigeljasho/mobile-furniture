import {
    getBuyerOrders,
    getSellerOrders,
    order,
    updateOrderStatus as updateOrderStatusApi
} from "@/SERVICE/api";
import { Order, makeOrder } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;

  // Create order
  createOrder: (orderData: makeOrder) => Promise<Order>;

  // Fetch orders (for seller/buyer)
  fetchOrders: (userId: string, userRole?: "buyer" | "seller") => Promise<void>;

  // Update order status
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;

  // Clear orders
  clearOrders: () => void;

  // Set current order
  setCurrentOrder: (order: Order | null) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,
      isLoading: false,
      error: null,

      createOrder: async (orderData: makeOrder) => {
        set({ isLoading: true, error: null });
        try {
          console.log("📦 Creating order:", orderData);
          const response = await order(orderData);

          if (response.success) {
            const newOrder: Order = {
              ...response.order,
              transactionId:
                response.transactionId ?? response.order?.transactionId,
              transaction: response.transaction ?? response.order?.transaction,
            };

            // Add to orders list
            set((state) => ({
              orders: [newOrder, ...state.orders],
              currentOrder: newOrder,
              isLoading: false,
            }));

            console.log(" Order created successfully:", newOrder.id);
            return newOrder;
          } else {
            throw new Error(response.message || "Failed to create order");
          }
        } catch (err: any) {
          console.error("❌ Failed to create order:", err);
          const errorMessage = err?.message || "Failed to create order";
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw new Error(errorMessage);
        }
      },

      fetchOrders: async (userId: string, userRole?: "buyer" | "seller") => {
        set({ isLoading: true, error: null });
        try {
          console.log(
            "📋 Fetching orders for user:",
            userId,
            "role:",
            userRole,
          );

          const response =
            userRole === "buyer"
              ? await getBuyerOrders(userId)
              : await getSellerOrders(userId);

          const ordersArray = response?.orders || [];

          // Transform orders to ensure consistent structure
          const transformedOrders = ordersArray.map((order: any) => ({
            id: order._id || order.id,
            _id: order._id || order.id,
            orderNumber: order.orderNumber,

            buyer: (() => {
              if (typeof order.buyer === "string") return order.buyer;
              if (order.buyer && typeof order.buyer === "object") {
                const buyerId =
                  order.buyer._id || order.buyer.id || order.buyer.buyerId;
                const buyerName = order.buyer.name || order.buyer.fullName;
                const buyerEmail = order.buyer.email;

                // If we only have an id-like object, keep it as string so UI fallback can handle it.
                if (!buyerName && !buyerEmail && buyerId) return String(buyerId);

                return {
                  _id: buyerId || "",
                  name: buyerName,
                  email: buyerEmail,
                };
              }
              return order.buyer;
            })(),
            seller:
              typeof order.seller === "object" && order.seller?._id
                ? order.seller._id
                : order.seller,
            items: order.items || [],
            subTotal: order.subTotal,
            shipping: order.shipping,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            phoneNumber: order.phoneNumber,
            status: order.status,
            shippingInfo: order.shippingInfo,
            mpesaReceiptNumber: order.mpesaReceiptNumber,
            mpesaCheckoutRequestID: order.mpesaCheckoutRequestID,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          }));

          set({
            orders: transformedOrders,
            isLoading: false,
          });

          console.log(` Fetched ${ordersArray.length} orders for ${userRole}`);
        } catch (err: any) {
          console.error("❌ Failed to fetch orders:", err);
          set({
            orders: [],
            error: err?.message || "Failed to fetch orders",
            isLoading: false,
          });
        }
      },

      updateOrderStatus: async (orderId: string, status: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log(`📋 Updating order ${orderId} status to ${status}`);

          // Update backend
          const response = await updateOrderStatusApi(orderId, status);

          // Update local state optimistically
          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === orderId || order._id === orderId
                ? { ...order, status }
                : order,
            ),
            currentOrder:
              state.currentOrder?.id === orderId ||
              state.currentOrder?._id === orderId
                ? { ...state.currentOrder, status }
                : state.currentOrder,
            isLoading: false,
          }));

          console.log(` Order ${orderId} status updated to ${status}`);
        } catch (err: any) {
          console.error("❌ Failed to update order status:", err);
          set({
            error: err?.message || "Failed to update order status",
            isLoading: false,
          });
          throw err;
        }
      },

      clearOrders: () => {
        set({ orders: [], currentOrder: null, error: null });
        console.log("🗑️ Orders cleared");
      },

      setCurrentOrder: (order: Order | null) => {
        set({ currentOrder: order });
        console.log("📌 Current order set:", order?.id);
      },
    }),
    {
      name: "order_store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        orders: state.orders,
        currentOrder: state.currentOrder,
      }),
      version: 1,
    },
  ),
);

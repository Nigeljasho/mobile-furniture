import { api } from "@/SERVICE/api";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useOrderStore } from "@/stores/orderStore";
import { useProductStore } from "@/stores/productStore";
import { makeOrder, Order } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type CartItem = {
  id: string;
  name: string;
  price: string;
  image: any;
  quantity: number;
};

type CheckoutProps = {
  items?: CartItem[];
  subtotal?: number;
  shipping?: number;
  total?: number;
  onBack?: () => void;
  onRemoveItem?: (id: string) => void;
  onConfirmPayment?: (orderData: any) => void;
};

const Checkout: React.FC<CheckoutProps> = ({
  items = [],
  subtotal = 0,
  shipping = 0,
  total = 0,
  onBack,
  onRemoveItem,
  onConfirmPayment,
}) => {
  const { user } = useAuthStore();
  const {
    items: cartItems,
    clear: clearCart,
    buyerCity,
    shippingCost,
  } = useCartStore();
  const { createOrder, isLoading } = useOrderStore();
  const { fetchProducts } = useProductStore();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [mpesaPhone, setMpesaPhone] = useState("");

  // New state variables
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const handleConfirmPayment = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Please enter your full name");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Validation Error", "Please enter your address");
      return;
    }
    if (!buyerCity.trim()) {
      Alert.alert("Validation Error", "Please enter your city");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Validation Error", "Please enter your phone number");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Validation Error", "Please enter your email");
      return;
    }
    if (!mpesaPhone.trim()) {
      Alert.alert("Validation Error", "Please enter your M-Pesa phone number");
      return;
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex =
      /^(?:254|\+254|0)?([71](?:(?:[01][0-9])|(?:[2-9][0-9]))[0-9]{6})$/;
    if (!phoneRegex.test(mpesaPhone.replace(/\s/g, ""))) {
      Alert.alert(
        "Invalid Phone",
        "Please enter a valid Kenyan phone number (e.g., 0712345678 or 254712345678)",
      );
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      // Format phone number to include country code
      const formattedPhone = mpesaPhone
        .replace(/\s/g, "")
        .replace(/^0/, "254")
        .replace(/^\+/, "");

      const orderData: makeOrder = {
        buyer: user.id,
        items: cartItems.map((item: any) => ({
          product: item.product.id,
          quantity: item.quantity,
        })),
        phoneNumber: formattedPhone,
        paymentMethod: "mpesa",
        shippingInfo: {
          city: buyerCity.trim(),
          address: address.trim(),
        },
      };

      console.log("Creating order with data:", orderData);

      // Create the order
      const newOrder = await createOrder(orderData);

      console.log("Order created successfully:", newOrder);

      // Clear the cart after successful order
      clearCart();

      // Call parent callback with order details
      if (onConfirmPayment) {
        onConfirmPayment({
          order: newOrder,
          shippingDetails: {
            fullName,
            address,
            city: buyerCity,
            phone,
            email,
            mpesaPhone: formattedPhone,
          },
        });
      }

      Alert.alert(
        "Payment Initiated",
        `You will receive an M-Pesa prompt on ${mpesaPhone}. Please complete the payment to confirm your order.`,
        [{ text: "OK" }],
      );

      // Poll transaction status
      const pollTransactionStatus = async (transactionId: string) => {
        const maxAttempts = 30; // 5 minutes
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const response = await api.get(
              `/mpesa/transaction/${transactionId}`,
            );
            const { transaction, order } = response.data;

            if (transaction.status === "success" && order) {
              // Payment confirmed - order was created by backend
              setLastOrder(order);
              setShowCheckout(false);
              setShowReceipt(true);
              // Refresh products to show updated stock
              await fetchProducts();
              return;
            } else if (
              transaction.status === "failed" ||
              transaction.status === "cancelled"
            ) {
              const failureReason =
                transaction.resultDesc ||
                "Your M-Pesa payment was not successful.";
              Alert.alert("Payment Failed", failureReason, [
                {
                  text: "Retry Payment",
                  onPress: () => {
                    setShowCheckout(true);
                    setShowReceipt(false);
                  },
                },
              ]);
              return;
            }
          } catch (err) {
            console.log("Polling transaction status...", err);
          }

          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
        Alert.alert(
          "Payment Timeout",
          "Payment confirmation is taking longer than expected. Please check your transaction status.",
          [{ text: "OK" }],
        );
      };

      // Get transactionId from newOrder
      const transactionId = newOrder.transactionId || newOrder.transaction?.id;

      // Start polling if transactionId is available
      if (transactionId) {
        pollTransactionStatus(transactionId);
      }
    } catch (error: any) {
      console.error("❌ Failed to create order:", error);
      Alert.alert(
        "Order Failed",
        error?.message || "Failed to place order. Please try again.",
        [{ text: "OK" }],
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onBack}
            style={{ padding: 4 }}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={styles.header}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Order Summary */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.orderItemRow}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.orderItemImage}
              />
            ) : (
              <View
                style={[styles.orderItemImage, { backgroundColor: "#eee" }]}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.orderItemName}>
                {item.quantity} x {item.name}
              </Text>
              <Text style={styles.orderItemDesc}>{item.price}</Text>
            </View>
            <TouchableOpacity
              onPress={() => onRemoveItem && onRemoveItem(item.id)}
              disabled={isLoading}
            >
              <Ionicons name="close-circle" size={22} color="#E47272" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Summary */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>KES {subtotal}</Text>
        </View>
        <View style={styles.summaryRow}>
          {/* shipping from cart */}
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>KES {shippingCost}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>KES {total}</Text>
        </View>

        {/* Shipping Details */}
        <Text style={styles.sectionTitle}>Shipping Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={setFullName}
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Street address, building, apartment"
          value={address}
          onChangeText={setAddress}
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter your city"
          value={buyerCity}
          editable={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          editable={!isLoading}
        />

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>M-Pesa</Text>
          <Ionicons name="checkmark" size={20} color="#38E472" />
        </View>
        <Text style={styles.paymentDesc}>
          Please enter your M-Pesa registered phone number below to initiate the
          payment.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 0712345678 or 254712345678"
          value={mpesaPhone}
          onChangeText={setMpesaPhone}
          keyboardType="phone-pad"
          editable={!isLoading}
        />
        <Text style={styles.paymentNote}>
          You will receive an M-Pesa prompt on your phone to complete the
          payment of KES {total}.
        </Text>

        {/* Confirm Payment Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, isLoading && styles.confirmBtnDisabled]}
          onPress={handleConfirmPayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Payment</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FCF9",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 28,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginTop: 8,
    marginBottom: 8,
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E7F3EC",
  },
  orderItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#eee",
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
  },
  orderItemDesc: {
    color: "#7CB798",
    fontSize: 13,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  summaryLabel: {
    color: "#7CB798",
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
  },
  input: {
    backgroundColor: "#E7F3EC",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  paymentLabel: {
    color: "#222",
    fontWeight: "bold",
    fontSize: 15,
    marginRight: 8,
  },
  paymentDesc: {
    color: "#7CB798",
    fontSize: 14,
    marginBottom: 6,
  },
  paymentNote: {
    color: "#7CB798",
    fontSize: 13,
    marginBottom: 10,
  },
  confirmBtn: {
    backgroundColor: "#38E472",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginVertical: 12,
  },
  confirmBtnDisabled: {
    backgroundColor: "#A0D9B4",
    opacity: 0.7,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default Checkout;

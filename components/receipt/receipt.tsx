import { Ionicons } from '@expo/vector-icons';
import * as Print from "expo-print";
import React from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


type CartItem = {
  id: string;
  name: string;
  price: string;
  image: any;
  quantity: number;
};

type ReceiptProps = {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  orderNumber: string;
  deliveryDate: string;
  paymentMethod: string;
  onBackHome: () => void;
};

const Receipt: React.FC<ReceiptProps> = ({
  items,
  subtotal,
  shipping,
  total,
  orderNumber,
  deliveryDate,
  paymentMethod,
  onBackHome,
}) => {
  const handlePrint = async () => {
    try {
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
              h1 { font-size: 20px; margin: 0 0 8px; }
              h2 { font-size: 16px; margin: 16px 0 8px; }
              .muted { color: #666; font-size: 12px; }
              .row { display: flex; justify-content: space-between; margin: 4px 0; }
              .item { border-bottom: 1px solid #eee; padding: 8px 0; }
              .item-name { font-weight: 600; }
            </style>
          </head>
          <body>
            <h1>Order Confirmation</h1>
            <div class="muted">Order #${orderNumber}</div>
            <h2>Order Summary</h2>
            ${items
              .map(
                (item) => `
                  <div class="item">
                    <div class="item-name">${item.name}</div>
                    <div class="muted">Qty: ${item.quantity}</div>
                  </div>
                `,
              )
              .join("")}
            <div class="row"><span>Subtotal</span><strong>Ksh ${subtotal}</strong></div>
            <div class="row"><span>Shipping</span><strong>Ksh ${shipping}</strong></div>
            <div class="row"><span>Total</span><strong>Ksh ${total}</strong></div>
            <h2>Order Details</h2>
            <div class="row"><span>Estimated Delivery</span><strong>${deliveryDate}</strong></div>
            <div class="row"><span>Payment Method</span><strong>${paymentMethod}</strong></div>
          </body>
        </html>
      `;

      if (Platform.OS === "web" && typeof window !== "undefined" && window.print) {
        window.print();
        return;
      }

      await Print.printAsync({ html });
    } catch (err) {
      Alert.alert("Print Failed", "Unable to print the receipt on this device.");
      console.error("Print error:", err);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color="#222" />
          </View>
          <Text style={styles.header}>Order Confirmation</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.successTitle}>Order Submitted Successfully!</Text>
        <Text style={styles.successDesc}>Your order has been successfully submitted. You will receive a confirmation email shortly.</Text>

        {/* Order Summary */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {items.map(item => (
          <View key={item.id} style={styles.orderItemRow}>
            <Image source={item.image} style={styles.orderItemImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.orderItemName}>{item.name}</Text>
              <Text style={styles.orderItemDesc}>Quantity: {item.quantity}</Text>
            </View>
          </View>
        ))}
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>ksh {subtotal}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Shipping</Text><Text style={styles.summaryValue}>ksh {shipping}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total</Text><Text style={styles.summaryValue}>ksh {total}</Text></View>

        {/* Order Details */}
        <Text style={styles.sectionTitle}>Order Details</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Order Number</Text><Text style={styles.detailValue}>#{orderNumber}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Estimated Delivery</Text><Text style={styles.detailValue}>{deliveryDate}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Payment Method</Text><Text style={styles.detailValue}>{paymentMethod}</Text></View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.printBtn}
            onPress={handlePrint}
          >
            <Text style={styles.printBtnText}>Print Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeBtn} onPress={onBackHome}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FCF9',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
            marginTop: 28, // Push header down from the top

  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',

  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDesc: {
    color: '#7CB798',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 8,
    marginBottom: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E7F3EC',
  },
  orderItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },
  orderItemDesc: {
    color: '#7CB798',
    fontSize: 13,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  summaryLabel: {
    color: '#7CB798',
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  detailLabel: {
    color: '#7CB798',
    fontSize: 14,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  printBtn: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginRight: 8,
  },
  printBtnText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 15,
  },
  homeBtn: {
    backgroundColor: '#38E472',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  homeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default Receipt;

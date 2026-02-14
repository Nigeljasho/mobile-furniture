import { calculateShipping } from "@/SERVICE/shippingUtils";
import { useCartStore } from "@/stores/cartStore";
import { useOrderStore } from "@/stores/orderStore";
import { useProductStore } from "@/stores/productStore";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Profile from "../buyerprofile/profile";
import Cart from "../cart/cart";
import Checkout from "../checkout/checkout";
import Receipt from "../receipt/receipt";
import ReviewInterface from "../review-interface/review-interface";

const BuyerInterface = () => {
  const { products, fetchProducts, isLoading } = useProductStore();
  const {
    items: cartItems,
    addItem,
    removeItem,
    subtotal: getSubtotal,
    shippingCost,
    setShippingCost,
  } = useCartStore();
  const { currentOrder } = useOrderStore();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"category" | "price" | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [reviewVisible, setReviewVisible] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Calculate shipping cost whenever cart subtotal changes
  useEffect(() => {
    const subtotal = getSubtotal();
    const newShipping = calculateShipping(subtotal);
    setShippingCost(newShipping);
  }, [cartItems, getSubtotal, setShippingCost]);

  const handleImagePress = (imageUrl: string, productId: string) => {
    setSelectedImage(imageUrl);
    setSelectedProductId(productId);
    setModalVisible(true);
  };

  const handleAddToCart = async (product: any) => {
    try {
      console.log("🛒 Adding product to cart:", {
        product: product.id,
        name: product.name,
        price: product.price,
      });
      await addItem(product, 1);
      console.log("✅ Product added to cart successfully");
    } catch (error: any) {
      console.error("❌ Failed to add product to cart:", {
        error: error?.message || error,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
      });
    }
  };

  const renderProduct = ({ item }: any) => {
    const isInStock = item.stock > 0;
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => handleImagePress(item.image, item.id)}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.cardImage,
                {
                  backgroundColor: "#E7F3EC",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons name="image-outline" size={48} color="#7CB798" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.stockInfo, !isInStock && styles.outOfStock]}>
          {isInStock ? `Stock: ${item.stock}` : "Out of Stock"}
        </Text>
        {/* location */}
        
        <Text style={styles.locationInfo}>{item.sellerLocation.city}</Text>

        <View style={styles.cardRow}>
          <Text style={styles.cardPrice}>
            Ksh {item.price?.toLocaleString()}
          </Text>
          <TouchableOpacity
            onPress={() => handleAddToCart(item)}
            disabled={!isInStock}
          >
            <Text
              style={[styles.addToCart, !isInStock && styles.addToCartDisabled]}
            >
              {isInStock ? "Add to Cart" : "Out of Stock"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Calculate summary values from store
  const subtotal = getSubtotal();
  const total = subtotal + shippingCost;

  // Map cartItems to UI format for Checkout/Receipt
  const uiCartItems = cartItems.map((it) => ({
    id: it.product.id,
    name: it.product.name,
    price: `Ksh ${it.product.price}`,
    image: it.product.image,
    quantity: it.quantity,
  }));

  const handleConfirmPayment = (orderDetails: any) => {
    const order = orderDetails.order;
    const shippingDetails = orderDetails.shippingDetails;

    setLastOrder({
      items: uiCartItems,
      subtotal: order.subTotal || subtotal,
      shipping: order.shipping || shippingCost,
      total: order.total || total,
      orderNumber: order.orderNumber || `#${order.id || order._id}`,
      deliveryDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      paymentMethod: "M-pesa",
      paymentStatus: order.paymentStatus,
      shippingDetails,
      mpesaCheckoutRequestID: order.mpesaCheckoutRequestID,
    });

    setShowCheckout(false);
    setShowReceipt(true);
    console.log("Order completed, showing receipt");
  };

  const handleRemoveFromCheckout = async (productId: string) => {
    try {
      await removeItem(productId);
      console.log("Item removed from checkout");
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  if (showProfile) {
    return <Profile onBack={() => setShowProfile(false)} />;
  }

  if (showReceipt && lastOrder) {
    return (
      <Receipt
        items={lastOrder.items}
        subtotal={lastOrder.subtotal}
        shipping={lastOrder.shipping}
        total={lastOrder.total}
        orderNumber={lastOrder.orderNumber}
        deliveryDate={lastOrder.deliveryDate}
        paymentMethod={lastOrder.paymentMethod}
        onBackHome={() => {
          setShowReceipt(false);
          setLastOrder(null);
          setShowCart(false);
        }}
      />
    );
  }

  if (showCheckout) {
    return (
      <Checkout
        items={uiCartItems}
        subtotal={subtotal}
        shipping={shippingCost}
        total={total}
        onBack={() => setShowCheckout(false)}
        onRemoveItem={handleRemoveFromCheckout}
        onConfirmPayment={handleConfirmPayment}
      />
    );
  }

  if (showCart) {
    return (
      <Cart
        onBack={() => setShowCart(false)}
        onCheckout={() => setShowCheckout(true)}
      />
    );
  }

  // Filtering logic
  let filteredProducts = products.filter((p) => {
    let priceValue = p.price || 0;
    let priceMatch = true;
    if (priceFilter === "0 to 999")
      priceMatch = priceValue >= 0 && priceValue <= 999;
    else if (priceFilter === "1000 to 20000")
      priceMatch = priceValue >= 1000 && priceValue <= 20000;
    else if (priceFilter === "20001 to 29999")
      priceMatch = priceValue >= 20001 && priceValue <= 29999;
    else if (priceFilter === "30000+") priceMatch = priceValue >= 30000;

    const categoryMatch =
      !categoryFilter ||
      p.category?.toLowerCase() === categoryFilter.toLowerCase();
    const searchMatch =
      !search || p.name?.toLowerCase().includes(search.toLowerCase());

    return categoryMatch && priceMatch && searchMatch;
  });

  const renderDropdownOverlay = () => {
    if (!openDropdown) return null;
    let options: string[] = [];
    let onSelect: (option: string) => void = () => {};
    let selected = "";
    if (openDropdown === "category") {
      options = ["All", "tables", "chairs", "desks", "sofas", "cabinets"];
      onSelect = (option) => {
        if (option === "All") setCategoryFilter(null);
        else setCategoryFilter(option);
        setOpenDropdown(null);
      };
      selected = categoryFilter || "All";
    } else if (openDropdown === "price") {
      options = ["All", "0 to 999", "1000 to 20000", "20001 to 29999", "30000+"];
      onSelect = (option) => {
        if (option === "All") setPriceFilter(null);
        else setPriceFilter(option);
        setOpenDropdown(null);
      };
      selected = priceFilter || "All";
    }
    return (
      <Pressable
        style={styles.dropdownOverlay}
        onPress={() => setOpenDropdown(null)}
      >
        <View style={styles.dropdownMenuOverlay}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.dropdownItem,
                selected === option && { backgroundColor: "#E7F3EC" },
              ]}
              onPress={() => onSelect(option)}
            >
              <Text style={styles.dropdownText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    );
  };

  if (isLoading && products.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#38E472" />
        <Text style={{ color: "#7CB798", marginTop: 12 }}>
          Loading products...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dropdown Overlay */}
      {renderDropdownOverlay()}

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons
          name="search"
          size={18}
          color="#7CB798"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for furniture"
          placeholderTextColor="#7CB798"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={{ flex: 1, zIndex: 2 }}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() =>
              setOpenDropdown(openDropdown === "category" ? null : "category")
            }
          >
            <Text style={styles.filterBtnText}>
              {categoryFilter || "Category"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, zIndex: 2 }}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() =>
              setOpenDropdown(openDropdown === "price" ? null : "price")
            }
          >
            <Text style={styles.filterBtnText}>{priceFilter || "Price"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="cart-outline" size={64} color="#E7F3EC" />
          <Text style={{ color: "#7CB798", marginTop: 16, fontSize: 16 }}>
            No products found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{
            paddingBottom: (styles.bottomNav.height || 56) + insets.bottom + 24,
          }}
          scrollIndicatorInsets={{
            bottom: (styles.bottomNav.height || 56) + insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
            {/* Rate Product Button */}
            <TouchableOpacity
              style={styles.rateBtn}
              onPress={() => {
                setReviewVisible(true);
                setModalVisible(false);
              }}
            >
              <Text style={styles.rateBtnText}>Rate Product</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <ReviewInterface
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        productId={selectedProductId || ""}
      />

      {/* Bottom Navigation - wrapped in SafeAreaView for adaptive spacing */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomNavSafeArea}>
        <View style={styles.bottomNav}>
          <Ionicons name="home-outline" size={24} color="#7CB798" />
          <TouchableOpacity
            onPress={() => setShowCart(true)}
            style={{ position: "relative" }}
          >
            <Feather name="shopping-cart" size={24} color="#7CB798" />
            {cartItems.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowProfile(true)}>
            <Ionicons name="person-outline" size={24} color="#7CB798" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const cardWidth = (Dimensions.get("window").width - 24 * 2 - 16) / 2;
const cardImageHeight = 190;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FCF9",
    padding: 24,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F3EC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    marginTop: 28,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterBtn: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E7F3EC",
    marginRight: 8,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  filterBtnText: {
    color: "#7CB798",
    fontWeight: "bold",
    fontSize: 14,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.08)",
    zIndex: 100,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  dropdownMenuOverlay: {
    marginTop: 110,
    minWidth: 180,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 12,
    elevation: 8,
    paddingVertical: 8,
    zIndex: 101,
    alignSelf: "center",
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: "#222",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 14, // Slightly reduced for tighter grid
    width: cardWidth,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    padding: 8,
    // Ensure content never overflows
    minHeight: cardImageHeight + 60,
    justifyContent: "flex-start",
  },
  cardImage: {
    width: "100%",
    height: cardImageHeight,
    borderRadius: 8,
    marginBottom: 6, // Slightly reduced for tighter layout
    backgroundColor: "#eee",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    position: "relative",
  },
  fullImage: {
    width: "100%",
    height: 350,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeBtnText: {
    fontSize: 26,
    color: "#222",
    fontWeight: "bold",
    lineHeight: 28,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 2,
    flexWrap: "wrap",
    textAlign: "left",
  },
  stockInfo: {
    fontSize: 12,
    fontWeight: "600",
    color: "#38E472",
    marginBottom: 8,
    textAlign: "left",
  },
  outOfStock: {
    color: "#e74c3c",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
    gap: 4,
  },
  cardPrice: {
    color: "#7CB798",
    fontWeight: "bold",
    fontSize: 14,
    flexShrink: 1,
    flexWrap: "wrap",
    textAlign: "left",
    maxWidth: cardWidth * 0.6,
  },
  addToCart: {
    color: "#7CB798",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  addToCartDisabled: {
    color: "#bbb",
  },
  // Bottom navigation bar: Responsive padding to avoid overlap with phone navigation bars/home indicators.
  // Uses SafeAreaView for adaptive spacing on all devices (Android/iOS, small/large screens).
  bottomNavSafeArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",

    // No height here; inner bar controls height
  },
  bottomNav: {
    height: 56,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E7F3EC",
    // Responsive bottom padding for nav bar/home indicator
    paddingBottom: Platform.OS === "ios" ? 10 : 16, // iOS: extra for home indicator, Android: for nav bar
    // The SafeAreaView will add more if needed
    marginBottom: -3,
  },
  rateBtn: {
    marginTop: 18,
    backgroundColor: "#38E472",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    alignSelf: "center",
  },
  rateBtnText: {
    color: "#111",
    fontWeight: "bold",
    fontSize: 16,
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#38E472",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    zIndex: 10,
  },
  cartBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  locationInfo: {
    fontSize: 12,
    color: "#7CB798",
    alignSelf: "flex-start",
    },
});

export default BuyerInterface;

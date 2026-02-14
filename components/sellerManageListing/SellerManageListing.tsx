import { useAuthStore } from "@/stores/authStore";
import { useProductStore } from "@/stores/productStore";
import { Product } from "@/types";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ProductEdit from "../product-edit/product-edit";  

type SellerManageListingProps = {
    onClose: () => void;
};

const SellerManageListing = ({ onClose }: SellerManageListingProps) => {
    const { user } = useAuthStore();
    const { fetchSellersListings, products, isLoading, removeProduct } = useProductStore();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);  
    const [showEditModal, setShowEditModal] = useState(false);  
    const hasShownMissingSellerAlert = useRef(false);
    const sellerId = user?.id;

    const showMissingSellerAlert = () => {
        if (hasShownMissingSellerAlert.current) return;
        hasShownMissingSellerAlert.current = true;
        Alert.alert("Logged Out", "You are logged out.");
    };

    useEffect(() => {
        console.log("User object:", user);
        console.log("Seller ID:", sellerId);

        if (sellerId) {
            fetchSellersListings(sellerId);
        } else {
            showMissingSellerAlert();
        }
    }, [sellerId, fetchSellersListings]);
 
    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setShowEditModal(true);
    };

   
    const handleDeleteProduct = (product: Product) => {
        Alert.alert(
            "Delete Product",
            `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeProduct(product.id);
                            Alert.alert("Success", "Product deleted successfully!");
                        } catch (error: any) {
                            Alert.alert("Error", error?.message || "Failed to delete product");
                        }
                    },
                },
            ]
        );
    };

    
    const handleSaveProduct = (updatedProduct: Product) => {
        console.log("Product updated:", updatedProduct);
        // The product store will automatically update the products list
        setShowEditModal(false);
        setSelectedProduct(null);
    };

   
    if (showEditModal && selectedProduct) {
        return (
            <ProductEdit
                product={selectedProduct}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedProduct(null);
                }}
                onSave={handleSaveProduct}
            />
        );
    }

    if (isLoading) {
        return (
            <View
                style={[
                    styles.container,
                    { justifyContent: "center", alignItems: "center" },
                ]}
            >
                <ActivityIndicator size="large" color="#38E472" />
                <Text style={{ color: "#fff", marginTop: 12 }}>
                    Loading your listings...
                </Text>
            </View>
        );
    }

    if (!sellerId) {
        return (
            <View
                style={[
                    styles.container,
                    { justifyContent: "center", alignItems: "center" },
                ]}
            >
                <Text style={{ color: "#B6E2C6", fontSize: 16 }}>
                    Authentication required
                </Text>
                <Text style={{ color: "#7CB798", fontSize: 14, marginTop: 8 }}>
                    Please log in again
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={{ padding: 4 }} onPress={onClose}>
                    <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Listings</Text>
                <View style={{ width: 28 }} />
            </View>

            {products.length === 0 ? (
                <View
                    style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                >
                    <Text style={{ color: "#B6E2C6", fontSize: 16 }}>
                        No listings yet
                    </Text>
                    <Text style={{ color: "#7CB798", fontSize: 14, marginTop: 8 }}>
                        Add your first product to get started
                    </Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    {products.map((item) => (
                        <View key={item.id} style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.status}>
                                    {item.stock && item.stock > 0 ? "Available" : "Out of Stock"}
                                </Text>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.price}>
                                    Ksh {item.price?.toLocaleString()}
                                </Text>
                                {item.stock !== undefined && (
                                    <Text style={styles.stock}>Stock: {item.stock}</Text>
                                )}
                                
                              
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity 
                                        style={styles.editBtn}
                                        onPress={() => handleEditProduct(item)}
                                    >
                                        <Feather name="edit-2" size={16} color="#fff" />
                                        <Text style={styles.editText}>Edit</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteProduct(item)}
                                    >
                                        <Feather name="trash-2" size={16} color="#fff" />
                                        <Text style={styles.deleteText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.image} />
                            ) : (
                                <View
                                    style={[
                                        styles.image,
                                        {
                                            backgroundColor: "#3A4A3D",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        },
                                    ]}
                                >
                                    <Ionicons name="image-outline" size={32} color="#7CB798" />
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#18271B",
        padding: 16,
        paddingTop: 32,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
        justifyContent: "space-between",
        marginTop: 30,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    card: {
        flexDirection: "row",
        backgroundColor: "#223324",
        borderRadius: 14,
        padding: 14,
        marginBottom: 18,
        alignItems: "center",
    },
    status: {
        color: "#B6E2C6",
        fontSize: 13,
        marginBottom: 2,
    },
    name: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 2,
    },
    price: {
        color: "#fff",
        fontSize: 15,
        marginBottom: 4,
    },
    stock: {
        color: "#B6E2C6",
        fontSize: 13,
        marginBottom: 8,
    },
    // ✅ Update action buttons styles
    actionButtons: {
        flexDirection: "row",
        gap: 8,
    },
    editBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#2B4B34",
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    editText: {
        color: "#fff",
        fontSize: 14,
        marginLeft: 6,
    },
    deleteBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#8B4B34",
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    deleteText: {
        color: "#fff",
        fontSize: 14,
        marginLeft: 6,
    },
    image: {
        width: 90,
        height: 90,
        borderRadius: 10,
        marginLeft: 16,
        backgroundColor: "#3A4A3D",
    },
});

export default SellerManageListing;

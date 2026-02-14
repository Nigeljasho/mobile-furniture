import { useAuthStore } from "@/stores/authStore";
import { useOrderStore } from "@/stores/orderStore";
import { Buyer, Order } from "@/types";
import { getUserProfile } from "@/SERVICE/api";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import OrderStatusButtons from "../order-status/order-status-buttons"; 
interface SellerOrdersProps {
	onBack?: () => void;
	onOrderPress?: (order: Order) => void;
}

const SellerOrders: React.FC<SellerOrdersProps> = ({
	onBack,
	onOrderPress,
}) => {
	const { user } = useAuthStore();
	const { orders, isLoading, error, fetchOrders } = useOrderStore();
	const [buyerNamesById, setBuyerNamesById] = useState<Record<string, string>>(
		{},
	);

	useEffect(() => {
		if (user?.id) {
			fetchOrders(user.id, "seller");
		}
	}, [user?.id, fetchOrders]);

	useEffect(() => {
		const loadBuyerNames = async () => {
			const buyerIds = Array.from(
				new Set(
					orders
						.map((order) => {
							const buyer = order.buyer as
								| string
								| (Buyer & { fullName?: string })
								| undefined;

							if (!buyer) return "";
							if (typeof buyer === "string") return buyer.trim();
							if (buyer._id) return buyer._id;
							return "";
						})
						.filter((id) => /^[a-f\d]{24}$/i.test(id) && !buyerNamesById[id]),
				),
			);

			if (buyerIds.length === 0) return;

			try {
				const profiles = await Promise.all(
					buyerIds.map(async (id) => {
						try {
							const profile = await getUserProfile(id);
							return { id, name: profile?.fullName || profile?.email || "" };
						} catch {
							return { id, name: "" };
						}
					}),
				);

				setBuyerNamesById((prev) => {
					const next = { ...prev };
					for (const profile of profiles) {
						if (profile.name) {
							next[profile.id] = profile.name;
						}
					}
					return next;
				});
			} catch {
				// Ignore lookup failures; fallback text will be shown.
			}
		};

		void loadBuyerNames();
	}, [orders, buyerNamesById]);

	const handleRefresh = () => {
		if (user?.id) {
			fetchOrders(user.id, "seller");
		}
	};

	const getStatusColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case "pending":
				return "#FFD600";
			case "confirmed":
			case "paid":
				return "#38E472";
			case "shipped":
				return "#2196F3"; 
			case "delivered":
				return "#4CAF50";
			case "cancelled":
			case "failed":
				return "#FF5722";
			default:
				return "#757575";
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-KE", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const handleStatusUpdate = (orderId: string, newStatus: string) => {
		// Optionally refresh the orders list after status update
		console.log(`Order ${orderId} status updated to ${newStatus}`);

		// Refresh orders to get latest data
		if (user?.id) {
			fetchOrders(user.id, "seller");
		}
	};

	// Add this helper function at the top of your component
	const getBuyerDisplay = (buyer: string | Buyer | undefined): string => {
		if (!buyer) return "N/A";
		if (typeof buyer === "string") {
			// Avoid rendering raw Mongo ObjectId as the customer name.
			const trimmedBuyer = buyer.trim();
			const isObjectId = /^[a-f\d]{24}$/i.test(trimmedBuyer);
			if (isObjectId) return buyerNamesById[trimmedBuyer] || "Unknown customer";
			return trimmedBuyer;
		}
		if (typeof buyer === "object") {
			const fullName = (buyer as Buyer & { fullName?: string }).fullName;
			const buyerId = buyer._id?.trim();
			return (
				buyer.name ||
				fullName ||
				buyer.email ||
				(buyerId ? buyerNamesById[buyerId] : "") ||
				"Unknown customer"
			);
		}
		return "Unknown customer";
	};

	const renderOrderItem = ({ item: order }: { item: Order }) => (
		<View style={styles.orderCard}>
			{/* Order Header */}
			<TouchableOpacity
				style={styles.orderHeader}
				onPress={() => onOrderPress?.(order)}
			>
				<Text style={styles.orderNumber}>
					{order.orderNumber || `#${order.id?.slice(-6)}`}
				</Text>
				<View
					style={[
						styles.statusBadge,
						{
							backgroundColor: getStatusColor(order.status || "pending"),  
						},
					]}
				>
					<Text style={styles.statusText}>
						{(order.status || "pending").toUpperCase()}
					</Text>
				</View>
			</TouchableOpacity>

			<Text style={styles.orderDate}>
				{order.createdAt ? formatDate(order.createdAt) : "Date not available"}
			</Text>

			<View style={styles.orderDetails}>
				<Text style={styles.orderSummary}>
					{/* show the items and name of the buyer */}
					{order.items?.length || 0} item(s) • Customer:{" "}
					{getBuyerDisplay(order.buyer)}
				</Text>
				<Text style={styles.orderTotal}>
					KES {order.total?.toLocaleString() || "0"}
				</Text>
			</View>

			<View style={styles.orderFooter}>
				<Text style={styles.paymentMethod}>
					{order.paymentMethod?.toUpperCase() || "N/A"} -{" "}
					{order.paymentStatus?.toUpperCase() || "PENDING"}
				</Text>
				<Text style={styles.shippingInfo}>
					{order.shippingInfo?.city || "No address"}
				</Text>
			</View>
			<Text style={styles.buyerPhone}>
				Buyer Phone: {order.phoneNumber || "N/A"}
			</Text>

		
			<OrderStatusButtons
				order={order}
				userRole="seller"
				onStatusUpdate={(newStatus) =>
					handleStatusUpdate(order.id || order._id || "", newStatus)
				}
			/>
		</View>
	);

	if (isLoading && orders.length === 0) {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator size="large" color="#38E472" />
				<Text style={styles.loadingText}>Loading orders...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={onBack} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color="#222" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Customer Orders</Text>
				<View style={{ width: 24 }} />
			</View>

			{error ? (
				<View style={styles.centered}>
					<Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : orders.length === 0 ? (
				<View style={styles.centered}>
					<Ionicons name="receipt-outline" size={64} color="#E7F3EC" />
					<Text style={styles.emptyText}>No orders yet</Text>
					<Text style={styles.emptySubtext}>
						Customer orders will appear here
					</Text>
				</View>
			) : (
				<FlatList
					data={orders}
					renderItem={renderOrderItem}
					keyExtractor={(item) => item.id || item._id || ""}
					contentContainerStyle={styles.listContent}
					refreshControl={
						<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
					}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F8FCF9",
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 24,
		paddingTop: 58,
		paddingBottom: 16,
		backgroundColor: "#F8FCF9",
	},
	backButton: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#222",
	},
	listContent: {
		padding: 24,
		paddingBottom: 100,
	},
	orderCard: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "#E7F3EC",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	orderHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	orderNumber: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#222",
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "bold",
		color: "#fff",
	},
	orderDate: {
		fontSize: 14,
		color: "#7CB798",
		marginBottom: 8,
	},
	orderDetails: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	orderSummary: {
		fontSize: 14,
		color: "#666",
		flex: 1,
		marginRight: 8,
	},
	orderTotal: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#222",
	},
	orderFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,  
	},
	paymentMethod: {
		fontSize: 12,
		color: "#7CB798",
	},
	shippingInfo: {
		fontSize: 12,
		color: "#666",
		fontStyle: "italic",
	},
	buyerPhone: {
		fontSize: 12,
		color: "#666",
		marginBottom: 12,
	},
	loadingText: {
		color: "#7CB798",
		marginTop: 12,
		fontSize: 16,
	},
	errorText: {
		color: "#FF5722",
		fontSize: 16,
		textAlign: "center",
		marginTop: 16,
		marginBottom: 16,
	},
	retryButton: {
		backgroundColor: "#38E472",
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	retryText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 16,
	},
	emptyText: {
		color: "#666",
		fontSize: 18,
		fontWeight: "bold",
		marginTop: 16,
	},
	emptySubtext: {
		color: "#7CB798",
		fontSize: 14,
		marginTop: 8,
		textAlign: "center",
	},
});

export default SellerOrders;

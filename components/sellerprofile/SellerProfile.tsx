import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	Image,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const logoutStyles = StyleSheet.create({
	logoutContainer: {
		alignItems: "center",
		marginVertical: 24,
	},
	logoutButton: {
		backgroundColor: "#FF5A5F",
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 8,
	},
	logoutText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 16,
	},
});

const LogoutButton = () => {
	const router = useRouter();
	const { logout } = useAuthStore();
	return (
		<View style={logoutStyles.logoutContainer}>
			<TouchableOpacity
				style={logoutStyles.logoutButton}
				activeOpacity={0.8}
				onPress={() => {
					logout();
					router.replace("/");
				}}
			>
				<Text style={logoutStyles.logoutText}>Logout</Text>
			</TouchableOpacity>
		</View>
	);
};

interface SellerProfileProps {
	onClose: () => void;
}

const SellerProfile: React.FC<SellerProfileProps> = ({ onClose }) => {
	const [shopName, setShopName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [about, setAbout] = useState("");
	const { user, token, getProfile } = useAuthStore();
	const id = user?.id

	useEffect(() => {
		if (!token) return;

		const loadProfile = async () => {
			 if (!id) return;
			try {
				await getProfile(id);
			} catch {
				// Avoid noisy LogBox errors on device; keep UI stable on fetch failure.
			}
		};

		loadProfile();
	}, [token, getProfile, id]);

	// Populate fields when user data is available
	useEffect(() => {
		if (user) {
			setShopName(user.fullName || "");
			setEmail(user.email || "");
		}
	}, [user]);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 120 }}
			>
				{/* Header */}
				<View style={styles.headerRow}>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={26} color="#1B1B1B" />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Profile</Text>
					<View style={{ width: 26 }} />
				</View>

				{/* Avatar and Shop Info */}
				<View style={styles.avatarWrap}>
					<View style={styles.avatarCircle}>
						<Image
							source={require("../../assets/images/avata.jpg")}
							style={styles.avatarImage}
						/>
					</View>
					<Text style={styles.shopTitle}>{user?.fullName || "Seller"}</Text>
					<Text style={styles.shopLocation}>
						{user?.location?.city || "N/A"}
					</Text>
				</View>

				{/* Shop Details */}
				<View style={styles.formWrapper}>
					<Text style={styles.sectionTitle}>Shop Details</Text>

					<TextInput
						style={styles.input}
						placeholder="Shop Name"
						value={shopName}
						onChangeText={setShopName}
						placeholderTextColor="#9DB8A5"
					/>
					<TextInput
						style={styles.input}
						placeholder="Email"
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						placeholderTextColor="#9DB8A5"
					/>
					<TextInput
						style={styles.input}
						placeholder="Phone"
						value={phone}
						onChangeText={setPhone}
						keyboardType="phone-pad"
						placeholderTextColor="#9DB8A5"
					/>
					<TextInput
						style={[styles.input, styles.textArea]}
						placeholder="About Us"
						value={about}
						onChangeText={setAbout}
						multiline
						numberOfLines={4}
						placeholderTextColor="#9DB8A5"
					/>

					{/* Save and Logout Buttons on the same line */}
					<View
						style={{
							flexDirection: "row",
							justifyContent: "flex-end",
							alignItems: "center",
							marginTop: 10,
							marginBottom: 20,
						}}
					>
						<View style={{ marginRight: 12 }}>
							<LogoutButton />
						</View>
						<TouchableOpacity style={styles.saveBtn}>
							<Text style={styles.saveBtnText}>Save Changes</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>

			{/* Bottom Navigation */}
			<View style={styles.bottomNav}>
				<View style={styles.navItem}>
					<TouchableOpacity onPress={onClose}>
					<Ionicons name="home-outline" size={24} color="#7CB798" />
						<Text style={[styles.navText, { color: "#7CB798" }]}>Home</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.navItem}>
					<Ionicons name="person-outline" size={24} color="#1B1B1B" />
					<Text style={styles.navText}>Profile</Text>
				</View>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F8FCF9",
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginHorizontal: 20,
		marginTop: 58,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "600",
		color: "#1B1B1B",
	},
	avatarWrap: {
		alignItems: "center",
		marginTop: 12,
		marginBottom: 24,
	},
	avatarCircle: {
		width: 110,
		height: 110,
		borderRadius: 55,
		backgroundColor: "#4A6548",
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	avatarImage: {
		width: "100%",
		height: "100%",
		borderRadius: 55,
	},
	shopTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1B1B1B",
		marginTop: 8,
	},
	shopLocation: {
		fontSize: 15,
		color: "#7CB798",
		marginTop: 2,
	},
	formWrapper: {
		paddingHorizontal: 20, // ✅ added margin from edges
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: "700",
		marginBottom: 8,
		color: "#1B1B1B",
	},
	input: {
		backgroundColor: "#F0F5F1",
		borderRadius: 8,
		padding: 12,
		fontSize: 15,
		color: "#1B1B1B",
		marginBottom: 12,
	},
	textArea: {
		minHeight: 70,
		textAlignVertical: "top",
	},
	saveBtn: {
		backgroundColor: "#38E472",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		width: "60%",
		alignSelf: "flex-end",
		marginTop: 10,
		marginBottom: 20,
	},
	saveBtnText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 16,
	},
	bottomNav: {
		flexDirection: "row",
		justifyContent: "space-around",
		borderTopWidth: 1,
		borderTopColor: "#E7F3EC",
		backgroundColor: "#fff",
		height: 60,
		alignItems: "center",
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
	},
	navItem: {
		alignItems: "center",
		justifyContent: "center",
	},
	navText: {
		fontSize: 13,
		marginTop: 2,
		color: "#1B1B1B",
	},
});

export default SellerProfile;

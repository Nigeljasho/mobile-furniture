import { useAuthStore } from "@/stores/authStore";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
	Alert,
	Image,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	ToastAndroid,
	TouchableOpacity,
	View,
} from "react-native";
import OrderHistory from "../order-history/order-history";

const LogoutButton: React.FC<{ onLoggedOut?: () => void }> = ({
	onLoggedOut,
}) => {
	const { logout } = useAuthStore();
	return (
		<View style={logoutStyles.logoutContainer}>
			<TouchableOpacity
				style={logoutStyles.logoutButton}
				activeOpacity={0.8}
				onPress={() => {
					logout();
					onLoggedOut?.();
				}}
			>
				<Text style={logoutStyles.logoutText}>Logout</Text>
			</TouchableOpacity>
		</View>
	);
};

interface ProfileProps {
	onBack?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onBack }) => {
	const { user, getProfile } = useAuthStore();
	const [profileImage, setProfileImage] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [showOrderHistory, setShowOrderHistory] = useState(false); 
	const id = user?.id;

	useEffect(() => {
		const profile = async () => {
			if (!id) return;
			try {
				await getProfile(id);
			} catch (err) {
				console.error("Failed to fetch user profile", err);
			}
		};

		if (!user) {
			profile();
		}
	}, [user, getProfile, id]);

	// Populate form fields with user data
	useEffect(() => {
		if (user) {
			setName(user.fullName || "");
			setEmail(user.email || "");
		}
	}, [user]);


	if (showOrderHistory) {
		return <OrderHistory onBack={() => setShowOrderHistory(false)} />;
	}

	// Profile image picker
	const pickImage = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});
		if (!result.canceled && result.assets && result.assets[0].uri) {
			setProfileImage(result.assets[0].uri);
		}
	};

	const saveProfile = () => {
		if (Platform.OS === "android") {
			ToastAndroid.show("Profile updated successfully.", ToastAndroid.SHORT);
		} else {
			Alert.alert("Success", "Profile updated successfully.");
		}
	};

	return (
		<View style={styles.safeArea}>
			<View style={styles.headerRow}>
				<View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
					{onBack && (
						<TouchableOpacity style={styles.backArrow} onPress={onBack}>
							<Feather name="arrow-left" size={24} color="#222" />
						</TouchableOpacity>
					)}
					<View style={{ flex: 1, alignItems: "center" }}>
						<Text style={styles.profileTitle}>Profile</Text>
					</View>
				</View>
			</View>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<TouchableOpacity onPress={pickImage} style={styles.profileImageWrap}>
					<Image
						source={
							profileImage
								? { uri: profileImage }
								: require("../../assets/images/avata.jpg")
						}
						style={styles.profileImage}
					/>
					<View style={styles.editIcon}>
						<Feather name="edit-2" size={16} color="#fff" />
					</View>
				</TouchableOpacity>
				<Text style={styles.profileName}>{user?.fullName}</Text>
				<Text style={styles.profileRole}>Buyer</Text>

				<Text style={styles.sectionTitle}>Personal Information</Text>
				<TextInput
					style={styles.input}
					placeholder="Name"
					value={name}
					onChangeText={setName}
				/>
				<TextInput
					style={styles.input}
					placeholder="Email"
					value={email}
					onChangeText={setEmail}
					keyboardType="email-address"
				/>
				<TextInput
					style={styles.input}
					placeholder="Phone"
					value={phone}
					onChangeText={setPhone}
					keyboardType="phone-pad"
				/>

				<Text style={styles.sectionTitle}>Order History</Text>
				{/*Update this to use real order history */}
				<TouchableOpacity
					style={styles.orderHistoryRow}
					onPress={() => setShowOrderHistory(true)}
				>
					<View style={styles.orderHistoryIcon}>
						<Ionicons name="time-outline" size={20} color="#7CB798" />
					</View>
					<Text style={styles.orderHistoryText}>View Order History</Text>
					<Feather name="chevron-right" size={20} color="#222" />
				</TouchableOpacity>

				<View style={styles.saveBtnWrap}>
					<TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
						<Text style={styles.saveBtnText}>Save</Text>
					</TouchableOpacity>
				</View>

				<View style={{ flex: 1 }} />
			<LogoutButton onLoggedOut={onBack} />
			</ScrollView>
		</View>
	);
};

// Keep all existing styles...
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#fff",
	},
	scrollContent: {
		padding: 18,
		paddingBottom: 32,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 58,
		marginBottom: 8,
	},
	backArrow: {
		marginRight: 8,
		padding: 4,
		borderRadius: 8,
		marginTop: 16,
	},
	saveBtnWrap: {
		paddingBottom: 24,
	},
	profileTitle: {
		fontSize: 18,
		fontWeight: "bold",
		alignSelf: "center",
		marginTop: 8,
		marginBottom: 8,
	},
	profileImageWrap: {
		alignSelf: "center",
		marginBottom: 8,
		position: "relative",
	},
	profileImage: {
		width: 90,
		height: 90,
		borderRadius: 45,
		backgroundColor: "#E7F3EC",
	},
	editIcon: {
		position: "absolute",
		bottom: 0,
		right: 0,
		backgroundColor: "#7CB798",
		borderRadius: 12,
		padding: 4,
		borderWidth: 2,
		borderColor: "#fff",
	},
	profileName: {
		fontSize: 17,
		fontWeight: "bold",
		alignSelf: "center",
		marginBottom: 2,
	},
	profileRole: {
		fontSize: 14,
		color: "#7CB798",
		alignSelf: "center",
		marginBottom: 12,
	},
	sectionTitle: {
		fontWeight: "bold",
		fontSize: 15,
		marginTop: 16,
		marginBottom: 6,
	},
	input: {
		backgroundColor: "#F2F8F4",
		borderRadius: 8,
		padding: 10,
		marginBottom: 8,
		fontSize: 15,
	},
	orderHistoryRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#F8FCF9",
		borderRadius: 10,
		padding: 10,
		marginBottom: 8,
	},
	orderHistoryIcon: {
		marginRight: 10,
		backgroundColor: "#E7F3EC",
		borderRadius: 8,
		padding: 6,
	},
	orderHistoryText: {
		color: "#222",
		fontWeight: "bold",
		fontSize: 15,
		flex: 1,
	},
	saveBtn: {
		backgroundColor: "#38E472",
		borderRadius: 8,
		paddingVertical: 12,
		marginTop: 18,
		marginBottom: 24,
	},
	saveBtnText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 18,
		textAlign: "center",
	},
});

const logoutStyles = StyleSheet.create({
	logoutContainer: {
		width: "100%",
		justifyContent: "center",
		paddingHorizontal: 18,
		marginBottom: 32,
	},
	logoutButton: {
		width: "100%",
		alignItems: "center",
		backgroundColor: "#e74c3c",
		paddingVertical: 8,
		paddingHorizontal: 24,
		borderRadius: 5,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
	},
	logoutText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "bold",
		letterSpacing: 1,
	},
});

export default Profile;

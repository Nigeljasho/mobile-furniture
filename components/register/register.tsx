import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Dimensions,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from "react-native";

type RegisterProps = {
	onShowLogin?: () => void;
};

const Register: React.FC<RegisterProps> = ({ onShowLogin }) => {
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [role, setRole] = useState<"buyer" | "seller">("buyer");
	const [location, setLocation] = useState("");
	const [isDetectingLocation, setIsDetectingLocation] = useState(false);
	const { register, isLoading, error } = useAuthStore();

	// Show error as pop-up when it occurs
	useEffect(() => {
		if (error) {
			Alert.alert("Registration Error", error);
		}
	}, [error]);

	const handleDetectLocation = async () => {
		setIsDetectingLocation(true);
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				Alert.alert(
					"Permission Denied",
					"❌ Location permission is required to auto-detect your location. Please enable it in settings or enter your city manually."
				);
				setIsDetectingLocation(false);
				return;
			}

			const currentLocation = await Location.getCurrentPositionAsync({});
			const { latitude, longitude } = currentLocation.coords;

			// Reverse geocode to get city name
			const reverseGeocode = await Location.reverseGeocodeAsync({
				latitude,
				longitude,
			});

			if (reverseGeocode && reverseGeocode.length > 0) {
				const city = reverseGeocode[0].city || reverseGeocode[0].region || "Unknown";
				setLocation(city);
				Alert.alert("Success", `📍 Location detected: ${city}`);
			} else {
				Alert.alert(
					"Location Error",
					"❌ Could not determine your city name from GPS. Please enter your city manually."
				);
			}
		} catch (err) {
			Alert.alert(
				"Location Detection Failed",
				"❌ Unable to detect your location. Please enter your city manually."
			);
		} finally {
			setIsDetectingLocation(false);
		}
	};

	const handleSubmit = async () => {
		// Validate common fields
		if (!fullName || !email || !password) {
			Alert.alert("Validation Error", "Please fill in all required fields");
			return;
		}

		// Location is optional for both buyers and sellers during registration
		// (will be required when uploading products for sellers)

		try {
			const registrationData: any = { fullName, email, password, role };

			// Include location if provided (optional for both)
			if (location.trim()) {
				registrationData.location = {
					city: location,
					address: location,
				};
			}

			await register(registrationData);
			Alert.alert(
				"Registration Successful",
				`Welcome ${fullName}! 🎉\n\nYour account has been created successfully. Please login with your credentials.`,
				[
					{
						text: "OK",
						onPress: () => onShowLogin?.(),
					},
				]
			);
		} catch (err) {
			// Error is handled by useEffect hook that displays Alert
		}
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.headerRow}>
				{/* <Text style={styles.backArrow}>{'\u2190'}</Text> */}
				<Text style={styles.header}>Create Account</Text>
				<View style={{ width: 24 }} />
			</View>
			{/* Add a bit more space below header to push it slightly down */}
			<View style={{ height: 16 }} />

			{/* Full Name */}
			<TextInput
				style={styles.input}
				placeholder="Full Name"
				placeholderTextColor="#7CB798"
				value={fullName}
				onChangeText={setFullName}
			/>
			{/* Email */}
			<TextInput
				style={styles.input}
				placeholder="Email"
				placeholderTextColor="#7CB798"
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoCapitalize="none"
			/>
			{/* Password */}
			<View style={styles.passwordContainer}>
				<TextInput
					style={styles.passwordInput}
					placeholder="Password"
					placeholderTextColor="#7CB798"
					value={password}
					onChangeText={setPassword}
					secureTextEntry={!showPassword}
				/>
				<TouchableOpacity
					style={styles.eyeIcon}
					onPress={() => setShowPassword(!showPassword)}
				>
					<Ionicons
						name={showPassword ? "eye-off" : "eye"}
						size={22}
						color="#7CB798"
					/>
				</TouchableOpacity>
			</View>
			{/* Location Section */}
			<View style={styles.locationContainer}>
				<View style={styles.locationInputWrapper}>
					<TextInput
						style={styles.locationInput}
						placeholder="Location (Optional)"
						placeholderTextColor="#7CB798"
						value={location}
						onChangeText={setLocation}
						editable={!isDetectingLocation}
					/>
				</View>
				<TouchableOpacity
					style={[styles.detectBtn, isDetectingLocation && styles.detectBtnDisabled]}
					onPress={handleDetectLocation}
					disabled={isDetectingLocation}
					accessible={true}
					accessibilityLabel={`${role === "seller" ? "Auto-detect Location (Recommended for Sellers)" : "Auto-detect Location"}`}
				>
					{isDetectingLocation ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<Ionicons name="locate" size={20} color="#fff" />
					)}
				</TouchableOpacity>
			</View>
			{/* Role Toggle */}
			<View style={styles.roleRow}>
				<Pressable
					style={[styles.roleBtn, role === "buyer" && styles.roleBtnActive]}
					onPress={() => setRole("buyer")}
				>
					<Text
						style={[
							styles.roleBtnText,
							role === "buyer" && styles.roleBtnTextActive,
						]}
					>
						Buyer
					</Text>
				</Pressable>
				<Pressable
					style={[
						styles.roleBtn,
						role === "seller" && styles.roleBtnActive,
						{ marginLeft: 16 },
					]}
					onPress={() => setRole("seller")}
				>
					<Text
						style={[
							styles.roleBtnText,
							role === "seller" && styles.roleBtnTextActive,
						]}
					>
						Seller
					</Text>
				</Pressable>
			</View>
			{/* Create Account Button */}
			<TouchableOpacity
				style={styles.createBtn}
				disabled={isLoading}
				onPress={handleSubmit}
			>
				<Text style={styles.createBtnText}>Create Account</Text>
			</TouchableOpacity>
			{/* Sign in link */}
			<View style={{ flex: 1 }} />
			<Text style={styles.signinText}>
				Already have an account?{" "}
				<Text style={styles.signinLink} onPress={onShowLogin}>
					Sign in
				</Text>
			</Text>
			<View style={{ height: 16 }} />
		</View>
	);
};

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F8FCF9",
		padding: 24,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 24,
		marginTop: 58,
	},
	backArrow: {
		fontSize: 22,
		color: "#222",
		width: 24,
	},
	header: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#222",
		textAlign: "center",
	},
	input: {
		backgroundColor: "#E7F3EC",
		borderRadius: 6,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 15,
		color: "#222",
		marginBottom: 14,
		width: "100%",
		minWidth: 220,
		maxWidth: 500,
		alignSelf: "center",
	},
	passwordContainer: {
		position: "relative",
		marginBottom: 14,
		width: "100%",
		minWidth: 220,
		maxWidth: 500,
		alignSelf: "center",
	},
	passwordInput: {
		backgroundColor: "#E7F3EC",
		borderRadius: 6,
		paddingHorizontal: 16,
		paddingVertical: 12,
		paddingRight: 50,
		fontSize: 15,
		color: "#222",
		width: "100%",
	},
	eyeIcon: {
		position: "absolute",
		right: 12,
		top: 12,
		padding: 4,
	},
	roleRow: {
		flexDirection: "row",
		justifyContent: "flex-start",
		marginVertical: 10,
	},
	roleBtn: {
		backgroundColor: "#fff",
		borderRadius: 6,
		paddingVertical: 10,
		paddingHorizontal: 24,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#E7F3EC",
	},
	roleBtnActive: {
		backgroundColor: "#E7F3EC",
		borderColor: "#38E472",
	},
	roleBtnText: {
		color: "#7CB798",
		fontWeight: "bold",
		fontSize: 16,
	},
	roleBtnTextActive: {
		color: "#222",
	},
	createBtn: {
		backgroundColor: "#38E472",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 16,
		marginBottom: 16,
	},
	createBtnText: {
		color: "#111",
		fontWeight: "bold",
		fontSize: 18,
	},
	signinText: {
		textAlign: "center",
		color: "#7CB798",
		marginBottom: 0,
		fontSize: 14,
	},
	signinLink: {
		color: "#38E472",
		fontWeight: "bold",
	},
	locationContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 14,
		gap: 8,
	},
	locationInputWrapper: {
		flex: 1,
	},
	locationInput: {
		backgroundColor: "#E7F3EC",
		borderRadius: 6,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 15,
		color: "#222",
		width: "100%",
	},
	detectBtn: {
		backgroundColor: "#38E472",
		borderRadius: 6,
		width: 48,
		height: 48,
		justifyContent: "center",
		alignItems: "center",
	},
	detectBtnDisabled: {
		backgroundColor: "#A8D5B8",
		opacity: 0.6,
	},
});

export default Register;

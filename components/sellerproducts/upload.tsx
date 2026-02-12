import { useAuthStore } from "@/stores/authStore";
import { useProductStore } from "@/stores/productStore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useState } from "react";
import {
	Alert,
	Image,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	ActivityIndicator,
} from "react-native";

type SellerProductsProps = {
	onClose?: () => void;
};

const SellerProducts: React.FC<SellerProductsProps> = ({ onClose }) => {
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [stock, setStock] = useState("1");
	const [location, setLocation] = useState("");
	const [isDetectingLocation, setIsDetectingLocation] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [imageModal, setImageModal] = useState(false);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
	const [imageFile, setImageFile] = useState<any>(null);
	const { createProduct, isLoading } = useProductStore();
	const { user } = useAuthStore();
	const id = user?.id;

	const categories = ["tables", "chairs", "desks", "sofas", "cabinets"];

	const handleDetectLocation = async () => {
		setIsDetectingLocation(true);
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				Alert.alert(
					"Permission Denied",
					"Location permission is required. Please enable it in settings."
				);
				setIsDetectingLocation(false);
				return;
			}

			const currentLocation = await Location.getCurrentPositionAsync({});
			const { latitude, longitude } = currentLocation.coords;

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
					"Could not determine your city. Please enter manually."
				);
			}
		} catch (err) {
			Alert.alert(
				"Location Detection Failed",
				"Unable to detect location. Please enter manually."
			);
		} finally {
			setIsDetectingLocation(false);
		}
	};

	const pickImage = async () => {
		// Request permission
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission needed",
				"We need camera roll permissions to upload images"
			);
			return;
		}

		// Launch image picker
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.8,
		});

		if (!result.canceled && result.assets[0]) {
			setSelectedImage(result.assets[0].uri);
			setImageFile(result.assets[0]);
		}
	};

	const addProduct = async () => {
		try {
			if (!id) {
				Alert.alert("Error", "You must be logged in to add a product.");
				return;
			}

		if (!name || !price || !description || !category || !location.trim()) {
			Alert.alert("Error", "Please fill in all fields including location.");
				return;
			}
			if (!imageFile) {
				Alert.alert("Error", "Please select an image.");
				return;
			}

			// Create FormData for multipart upload
			const formData = new FormData();
			formData.append("seller", id);
			formData.append("name", name);
			formData.append("description", description);
			formData.append("price", price);
			formData.append("category", category);
			formData.append("stock", stock);

			// Add image file
			const imageUri = imageFile.uri;
			const filename = imageUri.split("/").pop() || "image.jpg";
			const match = /\.(\w+)$/.exec(filename);
			const type = match ? `image/${match[1]}` : "image/jpeg";

			formData.append("image", {
				uri: imageUri,
				name: filename,
				type: type,
			} as any);

			await createProduct(formData);
			Alert.alert("Success", "Product added!");

			// Reset form
			setName("");
			setPrice("");
			setDescription("");
			setCategory("");
			setStock("1");
			setSelectedImage(null);
			setImageFile(null);

			if (onClose) onClose();
		} catch (err) {
			console.error("Failed to add product", err);
			Alert.alert("Error", "Failed to add product. Please try again.");
		}
	};

	return (
		<ScrollView
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Header */}
			<View style={styles.headerRow}>
				<TouchableOpacity style={{ padding: 4 }} onPress={onClose}>
					<Ionicons name="close" size={24} color="#222" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>New Listing</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Product Name */}
			<TextInput
				style={styles.input}
				placeholder="Product Name"
				value={name}
				onChangeText={setName}
				placeholderTextColor="#7CB798"
			/>

			{/* Price */}
			<TextInput
				style={styles.input}
				placeholder="Price (KES)"
				value={price}
				onChangeText={setPrice}
				keyboardType="numeric"
				placeholderTextColor="#7CB798"
			/>

			{/* Stock */}
			<TextInput
				style={styles.input}
				placeholder="Stock Quantity"
				value={stock}
				onChangeText={setStock}
				keyboardType="numeric"
				placeholderTextColor="#7CB798"
			/>

			{/* Description */}
			<TextInput
				style={[styles.input, styles.textArea]}
				placeholder="Description"
				value={description}
				onChangeText={setDescription}
				multiline
				numberOfLines={4}
				placeholderTextColor="#7CB798"
			/>

			{/* Category Dropdown */}
			<TouchableOpacity
				style={styles.input}
				onPress={() => setDropdownOpen(!dropdownOpen)}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Text style={{ color: category ? "#222" : "#7CB798", fontSize: 15 }}>
						{category || "Category"}
					</Text>
					<Ionicons
						name={dropdownOpen ? "chevron-up" : "chevron-down"}
						size={22}
						color="#7CB798"
					/>
				</View>
			</TouchableOpacity>
			{dropdownOpen && (
				<View style={styles.dropdownMenu}>
					{categories.map((cat) => (
						<TouchableOpacity
							key={cat}
							style={styles.dropdownItem}
							onPress={() => {
								setCategory(cat);
								setDropdownOpen(false);
							}}
						>
							<Text style={{ color: "#222", fontSize: 15 }}>{cat}</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			{/* Location Section - Required for shipping calculation */}
			<View style={styles.locationSection}>
				<Text style={styles.sectionTitle}>Product Location</Text>
				<TextInput
					style={styles.locationInput}
					placeholder="Enter your location/city"
					placeholderTextColor="#7CB798"
					value={location}
					onChangeText={setLocation}
					editable={!isDetectingLocation}
				/>
				<TouchableOpacity
					style={[styles.detectBtn, isDetectingLocation && styles.detectBtnDisabled]}
					onPress={handleDetectLocation}
					disabled={isDetectingLocation}
				>
					{isDetectingLocation ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<>
							<Ionicons name="locate" size={18} color="#fff" />
							<Text style={styles.detectBtnText}>Detect Location</Text>
						</>
					)}
				</TouchableOpacity>
			</View>

			{/* Upload Image */}
			<Text style={styles.sectionTitle}>Upload Image</Text>
			<View style={styles.uploadBox}>
				{!selectedImage ? (
					<View style={styles.uploadEmpty}>
						<Text style={styles.uploadAdd}>Add Image</Text>
						<Text style={styles.uploadDesc}>Upload product image</Text>
						<TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
							<Text style={styles.uploadBtnText}>Choose Image</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.uploadImagesWrap}>
						<TouchableOpacity onPress={() => setImageModal(true)}>
							<Image
								source={{ uri: selectedImage }}
								style={styles.uploadImageLarge}
							/>
						</TouchableOpacity>
						<TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
							<Text style={styles.changeBtnText}>Change Image</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>

			{/* Post Listing Button */}
			<TouchableOpacity
				style={[styles.postBtn, isLoading && styles.postBtnDisabled]}
				onPress={addProduct}
				disabled={isLoading}
			>
				<Text style={styles.postBtnText}>
					{isLoading ? "Posting..." : "Post Listing"}
				</Text>
			</TouchableOpacity>

			{/* Image Preview Modal */}
			<Modal
				visible={imageModal}
				transparent
				animationType="fade"
				onRequestClose={() => setImageModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Image Preview</Text>
						{selectedImage && (
							<Image
								source={{ uri: selectedImage }}
								style={styles.previewImage}
							/>
						)}
						<TouchableOpacity
							style={styles.modalClose}
							onPress={() => setImageModal(false)}
						>
							<Text style={styles.modalCloseText}>Close</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F8FCF9",
		padding: 24,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#222",
		marginBottom: 16,
	},
	scrollContent: {
		padding: 18,
		paddingBottom: 32,
		backgroundColor: "#F8FCF9",
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 18,
		marginTop: 58,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#222",
		textAlign: "center",
	},
	input: {
		backgroundColor: "#E7F3EC",
		borderRadius: 8,
		padding: 12,
		fontSize: 15,
		color: "#222",
		marginBottom: 12,
	},
	textArea: {
		minHeight: 70,
		textAlignVertical: "top",
	},
	dropdownMenu: {
		backgroundColor: "#fff",
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "#E7F3EC",
		overflow: "hidden",
	},
	dropdownItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E7F3EC",
	},
	sectionTitle: {
		fontWeight: "bold",
		fontSize: 15,
		marginBottom: 8,
		color: "#222",
	},
	uploadBox: {
		borderWidth: 1,
		borderColor: "#CFE9DD",
		borderRadius: 12,
		padding: 18,
		marginBottom: 18,
		backgroundColor: "#F8FCF9",
		minHeight: 140,
		alignItems: "center",
		justifyContent: "center",
		borderStyle: "dashed",
	},
	uploadEmpty: {
		alignItems: "center",
		justifyContent: "center",
	},
	uploadAdd: {
		fontWeight: "bold",
		fontSize: 16,
		color: "#222",
		marginBottom: 6,
	},
	uploadDesc: {
		color: "#7CB798",
		fontSize: 14,
		marginBottom: 12,
		textAlign: "center",
	},
	uploadBtn: {
		backgroundColor: "#E7F3EC",
		borderRadius: 8,
		paddingVertical: 8,
		paddingHorizontal: 24,
		alignItems: "center",
	},
	uploadBtnText: {
		color: "#222",
		fontWeight: "bold",
		fontSize: 15,
	},
	uploadImagesWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	uploadImage: {
		width: 60,
		height: 60,
		borderRadius: 8,
		margin: 4,
		backgroundColor: "#eee",
	},
	uploadImageLarge: {
		width: 200,
		height: 200,
		borderRadius: 12,
		backgroundColor: "#eee",
		marginBottom: 12,
	},
	changeBtn: {
		backgroundColor: "#E7F3EC",
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 24,
		alignItems: "center",
	},
	changeBtnText: {
		color: "#222",
		fontWeight: "bold",
		fontSize: 15,
	},
	postBtn: {
		backgroundColor: "#38E472",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginBottom: 24,
	},
	postBtnDisabled: {
		backgroundColor: "#A0D4B4",
		opacity: 0.6,
	},
	postBtnText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 16,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.15)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		backgroundColor: "#fff",
		borderRadius: 14,
		padding: 18,
		width: 320,
		maxWidth: "90%",
		alignItems: "center",
	},
	modalTitle: {
		fontWeight: "bold",
		fontSize: 16,
		marginBottom: 12,
		alignSelf: "center",
	},
	modalClose: {
		marginTop: 16,
		alignSelf: "center",
	},
	modalCloseText: {
		color: "#7CB798",
		fontWeight: "bold",
		fontSize: 15,
	},
	previewImage: {
		width: 280,
		height: 280,
		borderRadius: 12,
		marginVertical: 16,
	},
	locationSection: {
        marginBottom: 16,
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E7F3EC",
    },
    locationInput: {
        backgroundColor: "#E7F3EC",
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: "#222",
        marginBottom: 10,
    },
    detectBtn: {
        backgroundColor: "#27AE60",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
	},
	detectBtnDisabled: {
        backgroundColor: "#A0D4B4",
        opacity: 0.6,
    },
    detectBtnText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
});

export default SellerProducts;

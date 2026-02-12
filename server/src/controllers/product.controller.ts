import { Request, Response } from "express";

import cloudinary from "../config/cloudinary";
import Listing from "../models/listings.models";
import Product from "../models/product.models";
import User from "../models/user.models";
import { logger } from "../utils/logger";
import { geocodeCity } from "../utils/distanceUtils";

export const addProduct = async (req: Request, res: Response) => {
	const seller = req.user?.id;
	const { name, category, description, price, stock } = req.body;

	if (!seller) {
		res
			.status(401)
			.json({ success: false, message: "Authentication required" });
		return;
	}
	// optional: enforce only users with role "seller" can add products
	if (req.user?.role && req.user.role !== "seller") {
		res
			.status(403)
			.json({ success: false, message: "Only sellers can add products" });
		return;
	}

	let imageUrl = "";
	if (req.file) {
		try {
			const result = await new Promise<any>((resolve, reject) => {
				cloudinary.uploader
					.upload_stream(
						{ resource_type: "image", folder: "products" },
						(error, result) => {
							if (error) {
								logger.error(`Error uploading image: ${error.message}`);
								reject(error);
							} else {
								resolve(result);
							}
						}
					)
					.end(req.file?.buffer);
			});
			imageUrl = result.secure_url;
		} catch (error: unknown) {
			logger.error(
				`Error uploading image: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			return res.status(500).json({
				message: "Error uploading image",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	} else {
		// allow skipping image requirement for testing:
		if (process.env.SKIP_IMAGE_VALIDATION === "true") {
			logger.info("Skipping image upload check (SKIP_IMAGE_VALIDATION=true)");
			// imageUrl stays empty or set a placeholder url if you prefer
			imageUrl = "";
		} else {
			logger.error("Failed to add image");
			return res.status(400).json({
				success: false,
				message: "image required",
			});
		}
	}

	try {
		// Get seller's location for product creation
		const sellerUser = await User.findById(seller);
		let sellerLocation: any = {};

		if (sellerUser?.location?.city) {
			sellerLocation.city = sellerUser.location.city;
			sellerLocation.latitude = sellerUser.location.latitude;
			sellerLocation.longitude = sellerUser.location.longitude;

			// If seller has city but no coordinates, geocode them
			if (!sellerLocation.latitude || !sellerLocation.longitude) {
				const coords = await geocodeCity(sellerUser.location.city);
				if (coords) {
					sellerLocation.latitude = coords.latitude;
					sellerLocation.longitude = coords.longitude;
				}
			}
		}

		const newProduct = new Product({
			seller: seller,
			name,
			category,
			image: imageUrl,
			description,
			price: Number(price),
			stock: Number(stock),
			sellerLocation: Object.keys(sellerLocation).length > 0 ? sellerLocation : undefined,
		});

		await newProduct.save();

		try {
			const listing = new Listing({
				seller,
				product: newProduct._id,
				isActive: true,
			});

			await listing.save()
		} catch (err) {
			logger.info("Failed to add listing");
			return res
				.status(201)
				.json({ message: "New product added but listing failed" });
		}
		logger.info("Product saved succesfully", newProduct);
		res.status(200).json({ newProduct });
	} catch (error: any) {
		logger.error(`Failed to add Product, ${error.message}`);
		return res.status(500).json({ message: "Server Error" });
	}
};

export const updateProduct = async (req: Request, res: Response) => {
	const seller = req.user?.id;
	const productId = req.params.id;
	const { name, category, description, price, stock, image } = req.body;

	if (!seller) {
		res
			.status(401)
			.json({ success: false, message: "Authentication required" });
		return;
	}

	let imageUrl = "";
	if (req.file) {
		try {
			const result = await new Promise<any>((resolve, reject) => {
				cloudinary.uploader
					.upload_stream(
						{ resource_type: "image", folder: "products" },
						(error, result) => {
							if (error) {
								logger.error(`Error uploading image: ${error.message}`);
								reject(error);
							} else {
								resolve(result);
							}
						}
					)
					.end(req.file?.buffer);
			});
			imageUrl = result.secure_url;
		} catch (error: unknown) {
			logger.error(
				`Error uploading image: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			return res.status(500).json({
				message: "Error uploading image",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
	
	const updateData: any = {};
	if (name) updateData.name = name;
	if (description) updateData.description = description;
	if (price) updateData.price = price;
	if (category) updateData.category = category;
	if (stock !== undefined) updateData.stock = stock;
	// Use uploaded image if available, otherwise use image from body (existing URL)
	if (imageUrl) {
		updateData.image = imageUrl;
	} else if (image) {
		updateData.image = image;
	}

	try {
		const isExist = await Product.findByIdAndUpdate(productId, updateData, {
			new: true,
		});

		if (!isExist) {
			res.status(404).json({ success: false, message: "Product notfound" });
			return;
		}

		res
			.status(200)
			.json({ success: true, message: "Product updated succesfully" });
		return;
	} catch (err) {
		logger.error("Failed to update product");
		return res.status(500).json({ message: "Server error" });
	}
};

export const deleteProduct = async (req: Request, res: Response) => {
	const seller = req.user?.id;
	const productId = req.params.id;

	if (!seller) {
		res
			.status(401)
			.json({ success: false, message: "Authentication required" });
		return;
	}

	try {
		const isExisting = await Product.findByIdAndDelete(productId);
		if (!isExisting) {
			return res
				.status(404)
				.json({ success: false, message: "No such product found" });
		}

		res
			.status(200)
			.json({ success: true, message: "Product succesfully deleted" });
	} catch (err) {
		logger.error("Failed to delete Product");
		return res.status(500).json({ message: "Server error" });
	}
};

export const getProducts = async (req: Request, res: Response) => {
	try {
		const products = await Product.find();
		const mapped = products.map((p) => ({
			...p.toObject(),
			id: p._id.toString(),
		}));
		res.status(200).json(mapped);
	} catch (err) {
		logger.error("Failed to get products");
		res.status(500).json({ message: "Server Error" });
	}
};

export const getProduct = async (req: Request, res: Response) => {
	const productId = req.params.id;
	try {
		const product = await Product.findById(productId);
		if (!product) {
			res.status(404).json({ success: false, message: "Product not found" });
			return;
		}

		const mapped = { ...product.toObject(), id: product._id.toString() };
		res.status(200).json(mapped);
	} catch (err) {
		logger.error("Failed to get products");
		res.status(500).json({ message: "Server Error" });
	}
};

export const updateStock = async (req: Request, res: Response) => {
	const productId = req.params.id;
	const { stock } = req.body;
	try {
		const product = await Product.findByIdAndUpdate(
			productId,
			{ stock },
			{ new: true }
		);
		if (!product) {
			res.status(404).json({ message: "Product not found" });
			return;
		}
		res.status(200).json({
			success: true,
			message: "Stock updated successfully",
			product,
		});
		logger.info("Stock updated successfully", product);
	} catch (error: any) {
		logger.error(`Error updating stock: ${error.message}`);
		res
			.status(500)
			.json({ message: "Error updating stock", error: error.message });
	}
};

export const getListingsBySeller = async (req: Request, res: Response) => {
	const sellerId = req.params.sellerId ?? req.user?.id;
	if (!sellerId)
		return res
			.status(400)
			.json({ success: false, message: "seller id required" });

	try {
		const listings = await Listing.find({ seller: sellerId, isActive: true })
			.populate("product")
			.sort({ createdAt: -1 });

		const out = listings.map((l) => {
			const obj = l.toObject();
			return {
				id: obj._id,
				product: obj.product,
				isActive: obj.isActive,
				createdAt: obj.createdAt,
			};
		});

		return res.status(200).json({ success: true, listings: out });
	} catch (err) {
		logger.error("Failed to fetch listings by seller", err);
		return res.status(500).json({ success: false, message: "Server Error" });
	}
};

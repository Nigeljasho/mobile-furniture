import { NextFunction, Request, Response } from "express";
import Joi from "joi";

import { logger } from "../utils/logger";

export const validate = (schema: Joi.ObjectSchema) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const { error } = schema.validate(req.body);
		if (error) {
			const message =
				error.details?.[0]?.message ??
				(error as any).message ??
				"Validation error";
			logger.error(`Validation error: ${message}`);
			return res.status(400).json({
				success: false,
				message,
			});
		}
		next();
	};
};

export const validateWithFile = (
	schema: Joi.ObjectSchema,
	fileRequired: boolean = true
) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const bodyToValidate = { ...req.body };
		delete bodyToValidate.image;
		const { error } = schema.validate(bodyToValidate);

		if (error) {
			const message =
				error.details?.[0]?.message ??
				(error as any).message ??
				"Validation error";
			logger.error(`Validation error: ${message}`);
			return res.status(400).json({
				success: false,
				message,
			});
		}

		// Check if file is required and present
		if (fileRequired && !req.file) {
			logger.error("Validation error: Image file is required");
			return res.status(400).json({
				success: false,
				message: "Image file is required",
			});
		}

		// Validate file type if file is present
		if (req.file && !req.file.mimetype.startsWith("image/")) {
			logger.error("Validation error: Only image files are allowed");
			return res.status(400).json({
				success: false,
				message: "Only image files are allowed",
			});
		}
		// Validate file size (5MB limit)
		if (req.file && req.file.size > 5 * 1024 * 1024) {
			logger.error("Validation error: Image size must be less than 5MB");
			return res.status(400).json({
				success: false,
				message: "Image size must be less than 5MB",
			});
		}

		next();
	};
};

export const validationError = (
	err: any,
	_req: Request,
	res: Response,
	next: NextFunction
) => {
	if (err.isJoi) {
		logger.error(`Validation error: ${err.details[0].message}`);
		return res.status(400).json({
			success: false,
			message: err.details[0].message,
		});
	}
	next(err);
};

export const schemas = {
	register: Joi.object({
		fullName: Joi.string().min(4).required(),
		email: Joi.string().email().required(),
		password: Joi.string().min(6).required(),
		role: Joi.string().valid("buyer", "seller").default("buyer"),
		profilePic: Joi.string().optional(),
		location: Joi.object({
			city: Joi.string().optional(),
			address: Joi.string().optional(),
			latitude: Joi.number().optional(),
			longitude: Joi.number().optional(),
		}).optional(),
	}),
	login: Joi.object({
		email: Joi.string().email().required(),
		password: Joi.string().required(),
	}),
	addProduct: Joi.object({
		seller: Joi.string().required(),
		name: Joi.string().min(2).required(),
		category: Joi.string().valid("tables", "chairs", "desks", "sofas", "cabinets"),
		image: Joi.string().optional(),
		images: Joi.array().optional(),
		description: Joi.string().min(5).max(100).required(),
		price: Joi.number().min(0).required(),
		stock: Joi.number().min(0).required(),
		reviewCount: Joi.number().min(0),
	}),
	updateProduct: Joi.object({
		name: Joi.string().min(2).optional(),
		category: Joi.string().optional(),
		image: Joi.string().optional(),
		images: Joi.array().optional(),
		description: Joi.string().min(5).max(100).optional(),
		stock: Joi.number().min(0).optional(),
		price: Joi.number().optional(),
	}),
	makeOrder: Joi.object({
		buyer: Joi.string().optional(),
		seller: Joi.string().optional(),
		items: Joi.array()
			.items(
				Joi.object({
					product: Joi.string().required(),
					quantity: Joi.number().required(),
				})
			)
			.min(1)
			.required(),
		subtotla: Joi.number().min(0),
		shipping: Joi.number().min(0),
		total: Joi.number().min(0),
		paymentMethod: Joi.string().valid("mpesa").required(),
		phoneNumber: Joi.string().min(10).required(),
		shippingInfo: 
			Joi.object({
				city: Joi.string(),
				address: Joi.string(),
			}),
		status: Joi.string()
			.valid("Pending", "Shipped", "Cancelled", "Delivered")
			.default("Pending"),
	}),
	addToCart: Joi.object({
		//user: Joi.string().required(),
		productId: Joi.string().required(),
		quantity: Joi.number(),
		price: Joi.number(),
		subtotal: Joi.number(),
		shipping: Joi.number(),
		total: Joi.number(),
	}),
	leaveReview: Joi.object({
		product: Joi.string().required(),
		content: Joi.string().min(2).max(100),
		stars: Joi.number()
	})
};

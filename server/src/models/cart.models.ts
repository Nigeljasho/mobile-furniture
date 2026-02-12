import mongoose, { Schema } from "mongoose";

const cartItemSchema = new Schema({
	product: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Product",
		required: [true, "Product is required"],
	},
	quantity: { 
		type: Number, 
		required: [true, "Quantity is required"],
		default: 1,
		min: [1, "Quantity must be at least 1"]
	},
	price: { 
		type: Number, 
		required: [true, "Price is required"],
		min: [0, "Price cannot be negative"]
	},
}, { _id: true });

const cartSchema = new Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "User is required"],
	},
	items: {
		type: [cartItemSchema],
		default: [],
	},
	subTotal: {
		type: Number,
		default: 0,
		min: [0, "SubTotal cannot be negative"]
	},
	shipping: {
		type: Number,
		default: 0,
		min: [0, "Shipping cannot be negative"]
	},
	total: {
		type: Number,
		default: 0,
		min: [0, "Total cannot be negative"]
	},
}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;

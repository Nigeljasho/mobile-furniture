export interface User {
	id: string;
	fullName: string;
	email: string;
	role: "buyer" | "seller";
}

export interface RegisterInput {
	fullName: string;
	email: string;
	password: string;
	role: "buyer" | "seller";
	location?: {
		city?: string;
		address?: string;
		latitude?: number;
		longitude?: number;
	};
}

export interface Product {
	id: string;
	name: string;
	description: string;
	price: number;
	image: string;
	category: string;
	stock: number;
}

export interface AddProduct {
	seller: string;
	name: string;
	description: string;
	price: number;
	image: string;
	category: string;
	stock: number;
}

export interface Cart {
	user: string;
	productId: string;
	quantity: number;
	price: string;
	subtotal: number;
	shipping: number;
	total: number;
}

export interface Order {
	id: string;
	_id?: string;
	buyer?: Buyer; 
	user?: string;  
	seller?: string;
	orderNumber?: string;  
	transactionId?: string;  
	transaction?: {
		id: string;
		status: string;
	};
	products: {
		product: Product;
		quantity: number;
	}[];
	items?: {
	 
		product: string;
		name: string;
		price: number;
		quantity: number;
		image: string;
	}[];
	subTotal?: number;  
	shipping?: number;  
	total?: number;  
	totalAmount?: number;  
	paymentMethod: "mpesa";  
	paymentStatus: "pending" | "paid" | "failed" | "cancelled" | "timeout";
	phoneNumber?: string;
	mpesaCheckoutRequestID?: string;
	mpesaReceiptNumber?: string;
	shippingInfo?: {
		city: string;
		address: string;
	};
	status: string
	createdAt?: string;
	updatedAt?: string;
	resultDesc?: string;
}

export interface makeOrder {
	buyer?: string; 
	items: {
		product: string;
		quantity: number;
	}[];
	phoneNumber: string;
	paymentMethod: "mpesa";  
	shippingInfo: {
		city: string;
		address: string;
	};
}

export interface CartItem {
	product: Product;
	quantity: number;
}

export interface Review {
	id?: string;
	product:
		| string
		| {
				id?: string;
				_id?: string;
				name?: string;
				image?: string;
				price?: number;
				description?: string;
		  };
	content: string;
	stars: number;
	user?:
		| {
				id?: string;
				_id?: string;
				fullName?: string;
				email?: string;
		  }
		| string;
	createdAt?: string;
	updatedAt?: string;
}
interface Buyer {
	_id: string;
	name?: string;
	email?: string;
}
import { addToCart, getCart, removeFromCart, updateCart as updateCartApi } from "@/SERVICE/api";
import { CartItem, Product } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

console.log("🔍 Checking imports from @/SERVICE/api:", {
	hasAddToCart: typeof addToCart,
	hasGetCart: typeof getCart,
	hasRemoveFromCart: typeof removeFromCart,
	hasUpdateCartApi: typeof updateCartApi,
});

type CartState = {
	items: CartItem[];
	isLoading: boolean;
	error: string | null;
	userId: string | null;
	buyerCity: string;
	shippingCost: number;

	// basic ops
	addItem: (product: Product, qty?: number) => Promise<void>;
	setQuantity: (productId: string, qty: number) => void;
	removeItem: (productId: string) => Promise<void>;
	clear: () => void;
	setBuyerCity: (city: string) => void;
	setShippingCost: (cost: number) => void;

	// server sync
	fetchCart: () => Promise<void>;
	setUserId: (userId: string | null) => void;  

	// derived
	subtotal: () => number;
};

function mapServerCartToItems(payload: any): CartItem[] {
	const list = payload?.cart?.items ?? payload?.items ?? [];
	return list
		.map((it: any) => {
			const p = it?.product || {};
			const product: Product = {
				id: String(p._id || p.id || ""),
				name: p.name || "",
				description: p.description || "",
				price: Number(p.price || 0),
				image: p.image || "",
				category: p.category || "",
				stock: Number(p.stock || 0),
			};
			return { product, quantity: Number(it?.quantity ?? 1) } as CartItem;
		})
		.filter((it: CartItem) => !!it.product.id);
}

export const useCartStore = create<CartState>()(
	persist(
		(set, get) => ({
			items: [],
			isLoading: false,
			error: null,
			userId: null,
			buyerCity: "",
			shippingCost: 0,

			addItem: async (product, qty = 1) => {
				if (typeof addToCart !== 'function') {
					throw new Error(`addToCart is not imported correctly. Type: ${typeof addToCart}`);
				}
				
				// Store previous state for potential revert
				const prevItems = get().items;

				// Optimistic update
				set((state) => {
					const idx = state.items.findIndex((i) => i.product.id === product.id);
					if (idx > -1) {
						const next = [...state.items];
						next[idx] = {
							...next[idx],
							quantity: (next[idx].quantity || 0) + qty,
						};
						return { items: next };
					}
					return { items: [...state.items, { product, quantity: qty }] };
				});

				try {
					// Backend gets userId from JWT token automatically
					console.log("📤 Calling addToCart with:", {
						productId: product.id,
						quantity: qty,
						price: product.price, // Pass price to backend
					});
					await addToCart({
						productId: product.id,
						quantity: qty,
						
					});
					console.log("✅ Product added to cart");
				} catch (err: any) {
					// Revert optimistic update on failure
					set({ items: prevItems });
					console.error("Failed to add to cart:", err);
					set({ error: err?.message || "Failed to add to cart" });
					throw err;
				}
			},

			setQuantity: (productId, qty) => {
				const nextQty = Math.max(1, qty);
				const prev = get().items;

				set({
					items: prev.map((i) =>
						i.product.id === productId ? { ...i, quantity: nextQty } : i
					),
				});

				updateCartApi(productId, nextQty).catch((err) => {
					console.error("Failed to update cart", err);
					set({
						items: prev,
						error: err instanceof Error ? err.message : "Failed to update cart",
					});
				});
			},

			removeItem: async (productId) => {
				const prev = get().items;

				// Optimistic update
				set((state) => ({
					items: state.items.filter((i) => i.product.id !== productId),
				}));

				try {
					await removeFromCart(productId);
					console.log("Item removed from cart");
				} catch (err: any) {
					// Revert optimistic update on failure
					set({ items: prev });
					console.error("Failed to remove from cart:", err);
					set({ error: err?.message || "Failed to remove from cart" });
				}
			},

			clear: () => {
				set({ items: [] });
				console.log("🗑️ Cart cleared");
			},

			setBuyerCity: (city: string) => {
				set({ buyerCity: city });
			},
			setShippingCost: (cost: number) => {
				set({ shippingCost: cost });
			},

			fetchCart: async () => {
				try {
					set({ isLoading: true, error: null });
					const data = await getCart();
					const items = mapServerCartToItems(data);
					set({ items, isLoading: false });
					console.log(" Cart fetched successfully");
				} catch (err: any) {
					console.error("Failed to fetch cart:", err);
					set({
						isLoading: false,
						items: [],
						error: err?.message || "Failed to fetch cart",
					});
				}
			},

			setUserId: (userId: string | null) => {
				set({ userId });
				console.log("Cart userId set:", userId);
			},

			subtotal: () =>
				get().items.reduce(
					(sum, it) => sum + Number(it.product.price || 0) * (it.quantity || 1),
					0
				),
		}),
		{
			name: "cart_store",
			storage: createJSONStorage(() => AsyncStorage),
			partialize: (s) => ({
				items: s.items,
				userId: s.userId,
				buyerCity: s.buyerCity,
				shippingCost: s.shippingCost,
			}),
			version: 1,
		}
	)
);

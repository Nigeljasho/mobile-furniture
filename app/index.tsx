import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { setAuthToken } from "@/SERVICE/api";
import React, { useEffect, useState } from "react";
import BuyerInterface from "../components/buyer-interface/buyer-interface";
import Login from "../components/login/login";
import Register from "../components/register/register";
import SellerInterface from "../components/seller-interface/seller-interface";

export default function Index() {
	const [screen, setScreen] = useState<
		"login" | "register" | "buyer" | "seller"
	>("login");
	const { user, token } = useAuthStore();
	const { setUserId, fetchCart } = useCartStore();
	const [hydrated, setHydrated] = useState(false);

	
	useEffect(() => {
		const unsub = useAuthStore.persist.onHydrate(() => {});
		useAuthStore.persist.onFinishHydration(() => setHydrated(true));
		if (useAuthStore.persist.hasHydrated()) setHydrated(true);
		return () => {
			unsub?.();
		};
	}, []);

	useEffect(() => {
		if (!hydrated) return;

		// Set auth token on axios after hydration
		if (token) {
			setAuthToken(token);
			console.log("🔐 Auth token set on axios instance");
		} else {
			setAuthToken(null);
			console.log("🔐 Auth token cleared from axios instance");
		}
	}, [token, hydrated]);

	useEffect(() => {
		if (!hydrated) return; 

		if (!user || !token) {
			setScreen("login");
			setUserId(null);
			console.log("No user/token - redirecting to login");
			return;
		}

		console.log("👤 User logged in:", user.id, "Role:", user.role);
		setUserId(user.id);

		if (user.role === "buyer") {
			console.log("🛒 Fetching cart for buyer...");
			fetchCart()
				.then(() => console.log("Cart loaded"))
				.catch((err) => {
					console.error("❌ Cart fetch failed:", err.message);
				});
			setScreen("buyer");
		} else if (user.role === "seller") {
			setScreen("seller");
		} else {
			setScreen("login");
		}
	}, [user, token, hydrated]);

	if (!hydrated) {
		return null; 
	}

	if (screen === "buyer") {
		return <BuyerInterface />;
	}
	if (screen === "seller") {
		return <SellerInterface onBack={() => setScreen("login")} />;
	}
	if (screen === "register") {
		return <Register onShowLogin={() => setScreen("login")} />;
	}
	return (
		<Login
			onShowRegister={() => setScreen("register")}
			onLogin={() => {
				
			}}
		/>
	);
}

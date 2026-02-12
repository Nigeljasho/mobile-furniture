import express from "express";
import {
    approveUser,
    deleteUserById,
    getAllUsers,
    toggleSuspendUser,
    updateSellerLocation,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// TODO: Add admin authentication middleware

router.get("/users", getAllUsers);
router.patch("/users/:id/approve", approveUser);
router.patch("/users/:id/suspend", toggleSuspendUser);
router.delete("/users/:id", deleteUserById);

// Seller: Update location
router.patch("/location", authenticate, updateSellerLocation);

export default router;

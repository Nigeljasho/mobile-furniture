// Admin: Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    logger.error("Failed to fetch users", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Approve user
export const approveUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true },
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    logger.error("Failed to approve user", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Suspend/Reactivate user
export const toggleSuspendUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isSuspended = !user.isSuspended;
    await user.save();
    const userWithoutPassword = user.toObject();
    const { password, ...safeUser } = userWithoutPassword;
    res.json(safeUser);
  } catch (err) {
    logger.error("Failed to toggle suspend user", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Delete user
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    logger.error("Failed to delete user", err);
    res.status(500).json({ message: "Server error" });
  }
};
import bcrypt from "bcryptjs";
import { Request, Response } from "express";

import User from "../models/user.models";
import { generateToken } from "../utils/jwt";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "seller" | "buyer";
      };
    }
  }
}

export const register = async (req: Request, res: Response) => {
  const { fullName, email, password, role, location } = req.body;

  try {
    //check if user exists
    const isExist = await User.findOne({ email });
    if (isExist) {
      logger.info("User alredy exists");
      res.status(400).json({ success: false, message: "User already exists" });
      return;
    }

    //hashing pass
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
      // Save location for sellers if provided
      ...(location && {
        location: {
          city: location.city || undefined,
          address: location.address || undefined,
          latitude: location.latitude || undefined,
          longitude: location.longitude || undefined,
        },
      }),
    });

    await newUser.save();
    const token = generateToken({ id: newUser._id, email: newUser.email });
    logger.info("User created succesfully");
    res.status(201).json({
      success: true,
      user: { id: newUser._id, fullName, email, role },
      token,
    });
  } catch (err) {
    logger.error("Error registering user", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    //finding user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    //comparing the input pass to one in the db
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }
    const token = generateToken({ id: user._id, email: user.email });
    const safeUser = await User.findById(user._id).select("-password");
    logger.info("Login successful");
    res.status(200).json({ success: true, user: safeUser, token });
  } catch (err) {
    logger.error("Error while loging in", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res
      .status(401)
      .json({ success: false, message: "Authentication required" });
    return;
  }
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    logger.info(user);
    return res.status(200).json(user);
  } catch (err) {
    logger.error("Unable to get user");
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateSellerLocation = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res
      .status(401)
      .json({ success: false, message: "Authentication required" });
    return;
  }

  const { city, address, latitude, longitude } = req.body;

  try {
    if (!city || !address) {
      res
        .status(400)
        .json({ message: "City and address are required" });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          city,
          address,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
        },
      },
      { new: true }
    ).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    logger.info(`✅ Seller location updated: ${city}, ${address}`);
    res.status(200).json({
      message: "Location updated successfully",
      user,
    });
  } catch (err) {
    logger.error("Error updating seller location:", err);
    res.status(500).json({ message: "Server error" });
  }
};

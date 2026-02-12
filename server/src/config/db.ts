import mongoose from "mongoose";
import { logger } from "../utils/logger";

const mongoUrl = process.env.MONGOURL

if (!mongoUrl){
    throw new Error("MONGOURL is not defined in the environment variables");
    
}

export const connectDB = async () =>{
    try{
    await mongoose.connect(mongoUrl);
        logger.info("Connected to mongo successfully")
    } catch(err){
        logger.error("Monog connection failed", err)
        process.exit(1)
    }
}
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
export const connectDB = async () => {
  await mongoose.connect ("mongodb+srv://preranabedi4_db_user:cVJrOSIsq4volE88@cluster0.g3stzop.mongodb.net/MediCare")
  .then(() =>{
    console.log("DB CONNECTED")
  })

  cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
}
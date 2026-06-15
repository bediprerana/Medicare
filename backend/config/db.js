import mongoose from "mongoose";
export const connectDB = async () => {
  await mongoose.connect ("mongodb+srv://preranabedi4_db_user:cVJrOSIsq4volE88@cluster0.g3stzop.mongodb.net/MediCare")
  .then(() =>{
    console.log("DB CONNECTED")
  })
}
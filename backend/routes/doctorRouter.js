import express from "express";
import multer from "multer";

import {
  createDoctor,
  deleteDoctor,
  doctorLogin,
  getDoctors,
  toggleAvailability,
  updateDoctor,
} from "../controllers/doctorControllers.js";

import doctorAuth from "../middlewares/doctorAuth.js";

const doctorRouter = express.Router();

const upload = multer({ dest: "/tmp" });

doctorRouter.get("/", getDoctors);

doctorRouter.post("/login", doctorLogin);
doctorRouter.post("/", upload.single("image"), createDoctor);

// after login
doctorRouter.put("/:id", doctorAuth, upload.single("image"), updateDoctor);

doctorRouter.post(
  "/:id/toggle-availablity",
  doctorAuth,
  toggleAvailability
);

doctorRouter.delete("/:id", deleteDoctor);

export default doctorRouter;
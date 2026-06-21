import Appointment from "../models/Appoinment.js";
import Doctor from "../models/Doctor.js";
import dotenv from "dotenv";
import Stripe from "stripe";
import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/clerk-sdk-node";

dotenv.config();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const MAJOR_ADMIN_ID = process.env.MAJOR_ADMIN_ID || null;

const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" })
  : null;

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const buildFrontendBase = (req) => {
  if (FRONTEND_URL) return FRONTEND_URL.replace(/\/$/, "");

  const origin = req.get("origin") || req.get("referer");
  if (origin) return origin.replace(/\/$/, "");

  const host = req.get("host");
  if (host) return `${req.protocol || "http"}://${host}`.replace(/\/$/, "");

  return null;
};

function resolveClerkUserId(req) {
  try {
    const auth = req.auth || {};
    const fromReq =
      auth?.userId ||
      auth?.user_id ||
      auth?.user?.id ||
      req.user?.id ||
      null;

    if (fromReq) return fromReq;

    const serverAuth = getAuth(req);
    return serverAuth?.userId || null;
  } catch {
    return null;
  }
}

// GET ALL APPOINTMENTS
export const getAppointments = async (req, res) => {
  try {
    const {
      doctorId,
      mobile,
      status,
      search = "",
      limit: limitRaw = 50,
      page: pageRaw = 1,
      patientClerkId,
      createdBy,
    } = req.query;

    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};

    if (doctorId) filter.doctorId = doctorId;
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;
    if (patientClerkId) filter.createdBy = patientClerkId;
    if (createdBy) filter.createdBy = createdBy;

    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ patientName: re }, { mobile: re }, { notes: re }];
    }

    const items = await Appointment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("doctorId", "name specialization owner imageUrl image")
      .lean();

    const total = await Appointment.countDocuments(filter);

    return res.json({
      success: true,
      appointments: items,
      meta: { page, limit, total, count: items.length },
    });
  } catch (err) {
    console.error("Get Appointments Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// GET APPOINTMENTS BY PATIENT
export const getAppointmentsByPatient = async (req, res) => {
  try {
    const queryCreatedBy = req.query.createdBy || null;
    const clerkUserId = req.auth?.userId || null;
    const resolvedCreatedBy = queryCreatedBy || clerkUserId || null;

    if (!resolvedCreatedBy && !req.query.mobile) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const filter = {};

    if (resolvedCreatedBy) filter.createdBy = resolvedCreatedBy;
    if (req.query.mobile) filter.mobile = req.query.mobile;

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .lean();

    return res.json({
      success: true,
      appointments,
    });
  } catch (err) {
    console.error("GetAppointmentsByPatient Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// CREATE APPOINTMENT
export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      patientName,
      mobile,
      age = "",
      gender = "",
      date,
      time,
      fee,
      fees,
      notes = "",
      email,
      paymentMethod,
      owner: ownerFromBody = null,
      doctorName: doctorNameFromBody,
      speciality: specialityFromBody,
      doctorImageUrl: doctorImageUrlFromBody,
      doctorImagePublicId: doctorImagePublicIdFromBody,
    } = req.body || {};

    const clerkUserId = resolveClerkUserId(req);

    if (!clerkUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    if (!doctorId || !patientName || !mobile || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const numericFee = safeNumber(fee ?? fees ?? 0);

    if (numericFee == null || numericFee < 0) {
      return res.status(400).json({
        success: false,
        message: "Fee must be valid",
      });
    }

    const existingBooking = await Appointment.findOne({
      doctorId,
      createdBy: clerkUserId,
      date: String(date),
      time: String(time),
      status: { $ne: "Canceled" },
    }).lean();

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "You already have an appointment with this doctor at the selected slot",
      });
    }

    const doctor = await Doctor.findById(doctorId).lean();

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const resolvedOwner =
      ownerFromBody || doctor.owner || MAJOR_ADMIN_ID || String(doctorId);

    const doctorName =
      doctor.name?.trim() || doctorNameFromBody?.trim() || "";

    const speciality =
      doctor.specialization?.trim() ||
      doctor.speciality?.trim() ||
      specialityFromBody?.trim() ||
      "";

    const doctorImage = {
      url:
        doctor.imageUrl ||
        doctor.image ||
        doctor.avatarUrl ||
        doctor.profileImage?.url ||
        doctorImageUrlFromBody ||
        "",
      publicId:
        doctor.imagePublicId ||
        doctor.profileImage?.publicId ||
        doctorImagePublicIdFromBody ||
        "",
    };

    const base = {
      doctorId: String(doctor._id),
      doctorName,
      speciality,
      doctorImage,
      patientName: String(patientName).trim(),
      mobile: String(mobile).trim(),
      age: age ? Number(age) : undefined,
      gender,
      date: String(date),
      time: String(time),
      fees: numericFee,
      status: "Pending",
      payment: {
        method: paymentMethod === "Cash" ? "Cash" : "Online",
        status: "Pending",
        amount: numericFee,
      },
      notes,
      createdBy: clerkUserId,
      owner: resolvedOwner,
      sessionId: null,
    };

    if (numericFee === 0) {
      const created = await Appointment.create({
        ...base,
        status: "Confirmed",
        payment: {
          method: base.payment.method,
          status: "Paid",
          amount: 0,
        },
        paidAt: new Date(),
      });

      return res.status(201).json({
        success: true,
        appointment: created,
        checkoutUrl: null,
      });
    }

    if (paymentMethod === "Cash") {
      const created = await Appointment.create({
        ...base,
        payment: {
          method: "Cash",
          status: "Pending",
          amount: numericFee,
        },
      });

      return res.status(201).json({
        success: true,
        appointment: created,
        checkoutUrl: null,
      });
    }

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe not configured",
      });
    }

    const frontBase = buildFrontendBase(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `Appointment - ${patientName.slice(0, 40)}`,
            },
            unit_amount: Math.round(numericFee * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${frontBase}/appointment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontBase}/appointment/cancel`,
    });

    const created = await Appointment.create({
      ...base,
      sessionId: session.id,
      payment: {
        ...base.payment,
        providerId: session.payment_intent || null,
      },
    });

    return res.status(201).json({
      success: true,
      appointment: created,
      checkoutUrl: session.url || null,
    });
  } catch (err) {
    console.error("createAppointment unexpected:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// CONFIRM PAYMENT
export const confirmPayment = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Session Id is required",
      });
    }

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not setup",
      });
    }

    let session;

    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch (err) {
      console.error("stripe retrieve session error:", err);
      return res.status(404).json({
        success: false,
        message: "Stripe session not found",
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
      });
    }

    const appt = await Appointment.findOneAndUpdate(
      { sessionId: session_id },
      {
        "payment.status": "Paid",
        "payment.providerId": session.payment_intent || null,
        status: "Confirmed",
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!appt) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found for this payment session",
      });
    }

    return res.json({
      success: true,
      appointment: appt,
    });
  } catch (err) {
    console.error("ConfirmPayment error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// UPDATE APPOINTMENT
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const appt = await Appointment.findById(id);

    if (!appt) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const terminal = appt.status === "Completed" || appt.status === "Canceled";

    if (terminal && body.status && body.status !== appt.status) {
      return res.status(400).json({
        success: false,
        message: "Cannot change status of a completed/canceled appointment",
      });
    }

    const update = {};

    if (body.status) update.status = body.status;
    if (body.notes !== undefined) update.notes = body.notes;

    if (body.date && body.time) {
      if (terminal) {
        return res.status(400).json({
          success: false,
          message: "Cannot reschedule completed/canceled appointment",
        });
      }

      update.date = body.date;
      update.time = body.time;
      update.status = "Rescheduled";
      update.rescheduledTo = {
        date: body.date,
        time: body.time,
      };
    }

    const updated = await Appointment.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .populate("doctorId", "name imageUrl")
      .lean();

    return res.json({
      success: true,
      appointment: updated,
    });
  } catch (err) {
    console.error("updateAppointment error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// CANCEL APPOINTMENT
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appt = await Appointment.findById(id);

    if (!appt) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    appt.status = "Canceled";
    await appt.save();

    return res.json({
      success: true,
      appointment: appt,
    });
  } catch (err) {
    console.error("cancelAppointment error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET STATS
export const getStats = async (req, res) => {
  try {
    const total = await Appointment.countDocuments();

    const paidAgg = await Appointment.aggregate([
      { $match: { "payment.status": "Paid" } },
      { $group: { _id: null, total: { $sum: "$fees" } } },
    ]);

    const revenue = paidAgg[0]?.total || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recent = await Appointment.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    return res.json({
      success: true,
      stats: {
        total,
        revenue,
        recentLast7Days: recent,
      },
    });
  } catch (err) {
    console.error("getStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET APPOINTMENTS BY DOCTOR
export const getAppointmentsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor Id required",
      });
    }

    const {
      mobile,
      status,
      search = "",
      limit: limitRaw = 50,
      page: pageRaw = 1,
    } = req.query;

    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = { doctorId };

    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;

    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ patientName: re }, { mobile: re }, { notes: re }];
    }

    const items = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit)
      .populate("doctorId", "name specialization owner imageUrl image")
      .lean();

    const total = await Appointment.countDocuments(filter);

    return res.json({
      success: true,
      appointments: items,
      meta: {
        page,
        limit,
        total,
        count: items.length,
      },
    });
  } catch (err) {
    console.error("getAppointmentsByDoctor error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET REGISTERED USER COUNT
export async function getRegisteruSerCount(req, res) {
  try {
    const totalUsers = await clerkClient.users.getCount();

    return res.json({
      success: true,
      totalUsers,
    });
  } catch (err) {
    console.error("getRegisterUserCount error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default {
  getAppointments,
  getAppointmentsByPatient,
  createAppointment,
  confirmPayment,
  updateAppointment,
  cancelAppointment,
  getStats,
  getAppointmentsByDoctor,
  getRegisteruSerCount,
};
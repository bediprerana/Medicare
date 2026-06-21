import React, { useEffect, useRef, useState } from "react";
import { doctorDetailStyles as s } from "../assets/dummyStyles";
import { User, Eye, EyeOff, X, XCircle, EyeClosed, Calendar, Plus, Trash2 } from "lucide-react";

function timeStringToMinutes(t) {
  if (!t) return 0;

  const [hhmm, ampm] = t.split(" ");
  let [h, m] = hhmm.split(":").map(Number);

  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  return h * 60 + m;
}

function formatDateISO(iso) {
  if (!iso) return "";

  const [y, m, d] = iso.split("-");
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "June",
    "July",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = String(Number(d));
  const month = monthNames[dateObj.getMonth()] || "";

  return `${day} ${month} ${y}`;
}

const AddPage = () => {
  const [doctorList, setDoctorList] = useState([]);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    specialization: "",
    imageFile: null,
    imagePreview: "",
    experience: "",
    qualifications: "",
    location: "",
    about: "",
    fee: "",
    success: "",
    patients: "",
    rating: "",
    schedule: {},
    availability: "Available",
    email: "",
    password: "",
  });

  const [slotDate, setSlotDate] = useState("");
  const [slotHour, setSlotHour] = useState("");
  const [slotMinute, setSlotMinute] = useState("00");
  const [slotAmpm, setSlotAmpm] = useState("AM");

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [today] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (!toast.show) return;

    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  function handleImage(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (form.imagePreview && form.imageFile) {
      URL.revokeObjectURL(form.imagePreview);
    }

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  }

  function removeImage() {
    if (form.imagePreview && form.imageFile) {
      URL.revokeObjectURL(form.imagePreview);
    }

    setForm((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function addSlotToForm() {
    if (!slotDate || !slotHour) {
      showToast("error", "Select date and time");
      return;
    }

    if (slotDate < today) {
      showToast("error", "Cannot add a slot in the past");
      return;
    }

    const time = `${slotHour}:${slotMinute} ${slotAmpm}`;

    if (slotDate === today) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const slotMinutes = timeStringToMinutes(time);

      if (slotMinutes <= nowMinutes) {
        showToast("error", "Cannot add a time that has already passed today");
        return;
      }
    }

    setForm((prev) => {
      const schedule = { ...prev.schedule };

      if (!schedule[slotDate]) {
        schedule[slotDate] = [];
      }

      if (!schedule[slotDate].includes(time)) {
        schedule[slotDate].push(time);
      }

      schedule[slotDate].sort(
        (a, b) => timeStringToMinutes(a) - timeStringToMinutes(b)
      );

      return {
        ...prev,
        schedule,
      };
    });

    setSlotHour("");
    setSlotMinute("00");
    setSlotAmpm("AM");
  }

  function removeSlot(date, time) {
    setForm((prev) => {
      const schedule = { ...prev.schedule };

      schedule[date] = schedule[date].filter((item) => item !== time);

      if (!schedule[date].length) {
        delete schedule[date];
      }

      return {
        ...prev,
        schedule,
      };
    });
  }

  function getFlatSlots(schedule) {
    const arr = [];

    Object.keys(schedule)
      .sort()
      .forEach((date) => {
        schedule[date].forEach((time) => {
          arr.push({ date, time });
        });
      });

    return arr;
  }

  function validate(data) {
    const requiredFields = [
      "name",
      "specialization",
      "experience",
      "qualifications",
      "location",
      "about",
      "fee",
      "success",
      "patients",
      "rating",
      "email",
      "password",
    ];

    for (let field of requiredFields) {
      if (!data[field]) return false;
    }

    if (!data.imageFile) return false;
    if (!Object.keys(data.schedule).length) return false;

    return true;
  }

  async function handleAdd(e) {
    e.preventDefault();

    if (!validate(form)) {
      showToast("error", "Fill all fields, upload image and add slot");
      return;
    }

    const ratingValue = Number(form.rating);

    if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      showToast("error", "Rating must be between 1 and 5");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();

      fd.append("name", form.name);
      fd.append("specialization", form.specialization);
      fd.append("experience", form.experience);
      fd.append("qualifications", form.qualifications);
      fd.append("location", form.location);
      fd.append("about", form.about);
      fd.append("fee", form.fee);
      fd.append("success", form.success);
      fd.append("patients", form.patients);
      fd.append("rating", form.rating);
      fd.append("availability", form.availability);
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("schedule", JSON.stringify(form.schedule));

      if (form.imageFile) {
        fd.append("image", form.imageFile);
      }

      const res = await fetch("http://localhost:4000/api/doctors", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showToast("error", data?.message || `Server error ${res.status}`);
        return;
      }

      showToast("success", "Doctor Added Successfully!");

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      const doctorFromServer = data?.data || {
        id: Date.now(),
        ...form,
        imageUrl: form.imagePreview,
      };

      setDoctorList((prev) => [doctorFromServer, ...prev]);

      if (form.imagePreview && form.imageFile) {
        URL.revokeObjectURL(form.imagePreview);
      }

      setForm({
        name: "",
        specialization: "",
        imageFile: null,
        imagePreview: "",
        experience: "",
        qualifications: "",
        location: "",
        about: "",
        fee: "",
        success: "",
        patients: "",
        rating: "",
        schedule: {},
        availability: "Available",
        email: "",
        password: "",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSlotDate("");
      setSlotHour("");
      setSlotMinute("00");
      setSlotAmpm("AM");
      setShowPassword(false);
    } catch (err) {
      console.error("submit error:", err);
      showToast("error", "Network or server error");
    } finally {
      setLoading(false);
    }
  }

  const slots = getFlatSlots(form.schedule);

  return (
    <div className={s.pageContainer}>
      {toast.show && (
        <div
          className={
            toast.type === "success"
              ? "fixed top-5 right-5 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg"
              : "fixed top-5 right-5 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg"
          }
        >
          {toast.message}
        </div>
      )}

      <div className={`${s.maxWidthContainerLg} ${s.headerContainer}`}>
        <div className={s.headerFlexContainer}>
          <div className={s.headerIconContainer}>
            <User className="text-white" size={32} />
          </div>

          <h1 className={s.headerTitle}>Add New Doctor</h1>
        </div>
      </div>

      <div className={`${s.maxWidthContainer} ${s.formContainer}`}>
        <form onSubmit={handleAdd} className={s.formGrid}>
          <div className="md:col-span-2">
            <label className={s.label}>Upload Profile Image</label>

            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImage}
                className={s.fileInput}
              />

              {form.imagePreview && (
                <div className="relative group">
                  <img
                    src={form.imagePreview}
                    alt="preview"
                    className={s.imagePreview}
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    className={s.removeImageButton + " " + s.cursorPointer}
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
<input
className={s.inputBase}
placeholder="Full Name"
value={form.name}
onChange={(e) => setForm({...form, name: e.target.value})}/>


<input
className={s.inputBase}
placeholder="Specialization"
value={form.specialization}
onChange={(e) => setForm({...form, specialization: e.target.value})}/>
         

          <input
className={s.inputBase}
placeholder="Location"
value={form.location}
onChange={(e) => setForm({...form, location: e.target.value})}/>
        
<input
className={s.inputBase}
placeholder="Experience"
value={form.experience}
onChange={(e) => setForm({...form, experience: e.target.value})}/>

          <input
className={s.inputBase}
placeholder="qualification"
value={form.qualification}
onChange={(e) => setForm({...form, qualification: e.target.value})}/>

          <input
className={s.inputBase}
placeholder="Consultation Fee"
value={form.fee}
onChange={(e) => setForm({...form, fee: e.target.value})}/>

          

          <input
            className={s.inputBase}
            placeholder="Rating (1.0 - 5.0)"
            type="number"
            min={1}
            max={5}
            step={0.1}
            value={form.rating}
            onChange={(e) => {
              const v = e.target.value;

              // allow clearing
              if (v === "") {
                setForm((p) => ({ ...p, rating: "" }));
                return;
              }

              const n = Number(v);
              if (Number.isNaN(n)) return;

              // clamp between 1 and 5
              const clamped = Math.max(1, Math.min(5, n));

              // keep only 1 decimal place
              const fixed = Math.round(clamped * 10) / 10;

              setForm((p) => ({ ...p, rating: fixed.toString() }));
            }}
            onBlur={() => {
              // force 1 decimal place on blur
              setForm((p) => {
                if (!p.rating) return p;
                const n = Number(p.rating);
                if (Number.isNaN(n)) return { ...p, rating: "" };

                const clamped = Math.max(1, Math.min(5, n));
                return { ...p, rating: clamped.toFixed(1) };
              });
            }}
          />
   <input
className={s.inputBase}
placeholder="Patients"
value={form.patients}
onChange={(e) => setForm({...form, patients: e.target.value})}/>

   <input
className={s.inputBase}
placeholder="Success Rate"
value={form.success}
onChange={(e) => setForm({...form, success: e.target.value})}/>

   <input
className={s.inputBase}
placeholder="Doctor Email"
value={form.email}
onChange={(e) => setForm({...form, email: e.target.value})}/>

<div className="relative">
  <input
    className={s.inputBase + " " + s.inputWithIcon}
    placeholder="Doctor Password"
    type={showPassword ? "text" : "password"}
    value={form.password}
    onChange={(e) =>
      setForm({
        ...form,
        password: e.target.value,
      })
    }
  />
  <button type="button" onClick={() => setShowPassword((s) => !s)}
    className={s.passwordToggleButton + " "+s.cursorPointer}>
      {showPassword ? <Eye size={18}/> : <EyeClosed size={18}/> }
    </button>
</div> 

<select className={s.inputBase} value= {form.availability}
onChange={(e) => {
  setForm({
    ...form, availability:e.target.value,
  })
}}
>
<option value="Available">Available</option>
<option value="Unavailable">Unavailable</option>
</select>
<textarea className={s.textareaBase + " md:col-span-2"}
rows={3} placeholder="About Doctor"
value={form.about}
onChange={(e) =>
  setForm({
    ...form,about:e.target.value,
  })
}></textarea>

  {/* SCHEDULE */}
          <div className={s.scheduleContainer + " md:col-span-2"}>
            <div className={s.scheduleHeader}>
              <Calendar className="text-emerald-600" />
              <p className={s.scheduleTitle}>Add Schedule Slots</p>
            </div>

            <div className={s.scheduleInputsContainer}>
              <input
                type="date"
                value={slotDate}
                min={today}
                onChange={(e) => setSlotDate(e.target.value)}
                className={s.scheduleDateInput}
              />

              <select
                value={slotHour}
                onChange={(e) => setSlotHour(e.target.value)}
                className={s.scheduleTimeSelect}
              >
                <option value="">Hour</option>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={String(i + 1)}>
                    {i + 1}
                  </option>
                ))}
              </select>

              <select
                value={slotMinute}
                onChange={(e) => setSlotMinute(e.target.value)}
                className={s.scheduleTimeSelect}
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={String(i).padStart(2, "0")}>
                    {String(i).padStart(2, "0")}
                  </option>
                ))}
              </select>

              <select
                value={slotAmpm}
                onChange={(e) => setSlotAmpm(e.target.value)}
                className={s.scheduleTimeSelect}
              >
                <option>AM</option>
                <option>PM</option>
              </select>

              <button
                type="button"
                onClick={addSlotToForm}
                className={s.addSlotButton + " " + s.cursorPointer}
              >
                <Plus size={18} /> Add Slot
              </button>
            </div>

            <div className={s.slotsGrid}>
              {getFlatSlots(form.schedule).map(({ date, time }) => (
                <div
                  key={date + time}
                  className={s.slotItem + " " + s.cursorPointer}
                >
                  <span>
                    {formatDateISO(date)} — {time}
                  </span>
                  <button
                    onClick={() => removeSlot(date, time)}
                    className="text-rose-500"
                    aria-label={`Remove slot ${date} ${time}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

    {/* TOAST */}
      {toast.show && (
        <div
          className={s.toastContainer + " " + 
            (toast.type === "success" ? s.toastSuccess : s.toastError)}
        >
          {toast.type === "success" ? (
            <CheckCircle size={22} />
          ) : (
            <XCircle size={22} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

<div className={s.submitButtonContainer}>
  <button
    type="submit"
    disabled={loading}
    className={
      s.submitButton +
      " " +
      s.cursorPointer +
      " " +
      (loading
        ? s.submitButtonDisabled
        : s.submitButtonEnabled)
    }
  >
    {loading ? "Adding..." : "Add Doctor to Team"}
  </button>
</div>

export default AddPage;

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <div>
      <label className={s.label}>{label}</label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={s.input}
      />
    </div>
  );
}
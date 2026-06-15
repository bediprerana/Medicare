import React, { useEffect, useState, useMemo } from 'react'
import { dashboardStyles as s } from '../assets/dummyStyles'
import {
  BadgeIndianRupee,
  CalendarRange,
  CheckCircle,
  Search,
  UserRoundCheck,
  Users,
  XCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:4000';
const PATIENT_COUNT_API = `${API_BASE}/api/appointments/patients/count`;

// helper function
const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeDoctor(doc) {
  const id = doc._id || doc.id || String(Math.random()).slice(2);

  const name =
    doc.name ||
    doc.fullName ||
    `${doc.firstName || ""} ${doc.lastName || ""}`.trim() ||
    "Unknown";

  const specialization =
    doc.specialization ||
    doc.speciality ||
    (Array.isArray(doc.specializations)
      ? doc.specializations.join(", ")
      : "") ||
    "General";

  const fee = safeNumber(
    doc.fee ?? doc.fees ?? doc.consultationFee ?? doc.consultation_fee ?? 0,
    0
  );

  const image =
    doc.imageUrl ||
    doc.image ||
    doc.avatar ||
    `https://i.pravatar.cc/150?u=${id}`;

  const appointments = {
    total:
      doc.appointments?.total ??
      doc.totalAppointments ??
      doc.appointmentsTotal ??
      0,
    completed:
      doc.appointments?.completed ??
      doc.completedAppointments ??
      doc.appointmentsCompleted ??
      0,
    canceled:
      doc.appointments?.canceled ??
      doc.canceledAppointments ??
      doc.appointmentsCanceled ??
      0,
  };

  let earnings = null;

  if (doc.earnings !== undefined && doc.earnings !== null)
    earnings = safeNumber(doc.earnings, 0);
  else if (doc.revenue !== undefined && doc.revenue !== null)
    earnings = safeNumber(doc.revenue, 0);
  else if (appointments.completed && fee)
    earnings = fee * safeNumber(appointments.completed, 0);
  else earnings = 0;

  return {
    id,
    name,
    specialization,
    fee,
    image,
    appointments,
    earnings,
    raw: doc,
  };
}

const DashboardPage = () => {

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [patientCount, setPatientCount] = useState(null);
  const [patientCountLoading, setPatientCountLoading] = useState(false);

    // ✅ ADD THESE (FIX)
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDoctors() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/doctors?limit=200`);

        if (!res.ok)
          throw new Error(`Failed to fetch doctors (${res.status})`);

        const body = await res.json();

        let list = [];
        if (Array.isArray(body)) list = body;
        else if (Array.isArray(body.doctors)) list = body.doctors;
        else if (Array.isArray(body.data)) list = body.data;
        else if (Array.isArray(body.items)) list = body.items;

        const normalized = list.map(normalizeDoctor);

        if (mounted) setDoctors(normalized);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(err.message);
          setDoctors([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDoctors();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPatientCount() {
      setPatientCountLoading(true);

      try {
        const res = await fetch(PATIENT_COUNT_API);

        if (!res.ok) {
          if (mounted) setPatientCount(0);
          return;
        }

        const body = await res.json();
        const count = Number(
          body?.count ?? body?.totalUsers ?? body?.data ?? 0
        );

        if (mounted) setPatientCount(isNaN(count) ? 0 : count);
      } catch {
        if (mounted) setPatientCount(0);
      } finally {
        if (mounted) setPatientCountLoading(false);
      }
    }

    loadPatientCount();
    return () => (mounted = false);
  }, []);

 const totals = useMemo(() => {
  return {
    totalDoctors: doctors.length,
    totalAppointments: doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.total, 0),
      0
    ),
    totalEarnings: doctors.reduce(
      (s, d) => s + safeNumber(d.earnings, 0),
      0
    ),
    completed: doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.completed, 0),
      0
    ),
    canceled: doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.canceled, 0),
      0
    ),
  };
}, [doctors]);

// ✅ Filter doctors based on search
const filteredDoctors = doctors.filter((doc) => {
  const q = query.toLowerCase();

  return (
    doc.name.toLowerCase().includes(q) ||
    doc.specialization.toLowerCase().includes(q) ||
    String(doc.fee).includes(q)
  );
});

// ✅ Show limited or all doctors
const visibleDoctors = showAll ? filteredDoctors : filteredDoctors.slice(0, 5);
return (
  <div className={s.pageContainer}>
    <div className={s.maxWidthContainer}>

      <h1 className={s.headerTitle}>DASHBOARD</h1>

      {/* ✅ STATS GRID */}
      <div className={s.statsGrid}>

        <StatsCard
          icon={<Users className="w-6 h-6" />}
          label="Total Doctors"
          value={totals.totalDoctors}
        />

        <StatsCard
          icon={<UserRoundCheck className="w-6 h-6" />}
          label="Total Registered Users"
          value={patientCountLoading ? "Loading..." : (patientCount ?? 0)}
        />

        <StatsCard
          icon={<CalendarRange className="w-6 h-6" />}
          label="Total Appointments"
          value={totals.totalAppointments}
        />

        <StatsCard
          icon={<BadgeIndianRupee className="w-6 h-6" />}
          label="Total Earnings"
          value={`₹${totals.totalEarnings.toLocaleString()}`}
        />

        <StatsCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Completed"
          value={totals.completed}
        />

        <StatsCard
          icon={<XCircle className="w-6 h-6" />}
          label="Cancelled"
          value={totals.canceled}
        />

      </div> {/* ✅ CLOSED statsGrid properly */}

      {/* ✅ SEARCH SECTION */}
      <div className="mb-6">
        <label className={s.searchLabel}>Search Doctors</label>

        <div className={s.searchContainer}>
          
          <div className={s.searchInputContainer}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={s.searchInput}
              placeholder="Search name / Specialization / fee"
            />

            <Search className={s.searchIcon} />
          </div>

          <button
            onClick={() => {
              setQuery("");
              setShowAll(false);
            }}
            className={s.clearButton + " " + s.cursorPointer}
          >
            Clear
          </button>

        </div>
      </div>

<div className={s.tableContainer}>
  <div className={s.tableHeader}>
    <h2 className={s.tableTitle}>Doctors</h2>
    <p className={s.tableCount}>
      {loading ? "Loading..." :
      `Showing ${visibleDoctors.length} of ${filteredDoctors.length}`}
    </p>
  </div>
</div>
    </div>
  </div>
);
}
export default DashboardPage;


// ✅ FIXED COMPONENT
function StatsCard({ icon, label, value }) {
  return (
    <div className={s.statsCard}>
      <div className={s.statCardContent}>
        <div className={s.statsIconContainer}>{icon}</div>
        <div className="flex-1">
          <div className={s.statLabel}>{label}</div>
          <div className={s.statValue}>{value}</div>
        </div>
      </div>
    </div>
  
  );
}
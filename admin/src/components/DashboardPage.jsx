import React, { useEffect, useMemo, useState } from "react";
import { dashboardStyles as s } from "../assets/dummyStyles";
import {
  BadgeIndianRupee,
  CalendarRange,
  CheckCircle,
  Search,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";

const API_BASE = "http://localhost:4000";
const PATIENT_COUNT_API = `${API_BASE}/api/appointments/patients/count`;
const INITIAL_COUNT = 8;

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
    (Array.isArray(doc.specializations) ? doc.specializations.join(", ") : "") ||
    "General";

  const fee = safeNumber(
    doc.fee ?? doc.fees ?? doc.consultationFee ?? doc.consultation_fee ?? 0
  );

  const image =
    doc.imageUrl ||
    doc.image ||
    doc.avatar ||
    `https://i.pravatar.cc/150?u=${id}`;

  const appointments = {
    total: doc.appointments?.total ?? doc.totalAppointments ?? 0,
    completed: doc.appointments?.completed ?? doc.completedAppointments ?? 0,
    canceled: doc.appointments?.canceled ?? doc.canceledAppointments ?? 0,
  };

  const earnings =
    doc.earnings !== undefined
      ? safeNumber(doc.earnings)
      : doc.revenue !== undefined
      ? safeNumber(doc.revenue)
      : appointments.completed && fee
      ? fee * safeNumber(appointments.completed)
      : 0;

  return {
    id,
    name,
    specialization,
    fee,
    image,
    appointments,
    earnings,
  };
}

const DashboardPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [patientCount, setPatientCount] = useState(1);
  const [patientCountLoading, setPatientCountLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadDoctors = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/doctors?limit=200`);

        if (!res.ok) {
          throw new Error(`Failed to fetch doctors (${res.status})`);
        }

        const body = await res.json();

        let list = [];
        if (Array.isArray(body)) list = body;
        else if (Array.isArray(body.doctors)) list = body.doctors;
        else if (Array.isArray(body.data)) list = body.data;
        else if (Array.isArray(body.items)) list = body.items;

        if (mounted) {
          setDoctors(list.map(normalizeDoctor));
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(err.message);
          setDoctors([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDoctors();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPatientCount = async () => {
      setPatientCountLoading(true);

      try {
        const res = await fetch(PATIENT_COUNT_API);

        if (!res.ok) {
          if (mounted) setPatientCount(1);
          return;
        }

        const body = await res.json();
        const count = Number(body?.count ?? body?.totalUsers ?? body?.data ?? 1);

        if (mounted) {
          setPatientCount(Math.max(Number.isNaN(count) ? 1 : count, 1));
        }
      } catch (err) {
        console.error(err);
        if (mounted) setPatientCount(1);
      } finally {
        if (mounted) setPatientCountLoading(false);
      }
    };

    loadPatientCount();

    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    return {
      totalDoctors: doctors.length,
      totalAppointments: doctors.reduce(
        (sum, d) => sum + safeNumber(d.appointments?.total),
        0
      ),
      totalEarnings: doctors.reduce(
        (sum, d) => sum + safeNumber(d.earnings),
        0
      ),
      completed: doctors.reduce(
        (sum, d) => sum + safeNumber(d.appointments?.completed),
        0
      ),
      canceled: doctors.reduce(
        (sum, d) => sum + safeNumber(d.appointments?.canceled),
        0
      ),
    };
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return doctors;

    return doctors.filter((doc) => {
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.specialization.toLowerCase().includes(q) ||
        String(doc.fee).includes(q)
      );
    });
  }, [doctors, query]);

  const visibleDoctors = showAll
    ? filteredDoctors
    : filteredDoctors.slice(0, INITIAL_COUNT);

  return (
    <div className={s.pageContainer}>
      <div className={s.maxWidthContainer}>
        <h1 className={s.headerTitle}>DASHBOARD</h1>

        <div className={s.statsGrid}>
          <StatsCard
            icon={<Users className="w-6 h-6" />}
            label="Total Doctors"
            value={totals.totalDoctors}
          />

          <StatsCard
            icon={<UserRoundCheck className="w-6 h-6" />}
            label="Total Registered Users"
            value={patientCountLoading ? "Loading..." : patientCount}
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
        </div>

        <div className="mb-6">
          <label className={s.searchLabel}>Search Doctors</label>

          <div className={s.searchContainer}>
            <div className={s.searchInputContainer}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={s.searchInput}
                placeholder="Search name / specialization / fee"
              />
              <Search className={s.searchIcon} />
            </div>

            <button
              onClick={() => {
                setQuery("");
                setShowAll(false);
              }}
              className={`${s.clearButton} ${s.cursorPointer}`}
            >
              Clear
            </button>
          </div>
        </div>

        <div className={s.tableContainer}>
          <div className={s.tableHeader}>
            <h2 className={s.tableTitle}>Doctors</h2>

            <p className={s.tableCount}>
              {loading
                ? "Loading..."
                : `Showing ${visibleDoctors.length} of ${filteredDoctors.length}`}
            </p>
          </div>

          {error && (
            <div className={s.errorContainer}>
              Error loading doctors: {error}
            </div>
          )}

          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th className={s.tableHeaderCell}>Doctor</th>
                  <th className={s.tableHeaderCell}>Specialization</th>
                  <th className={s.tableHeaderCell}>Fee</th>
                  <th className={s.tableHeaderCell}>Appointments</th>
                  <th className={s.tableHeaderCell}>Completed</th>
                  <th className={s.tableHeaderCell}>Canceled</th>
                  <th className={s.tableHeaderCell}>Total Earnings</th>
                </tr>
              </thead>

              <tbody className={s.tableBody}>
                {visibleDoctors.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`${s.tableRow} ${
                      idx % 2 === 0 ? s.tableRowEven : s.tableRowOdd
                    }`}
                  >
                    <td className={`${s.tableCell} ${s.tableCellFlex}`}>
                      <div className={s.verticalLine} />
                      <img src={d.image} alt={d.name} className={s.doctorImage} />

                      <div>
                        <div className={s.doctorName}>{d.name}</div>
                        <div className={s.doctorId}>ID: {d.id}</div>
                      </div>
                    </td>

                    <td className={`${s.tableCell} ${s.doctorSpecialization}`}>
                      {d.specialization}
                    </td>

                    <td className={`${s.tableCell} ${s.feeText}`}>₹ {d.fee}</td>

                    <td className={`${s.tableCell} ${s.appointmentsText}`}>
                      {d.appointments.total}
                    </td>

                    <td className={`${s.tableCell} ${s.completedText}`}>
                      {d.appointments.completed}
                    </td>

                    <td className={`${s.tableCell} ${s.canceledText}`}>
                      {d.appointments.canceled}
                    </td>

                    <td className={`${s.tableCell} ${s.earningsText}`}>
                      ₹ {d.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={s.mobileDoctorContainer}>
            <div className={s.mobileDoctorGrid}>
              {visibleDoctors.map((d) => (
                <MobileDoctorCard key={d.id} d={d} />
              ))}
            </div>
          </div>

          {filteredDoctors.length > INITIAL_COUNT && (
            <div className={s.showMoreContainer}>
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className={`${s.showMoreButton} ${s.cursorPointer}`}
              >
                {showAll
                  ? "Show Less"
                  : `Show More (${filteredDoctors.length - INITIAL_COUNT})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

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

function MobileDoctorCard({ d }) {
  return (
    <div className={s.mobileDoctorCard}>
      <div className={s.mobileDoctorHeader}>
        <div className="flex items-center gap-3">
          <img src={d.image} alt={d.name} className={s.mobileDoctorImage} />

          <div>
            <div className={s.mobileDoctorName}>{d.name}</div>
            <div className={s.mobileDoctorSpecialization}>
              {d.specialization}
            </div>
          </div>
        </div>

        <div className={s.mobileDoctorFee}>₹{d.fee}</div>
      </div>

      <div className={s.mobileStatsGrid}>
        <div>
          <div className={s.mobileStatLabel}>Appts</div>
          <div className={s.mobileStatValue}>{d.appointments.total}</div>
        </div>

        <div>
          <div className={s.mobileStatLabel}>Done</div>
          <div className={`${s.mobileStatValue} ${s.textEmerald600}`}>
            {d.appointments.completed}
          </div>
        </div>

        <div>
          <div className={s.mobileStatLabel}>Cancel</div>
          <div className={`${s.mobileStatValue} ${s.textRose500}`}>
            {d.appointments.canceled}
          </div>
        </div>
      </div>

      <div className={s.mobileEarningsContainer}>
        <div>Earned</div>
        <div className="font-semibold">₹ {d.earnings.toLocaleString()}</div>
      </div>
    </div>
  );
}
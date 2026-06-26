import React, { useEffect, useMemo, useRef, useState } from "react";
import { serviceDashboardStyles } from "../assets/dummyStyles";
import { ClipboardList } from "lucide-react";

// normalize the backend data that is coming from the db
function normalizeService(doc) {
  if (!doc) return null;

  const id = doc._id || doc.id || String(Math.random()).slice(2);
  const name = doc.name || doc.title || doc.serviceName || "Untitled Service";

  const price =
    Number(doc.price ?? doc.fee ?? doc.fees ?? doc.cost ?? doc.amount) || 0;

  const image =
    doc.imageUrl ||
    doc.image ||
    doc.avatar ||
    `https://i.pravatar.cc/150?u=${id}`;

  const totalAppointments =
    doc.totalAppointments ??
    doc.appointments?.total ??
    doc.count ??
    doc.stats?.total ??
    doc.bookings ??
    0;

  const completed =
    doc.completed ??
    doc.appointments?.completed ??
    doc.stats?.completed ??
    doc.completedAppointments ??
    0;

  const canceled =
    doc.canceled ??
    doc.appointments?.canceled ??
    doc.stats?.canceled ??
    doc.canceledAppointments ??
    0;

  return {
    id,
    name,
    price,
    image,
    totalAppointments: Number(totalAppointments) || 0,
    completed: Number(completed) || 0,
    canceled: Number(canceled) || 0,
    raw: doc,
  };
}

const API_BASE = "http://localhost:4000";

const ServiceDashboard = ({ services: servicesProp = null }) => {
  const [services, setServices] = useState(
    Array.isArray(servicesProp) ? servicesProp.map(normalizeService) : []
  );

  const [loading, setLoading] = useState(!Array.isArray(servicesProp));
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const pollHandleRef = useRef(null);

  function buildFetchOptions() {
    const opts = {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const token = localStorage.getItem("authToken");

    if (token) {
      opts.headers["Authorization"] = `Bearer ${token}`;
    }

    return opts;
  }

  async function fetchServices({ showLoading = true } = {}) {
    if (fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      const url = `${API_BASE}/api/service-appointments/stats/summary`;
      const res = await fetch(url, buildFetchOptions());

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));

        throw new Error(
          body?.message || `Failed to fetch services (${res.status})`
        );
      }

      const body = await res.json();

      let list = [];

      if (Array.isArray(body)) list = body;
      else if (Array.isArray(body.services)) list = body.services;
      else if (Array.isArray(body.data)) list = body.data;
      else if (Array.isArray(body.items)) list = body.items;
      else {
        const maybeArray = Object.values(body).find((v) => Array.isArray(v));
        if (maybeArray) list = maybeArray;
      }

      const normalized = (list || []).map(normalizeService).filter(Boolean);

      if (mountedRef.current) {
        setServices(normalized);
        setError(null);
      }
    } catch (err) {
      console.error("Service fetch error:", err);

      if (mountedRef.current) {
        setError(err.message || "Failed to load services");
      }
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }

      fetchingRef.current = false;
    }
  }

  useEffect(() => {
    window.refreshServices = () => fetchServices({ showLoading: true });

    return () => {
      try {
        delete window.refreshServices;
      } catch {}
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (Array.isArray(servicesProp)) {
      setServices(servicesProp.map(normalizeService).filter(Boolean));
      setLoading(false);

      return () => {
        mountedRef.current = false;
      };
    }

    fetchServices({ showLoading: true });

    function startPolling() {
      if (pollHandleRef.current) return;

      pollHandleRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchServices({ showLoading: false });
        }
      }, 10000);
    }

    function stopPolling() {
      if (pollHandleRef.current) {
        clearInterval(pollHandleRef.current);
        pollHandleRef.current = null;
      }
    }

    startPolling();

    function onFocus() {
      fetchServices({ showLoading: false });
    }

    window.addEventListener("focus", onFocus);

    function onServicesUpdated() {
      fetchServices({ showLoading: false });
    }

    window.addEventListener("services:updated", onServicesUpdated);

    function onStorage(e) {
      if (e?.key === "service_bookings_updated") {
        fetchServices({ showLoading: false });
      }
    }

    window.addEventListener("storage", onStorage);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchServices({ showLoading: false });
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mountedRef.current = false;
      stopPolling();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("services:updated", onServicesUpdated);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [servicesProp]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return services;

    const qNum = Number(q);

    return services.filter((service) => {
      if (service.name.toLowerCase().includes(q)) return true;
      if (!Number.isNaN(qNum) && service.price <= qNum) return true;
      if (service.price.toString().includes(q)) return true;

      return false;
    });
  }, [services, searchQuery]);

  const INITIAL_COUNT = 8;

  const visibleServices = showAll
    ? filteredServices
    : filteredServices.slice(0, INITIAL_COUNT);

  const totals = useMemo(() => {
    return filteredServices.reduce(
      (acc, service) => {
        acc.totalServices += 1;
        acc.totalAppointments += service.totalAppointments;
        acc.totalCompleted += service.completed;
        acc.totalCanceled += service.canceled;
        acc.totalEarning += service.completed * service.price;

        return acc;
      },
      {
        totalServices: 0,
        totalAppointments: 0,
        totalCompleted: 0,
        totalCanceled: 0,
        totalEarning: 0,
      }
    );
  }, [filteredServices]);

  function formatCurrency(v) {
    return `₹${Number(v || 0).toLocaleString()}`;
  }

  return (
    <div className={serviceDashboardStyles.container}>
      <div className={serviceDashboardStyles.innerContainer}>
        {/* header */}
        <div className={serviceDashboardStyles.header.container}>
          <div>
            <h1 className={serviceDashboardStyles.header.title}>
              Service Dashboard
            </h1>

            <p className={serviceDashboardStyles.header.subtitle}>
              Overview of service, appointments and earnings
            </p>
          </div>

          {/* refresh */}
          <div className={serviceDashboardStyles.refresh.container}>
            <div className={serviceDashboardStyles.refresh.countText}>
              {loading
                ? "Loading..."
                : `${filteredServices.length} service${
                    filteredServices.length !== 1 ? "s" : ""
                  }`}
            </div>

            <button
              type="button"
              onClick={() => {
                if (Array.isArray(servicesProp)) return;
                fetchServices({ showLoading: true });
              }}
              className={
                typeof serviceDashboardStyles.refresh.button === "function"
                  ? serviceDashboardStyles.refresh.button(
                      Array.isArray(servicesProp)
                    )
                  : serviceDashboardStyles.refresh.button
              }
              title={
                Array.isArray(servicesProp)
                  ? "Service provided by parent component"
                  : "Refresh"
              }
            >
              Refresh
            </button>
          </div>
        </div>
  
  <div className={serviceDashboardStyles.statGrid}>
    <StatCard icon={<ClipboardList size={18}/>} label="Total Services"
     value={total.totalServices}/>
  </div>
     
      </div>
    </div>
  );
};

export default ServiceDashboard;


function StatCard ({icon,label ,value}){
  return (
    <div className={serviceDashboardStyles.statCard.container}>
   <div className={serviceDashboardStyles.statCard.iconContainer}>

   </div>
    </div>
  )
}
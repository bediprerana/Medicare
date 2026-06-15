import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import { navbarStyles as ns } from "../assets/dummyStyles";
import logoImg from "../assets/logo.png";

import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  Home,
  UserPlus,
  Users,
  Calendar,
  Grid,
  PlusSquare,
  List,
  X,
  Menu,
} from "lucide-react";

import { useAuth, useClerk, useUser } from "@clerk/react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  const navInnerRef = useRef(null);
  const indicatorRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Clerk hooks MUST be inside component
  const clerk = useClerk();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn, isLoaded: userLoaded } = useUser();

  /* ================= INDICATOR ================= */

  const moveIndicator = useCallback(() => {
    const container = navInnerRef.current;
    const ind = indicatorRef.current;
    if (!container || !ind) return;

    const active = container.querySelector(".nav-items.active");

    if (!active) {
      ind.style.opacity = "0";
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    const left =
      activeRect.left - containerRect.left + container.scrollLeft;

    ind.style.transform = `translateX(${left}px)`;
    ind.style.width = `${activeRect.width}px`;
    ind.style.opacity = "1";
  }, []);

  useLayoutEffect(() => {
    moveIndicator();
    const t = setTimeout(moveIndicator, 120);
    return () => clearTimeout(t);
  }, [location.pathname, moveIndicator]);

  useEffect(() => {
    const container = navInnerRef.current;
    if (!container) return;

    const onScroll = () => moveIndicator();

    container.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(moveIndicator);
    ro.observe(container);

    window.addEventListener("resize", moveIndicator);

    return () => {
      container.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", moveIndicator);
    };
  }, [moveIndicator]);

  /* ================= TOKEN STORE ================= */

  useEffect(() => {
    let mounted = true;

    const storeToken = async () => {
      if (!authLoaded || !userLoaded) return;

      if (!isSignedIn) {
        localStorage.removeItem("clerk_token");
        return;
      }

      try {
        const token = await getToken();

        if (!mounted || !token) return;

        localStorage.setItem("clerk_token", token);
      } catch (err) {
        console.warn("Could not retrieve clerk token", err);
      }
    };

    storeToken();

    return () => {
      mounted = false;
    };
  }, [isSignedIn, authLoaded, userLoaded, getToken]);

  /* ================= AUTH ACTIONS ================= */

  const handleOpenSignIn = () => {
    if (!clerk?.openSignIn) return;
    clerk.openSignIn();
  };

  const handleSignOut = async () => {
    if (!clerk?.signOut) return;

    try {
      await clerk.signOut();
    } finally {
      localStorage.removeItem("clerk_token");
      navigate("/");
    }
  };

  /* ================= UI ================= */

  return (
    <header className={ns.header}>
      <nav className={ns.navContainer}>
        <div className={ns.flexContainer}>
          {/* LOGO */}
          <div className={ns.logoContainer}>
            <img src={logoImg} alt="logo" className={ns.logoImage} />

            <Link to="/">
              <div className={ns.logoLink}>MediCare</div>
              <div className={ns.logoSubtext}>
                Healthcare Solutions
              </div>
            </Link>
          </div>

          {/* CENTER NAV */}
          <div className={ns.centerNavContainer}>
            <div className={ns.glowEffect}>
              <div className={ns.centerNavInner}></div>

              <div
                ref={navInnerRef}
                tabIndex={0}
                className={ns.centerNavScrollContainer}
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <CenterNavItem to="/h" label="Dashboard" icon={<Home size={16} />} />
                <CenterNavItem to="/add" label="Add Doctor" icon={<UserPlus size={16} />} />
                <CenterNavItem to="/list" label="List Doctors" icon={<Users size={16} />} />
                <CenterNavItem to="/appointments" label="Appointments" icon={<Calendar size={16} />} />
                <CenterNavItem to="/service-dashboard" label="Service Dashboard" icon={<Grid size={16} />} />
                <CenterNavItem to="/add-service" label="Add Service" icon={<PlusSquare size={16} />} />
                <CenterNavItem to="/list-service" label="List Services" icon={<List size={16} />} />
                <CenterNavItem to="/service-appointments" label="Service Appointments" icon={<Calendar size={16} />} />
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className={ns.rightContainer}>
            {isSignedIn ? (
              <button
                onClick={handleSignOut}
                className={`${ns.signOutButton} ${ns.cursorPointer}`}
              >
                Sign Out
              </button>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={handleOpenSignIn}
                  className={`${ns.loginButton} ${ns.cursorPointer}`}
                >
                  Login
                </button>
              </div>
            )}
            {/* mobile toggle */}
            <button onClick={()=> setOpen((v) => !v)} className={ns.mobileMenuButton}>
              {open ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>
        {/* mobile navigation */}
        {open && (
          <div className={ns.mobileOverlay} onClick={() => setOpen(false)}/>

     
        )}
        {open && (
          <div className={ns.mobileMenuContainer} is="mobile-menu">
            <div className={ns.mobileMenuInner}>
               <MobileItem
                to="/h"
                label="Dashboard"
                icon={<Home size={16} />}
                onClick={() => setOpen(false)}
              />

              <MobileItem
                to="/add"
                label="Add Doctor"
                icon={<UserPlus size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/list"
                label="List Doctors"
                icon={<Users size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/appointments"
                label="Appointments"
                icon={<Calendar size={16} />}
                onClick={() => setOpen(false)}
              />

              <MobileItem
                to="/service-dashboard"
                label="Service Dashboard"
                icon={<Grid size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/add-service"
                label="Add Service"
                icon={<PlusSquare size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/list-service"
                label="List Services"
                icon={<List size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/service-appointments"
                label="Service Appointments"
                icon={<Calendar size={16} />}
                onClick={() => setOpen(false)}
              />
 <div className={ns.mobileAuthContainer}>
  {isSignedIn ? (
    <button
      onClick={() => {
        handleSignOut();
        setOpen(false);
      }}
      className={ns.mobileSignOutButton}
    >
      Sign Out
    </button>
  ) : (
    <div className="space-y-2">
      <button
        onClick={() => {
          handleOpenSignIn();
          setOpen(false);
        }}
        className={`${ns.mobileLoginButton} ${ns.cursorPointer}`}
      >
        Login
      </button>
    </div>
  )}
</div>
</div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;

/* ================= NAV ITEM ================= */

function CenterNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `nav-items ${
          isActive ? "active" : ""
        } ${ns.centerNavItemBase} ${
          isActive
            ? ns.centerNavItemActive
            : ns.centerNavItemInactive
        }`
      }
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}
function MobileItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `${ns.mobileItemBase} ${
          isActive
            ? ns.mobileItemActive
            : ns.mobileItemInactive
        }`
      }
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </NavLink>
  );
}
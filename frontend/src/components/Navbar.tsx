import { useEffect, useState } from "react";
import { Box, ChevronDown, Plus, Settings } from "lucide-react";
import { NavLink, useLocation, type NavLinkProps } from "react-router-dom";
import { getApiBase } from "../api";

interface LensBrand {
  name: string;
}

/** Dispatched by pages (e.g. NewOrder) after a brand is created. */
export const BRANDS_UPDATED_EVENT = "brands-updated";

export const brandPath = (name: string) => `/brand/${encodeURIComponent(name)}`;

export default function Navbar() {
  const { pathname } = useLocation();

  const [brands, setBrands] = useState<LensBrand[]>([]);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [isBrandsOpen, setIsBrandsOpen] = useState(false);

  useEffect(() => {
    let controller = new AbortController();

    const loadBrands = async () => {
      controller.abort();
      controller = new AbortController();
      const { signal } = controller;

      try {
        const res = await fetch(`${getApiBase()}/brand`, { signal });
        if (!res.ok) {
          throw new Error(`Couldn't load brands (${res.status}).`);
        }
        const data: LensBrand[] = await res.json();
        setBrands(data);
        setBrandsError(null);
      } catch (err) {
        if (signal.aborted) return;
        setBrandsError(
          err instanceof Error ? err.message : "Couldn't load brands.",
        );
      }
    };

    loadBrands();
    window.addEventListener(BRANDS_UPDATED_EVENT, loadBrands);

    return () => {
      window.removeEventListener(BRANDS_UPDATED_EVENT, loadBrands);
      controller.abort();
    };
  }, []);

  // Keep the dropdown open while a brand page is displayed
  const onBrandRoute = pathname.startsWith("/brand/");
  useEffect(() => {
    if (onBrandRoute) setIsBrandsOpen(true);
  }, [onBrandRoute]);

  const navLinkClass: NavLinkProps["className"] = ({ isActive }) =>
    `nav-item-btn ${isActive ? "active" : ""}`;

  const brandLinkClass: NavLinkProps["className"] = ({ isActive }) =>
    `nav-brand-item ${isActive ? "active" : ""}`;

  return (
    <nav className="nav-sidebar">
      <span
        style={{
          marginBottom: "1.5rem",
          textAlign: "left",
          fontSize: "22px",
          fontWeight: 600,
        }}
      >
        LMS Vision
      </span>

      <div className="nav-menu-scroll">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <button
            type="button"
            onClick={() => setIsBrandsOpen((open) => !open)}
            aria-expanded={isBrandsOpen}
            aria-controls="brands-menu"
            className={`nav-item-btn ${onBrandRoute ? "active" : ""}`}
          >
            <Box size={18} strokeWidth={2} />
            <span>Marques</span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={`nav-chevron ${isBrandsOpen ? "rotated" : ""}`}
            />
          </button>

          {isBrandsOpen && (
            <div id="brands-menu" className="nav-submenu">
              {brandsError && (
                <p
                  style={{
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.75rem",
                    color: "#fecaca",
                  }}
                >
                  {brandsError}
                </p>
              )}

              {!brandsError && brands.length === 0 && (
                <p
                  style={{
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.75rem",
                    color: "rgba(255, 255, 255, 0.6)",
                  }}
                >
                  Aucune marque
                </p>
              )}

              {brands.map((brand) => (
                <NavLink
                  key={brand.name}
                  to={brandPath(brand.name)}
                  className={brandLinkClass}
                >
                  <span className="truncate-text">{brand.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/" className={navLinkClass}>
          <Plus size={18} strokeWidth={2} />
          <span>Ajouter</span>
        </NavLink>

        <NavLink to="/settings" className={navLinkClass}>
          <Settings size={18} strokeWidth={2} />
          <span>Options</span>
        </NavLink>
      </div>
    </nav>
  );
}
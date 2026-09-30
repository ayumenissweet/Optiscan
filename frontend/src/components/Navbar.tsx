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

  const navLinkStyle: NavLinkProps["className"] = ({ isActive }) =>
    `flex h-12 w-full items-center gap-3 rounded-xl px-3.5 text-[15px] font-semibold transition-all ${
      isActive
        ? "border-2 border-bg bg-accent-2/10"
        : "border-2 border-white/10 bg-white/10 hover:bg-white/15"
    }`;

  const brandLinkStyle: NavLinkProps["className"] = ({ isActive }) =>
    `flex h-10 w-full items-center rounded-lg px-3 text-sm font-medium transition-all ${
      isActive
        ? "border-2 border-bg bg-accent-2/10"
        : "border-2 border-transparent hover:bg-white/10"
    }`;

  return (
    <nav className="sticky top-0 left-0 flex h-screen w-55 flex-col bg-linear-to-br from-[#7651AF] via-[#4B2488] to-[#3D1C68] p-4 text-bg">
      <span className="mb-6 text-left text-[22px] font-semibold">
        LMS Vision
      </span>

      <div className="flex flex-col gap-2.5 overflow-y-auto">
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setIsBrandsOpen((open) => !open)}
            aria-expanded={isBrandsOpen}
            aria-controls="brands-menu"
            className={`flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-3.5 text-[15px] font-semibold transition-all ${
              onBrandRoute
                ? "border-bg bg-accent-2/10"
                : "border-white/10 bg-white/10 hover:bg-white/15"
            }`}
          >
            <Box size={18} strokeWidth={2} />
            <span>Marques</span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={`ml-auto transition-transform ${
                isBrandsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isBrandsOpen && (
            <div id="brands-menu" className="flex flex-col gap-1 pl-3">
              {brandsError && (
                <p className="px-3 py-1 text-xs text-red-200">{brandsError}</p>
              )}

              {!brandsError && brands.length === 0 && (
                <p className="px-3 py-1 text-xs text-white/60">Aucune marque</p>
              )}

              {brands.map((brand) => (
                <NavLink
                  key={brand.name}
                  to={brandPath(brand.name)}
                  className={brandLinkStyle}
                >
                  <span className="truncate">{brand.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/" className={navLinkStyle}>
          <Plus size={18} strokeWidth={2} />
          <span>Ajouter</span>
        </NavLink>

        <NavLink to="/settings" className={navLinkStyle}>
          <Settings size={18} strokeWidth={2} />
          <span>Options</span>
        </NavLink>
      </div>
    </nav>
  );
}

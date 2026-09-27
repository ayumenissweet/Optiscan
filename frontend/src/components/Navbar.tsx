import { Box, Plus, Settings } from "lucide-react";
import { NavLink, type NavLinkProps } from "react-router-dom";

export default function Navbar() {
  const navLinkStyle: NavLinkProps["className"] = ({ isActive }) =>
    `flex h-12 w-full items-center gap-3 rounded-xl px-3.5 text-[15px] font-semibold transition-all ${
      isActive
        ? "border-2 border-bg bg-accent-2/10"
        : "border-2 border-white/10 bg-white/10 hover:bg-white/15"
    }`;

  return (
    <nav className="sticky top-0 left-0 flex h-screen w-55 flex-col bg-linear-to-br from-[#7651AF] via-[#4B2488] to-[#3D1C68] p-4 text-bg">
      <span className="mb-6 text-left text-[22px] font-semibold">
        LMS Vision
      </span>

      <div className="flex flex-col gap-2.5">
        <NavLink to="/" className={navLinkStyle}>
          <Box size={18} strokeWidth={2} />
          <span>Soleko</span>
        </NavLink>

        <NavLink to="/cornelia" className={navLinkStyle}>
          <Box size={18} strokeWidth={2} />
          <span>Cornelia</span>
        </NavLink>

        <NavLink to="/versa-view" className={navLinkStyle}>
          <Box size={18} strokeWidth={2} />
          <span>Versa View</span>
        </NavLink>

        <NavLink to="/new" className={navLinkStyle}>
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

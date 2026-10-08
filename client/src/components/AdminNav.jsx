import { NavLink } from "react-router-dom";

export default function AdminNav() {
  return (
    <nav className="admin-subnav" aria-label="Adminmeny">
      <NavLink to="/admin/products">Produkter</NavLink>
      <NavLink to="/admin/orders">Ordrar</NavLink>
      <NavLink to="/admin/gallery">Galleri</NavLink>
      <NavLink to="/admin/collections">Kollektioner</NavLink>
    </nav>
  );
}

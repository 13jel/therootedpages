import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import ProductList from "../pages/ProductList";
import ProductDetail from "../pages/ProductDetail";
import Cart from "../pages/Cart";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Account from "../pages/Account";
import PrivateRoute from "./PrivateRoute";
import AdminProducts from "../pages/AdminProducts";
import AdminOrders from "../pages/AdminOrders";
import AdminRoute from "./AdminRoute";
import Gallery from "../pages/Gallery";
import AdminGallery from "../pages/AdminGallery";
import AdminCollections from "../pages/AdminCollections";
import About from "../pages/About";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<ProductList />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/account"
        element={
          <PrivateRoute>
            {" "}
            <Account />{" "}
          </PrivateRoute>
        }
      />
      <Route path="/gallery" element={<Gallery />} />
      <Route
        path="/admin/gallery"
        element={
          <AdminRoute>
            {" "}
            <AdminGallery />{" "}
          </AdminRoute>
        }
      />
      <Route path="/about" element={<About />} />

      <Route
        path="/admin/products"
        element={
          <AdminRoute>
            <AdminProducts />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <AdminRoute>
            <AdminOrders />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/collections"
        element={
          <AdminRoute>
            <AdminCollections />
          </AdminRoute>
        }
      />
    </Routes>
  );
}

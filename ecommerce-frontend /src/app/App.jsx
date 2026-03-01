import { Routes, Route, Navigate } from "react-router-dom";
import Container from "../components/layout/Container";

import Products from "../pages/Products/Products";
import Home from "../pages/Home/Home";
import ProductDetail from "../pages/ProductDetail/ProductDetail";
import Cart from "../pages/Cart/Cart";
import Checkout from "../pages/Checkout/Checkout";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Account from "../pages/Account/Account";
import CompanyInfo from "../pages/Company/CompanyInfo";
import VendorDashboard from "../pages/Vendor/VendorDashboard";
import AddProduct from "../pages/Vendor/AddProduct";
import RequireVendor from "../components/auth/RequireVendor";
import RequireCustomer from "../components/auth/RequireCustomer";
import useAuthStore from "../store/auth.store";

export default function App() {
  const role = useAuthStore((s) => s.role);

  return (
    <Container>
      <Routes>
        <Route
          path="/"
          element={
            role === "vendor" ? <Navigate to="/vendor/dashboard" replace /> : <Home />
          }
        />

        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/company/:page" element={<CompanyInfo />} />

        <Route element={<RequireCustomer />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/account" element={<Account />} />
        </Route>

        <Route element={<RequireVendor />}>
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/vendor/add-product" element={<AddProduct />} />
        </Route>

        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </Container>
  );
}

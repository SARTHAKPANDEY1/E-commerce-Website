import Layout from "../components/layout/Container";
import Home from "../pages/Home/Home";
import Products from "../pages/Products/Products";
import ProductDetail from "../pages/ProductDetail/ProductDetail";
import Cart from "../pages/Cart/Cart";
import Checkout from "../pages/Checkout/Checkout";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Account from "../pages/Account/Account";
import NotFound from "../pages/NotFound";

export default [
  { path: "/", element: <Layout><Home /></Layout> },
  { path: "/products", element: <Layout><Products /></Layout> },
  { path: "/products/:id", element: <Layout><ProductDetail /></Layout> },
  { path: "/cart", element: <Layout><Cart /></Layout> },
  { path: "/checkout", element: <Layout><Checkout /></Layout> },
  { path: "/login", element: <Layout><Login /></Layout> },
  { path: "/register", element: <Layout><Register /></Layout> },
  { path: "/account", element: <Layout><Account /></Layout> },
  { path: "*", element: <Layout><NotFound /></Layout> },
];
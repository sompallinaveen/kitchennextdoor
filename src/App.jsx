import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import StaffGate from "./components/StaffGate.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Polls from "./pages/Polls.jsx";
import Seller from "./pages/Seller.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import MyOrders from "./pages/MyOrders.jsx";

const DevPanel = import.meta.env.DEV ? lazy(() => import("./dev/DevPanel.jsx")) : null;

function StaffRoute({ role, title }) {
  return <StaffGate role={role} title={title} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/polls" element={<Polls />} />
      <Route
        path="/cart"
        element={
          <ProtectedRoute allowedRoles={["buyer"]} redirectTo="/login">
            <Cart />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute allowedRoles={["buyer"]} redirectTo="/login">
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute allowedRoles={["buyer"]} redirectTo="/login">
            <MyOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller"
        element={
          <ProtectedRoute allowedRoles={["seller"]} redirectTo="/login" unauthorizedTo="/">
            <Seller />
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<StaffRoute role="admin" title="Society Admin" />} />
      <Route path="/super-admin" element={<StaffRoute role="superadmin" title="App Admin" />} />
      {import.meta.env.DEV && DevPanel && (
        <Route path="/dev" element={<Suspense fallback={<p>Loading development tools…</p>}><DevPanel /></Suspense>} />
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

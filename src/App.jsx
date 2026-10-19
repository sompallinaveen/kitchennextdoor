import { lazy, Suspense, useEffect, useState } from "react";
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
import Showcase from "./pages/Showcase.jsx";
import { APP_DATA_RESET_EVENT, SANDBOX_MODE_KEY, exitSandboxMode, isSandboxActive } from "./api/storage.js";

const DevPanel = import.meta.env.DEV ? lazy(() => import("./dev/DevPanel.jsx")) : null;

function StaffRoute({ role, title }) {
  return <StaffGate role={role} title={title} />;
}

function SandboxBanner() {
  const [active, setActive] = useState(() => isSandboxActive());

  useEffect(() => {
    const syncMode = () => setActive(isSandboxActive());
    const syncStorage = (event) => {
      if (event.key === SANDBOX_MODE_KEY) syncMode();
    };
    window.addEventListener(APP_DATA_RESET_EVENT, syncMode);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(APP_DATA_RESET_EVENT, syncMode);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  if (!active) return null;
  return (
    <aside className="dev-sandbox-banner" role="status">
      <strong>🛠️ DEV SANDBOX MODE - Isolated Test Data</strong>
      <button
        type="button"
        onClick={() => {
          exitSandboxMode();
          window.location.assign("/dev");
        }}
      >
        Exit sandbox
      </button>
    </aside>
  );
}

export default function App() {
  return (
    <>
      {import.meta.env.DEV && <SandboxBanner />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/showcase" element={<Showcase />} />
        <Route path="/features" element={<Navigate to="/showcase" replace />} />
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
          <Route path="/dev" element={<Suspense fallback={<p>Loading developer sandbox…</p>}><DevPanel /></Suspense>} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

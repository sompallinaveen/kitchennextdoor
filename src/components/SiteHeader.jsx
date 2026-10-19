import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function SiteHeader({ hideNav = false }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  const hideCenterNav = hideNav ||
    location.pathname === "/showcase" ||
    location.pathname === "/features" ||
    location.pathname === "/admin" ||
    location.pathname === "/super-admin" ||
    user?.role === "admin" ||
    user?.role === "superadmin";
  const homeRoute = user?.role === "seller" ? "/seller" : user?.role === "admin" ? "/admin" : user?.role === "superadmin" ? "/super-admin" : "/";
  return (
    <header className="site-header">
      <Link className="brand" to={homeRoute} aria-label="KitchenNextDoor home">
        <img src="/logo-house.png" alt="" />
        <span className="brand-wordmark">
          <span>Kitchen</span>
          <span>NextDoor</span>
        </span>
      </Link>
      {!hideCenterNav && (
        <nav className="main-nav" aria-label="Main navigation">
          {user?.role === "seller" ? (
            <Link to="/seller">Seller Studio</Link>
          ) : user?.role === "admin" ? (
            <>
              <Link to="/admin">Admin Console</Link>
              <Link to="/polls">Society Polls</Link>
              <Link to="/showcase">Features</Link>
            </>
          ) : user?.role === "superadmin" ? (
            <>
              <Link to="/super-admin">App Admin Console</Link>
              <Link to="/showcase">Features</Link>
            </>
          ) : (
            <>
              <Link to="/">Food Menu</Link>
              <Link to="/showcase">Features</Link>
              <Link to="/polls">Society Polls</Link>
              {user?.role === "buyer" && <Link to="/orders">My Orders</Link>}
              <Link className="cart-nav-link" to="/cart">
                Cart <span className="cart-count">{count}</span>
              </Link>
            </>
          )}
        </nav>
      )}
      <div className="header-action">
        {user ? (
          <>
            <span className="header-greeting">{user.name}</span>
            <button className="button button-outline button-small" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <Link className="button button-outline button-small" to="/login">
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}

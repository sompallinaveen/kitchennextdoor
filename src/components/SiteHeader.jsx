import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="KitchenNextDoor home">
        <img src="/logo-house.png" alt="" />
        <span className="brand-wordmark">
          <span>Kitchen</span>
          <span>NextDoor</span>
        </span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link to="/">Food Menu</Link>
        <Link to="/polls">Society Polls</Link>
        {user?.role === "seller" && <Link to="/seller">Seller Studio</Link>}
        {user?.role === "buyer" && <Link to="/orders">My Orders</Link>}
        <Link className="cart-nav-link" to="/cart">
          Cart <span className="cart-count">{count}</span>
        </Link>
      </nav>
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

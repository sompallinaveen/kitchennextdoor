import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SuperAdmin from "../pages/SuperAdmin.jsx";
import SocietyAdmin from "../pages/SocietyAdmin.jsx";
import SiteHeader from "./SiteHeader.jsx";

export default function StaffGate({ role, title }) {
  const { user, login, logout, claimAdminInvite } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => location.state?.notice || "");
  const [inviteMode, setInviteMode] = useState(false);
  const [invite, setInvite] = useState({ code: "", name: "", mobile: "", email: "", password: "" });

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (inviteMode && role === "admin") {
        claimAdminInvite(invite);
      } else {
        login({ identifier, password, expectedRole: role });
      }
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  if (user?.role === role) {
    if (user.disabled) {
      return (
        <main className="staff-shell">
          <SiteHeader />
          <section className="staff-disabled-message" role="alert">
            <h1>Your account has been disabled</h1>
            <p>Contact the App Admin if you believe this was a mistake.</p>
            <button className="button button-outline" type="button" onClick={logout}>Log out</button>
          </section>
        </main>
      );
    }
    if (role === "admin") return <SocietyAdmin />;
    if (role === "superadmin") return <SuperAdmin />;
    return (
      <main className="staff-shell">
        <header className="staff-header">
          <span className="staff-brand">KitchenNextDoor <span>{title}</span></span>
          <button className="staff-logout" onClick={logout}>Log out</button>
        </header>
        <section className="staff-placeholder">
          <div className="staff-icon" aria-hidden="true">⌂</div>
          <p className="eyebrow">Console access confirmed</p>
          <h1>Welcome, {user.name}</h1>
          <p>Your {title.toLowerCase()} console will be built in a later phase.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="staff-shell">
      <SiteHeader />
      <main className="staff-login-wrap">
        <form className="staff-login-card" onSubmit={handleSubmit}>
          <p className="eyebrow">Staff access</p>
          <h1>{title} login</h1>
          <p className="form-intro">{inviteMode ? "Use your single-use invite token to create the Society Admin account for its assigned community." : "Sign in with your staff account to continue."}</p>
          {notice && <p className="admin-action-message" role="status">{notice}</p>}
          {inviteMode && role === "admin" ? (
            <>
              <label>Invite token<input autoComplete="off" value={invite.code} onChange={(event) => setInvite({ ...invite, code: event.target.value.toUpperCase() })} required /></label>
              <label>Full name<input autoComplete="name" value={invite.name} onChange={(event) => setInvite({ ...invite, name: event.target.value })} required /></label>
              <label>Mobile number<input inputMode="tel" autoComplete="tel" value={invite.mobile} onChange={(event) => setInvite({ ...invite, mobile: event.target.value })} minLength={10} maxLength={16} required /></label>
              <label>Email<input type="email" autoComplete="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} required /></label>
              <label>Password<input type="password" autoComplete="new-password" value={invite.password} onChange={(event) => setInvite({ ...invite, password: event.target.value })} minLength={8} required /></label>
              <p className="staff-invite-hint">Password must be at least 8 characters.</p>
            </>
          ) : (
            <>
              <label>
                Email or mobile
                <input
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
            </>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" type="submit">{inviteMode && role === "admin" ? "Claim invite and create account" : "Log in"}</button>
          {role === "admin" && (
            <button
              className="button button-outline button-full staff-invite-toggle"
              type="button"
              onClick={() => { setInviteMode((current) => !current); setError(""); }}
            >{inviteMode ? "Back to Society Admin login" : "I have an invite token"}</button>
          )}
        </form>
      </main>
    </div>
  );
}

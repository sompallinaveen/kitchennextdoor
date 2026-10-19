import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { seedTestData, SUPER_ADMIN_PASSWORD, TEST_PASSWORD } from "./seedTestData.js";

const ROLES = [
  {
    id: "buyer",
    title: "Resident Buyer",
    email: "buyer@test.com",
    password: TEST_PASSWORD,
    description: "Browse menu, place orders, rate cooks",
    action: "Sign in as Resident Buyer →",
    path: "/",
  },
  {
    id: "seller",
    title: "Home Chef",
    email: "chef@test.com",
    password: TEST_PASSWORD,
    description: "Manage dishes, orders & earnings in Seller Studio",
    action: "Sign in as Home Chef →",
    path: "/seller",
  },
  {
    id: "admin",
    title: "Society Admin",
    email: "admin@test.com",
    password: TEST_PASSWORD,
    description: "Verify residents & chefs, manage referrals",
    action: "Sign in as Society Admin →",
    path: "/admin",
  },
  {
    id: "superadmin",
    title: "App Super Admin",
    email: "super@kitchennextdoor.app",
    password: SUPER_ADMIN_PASSWORD,
    description: "Configure societies, settle commission, audit logs",
    action: "Sign in as App Super Admin →",
    path: "/super-admin",
  },
];

export default function DevPanel() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);

  function reseed() {
    setError("");
    setMessage("");
    try {
      const result = seedTestData();
      logout();
      setSummary(result.summary);
      setMessage("The isolated sandbox data has been reset and re-seeded.");
    } catch (seedError) {
      setError(seedError.message || "Sandbox data could not be seeded.");
    }
  }

  function quickLogin(role) {
    setError("");
    try {
      seedTestData();
      login({
        identifier: role.email,
        password: role.password,
        expectedRole: role.id,
      });
      navigate(role.path, { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Sandbox sign-in failed.");
    }
  }

  return (
    <main className="dev-panel-shell">
      <section className="dev-panel">
        <p className="eyebrow">INTERACTIVE TESTING SANDBOX</p>
        <h1>Test Every Role with Seeded Credentials</h1>
        <p className="dev-panel-description">
          Pre-configured test accounts ready for instant exploration. Visit the Dev Panel to reset or re-seed anytime.
        </p>
        <p className="dev-only-warning" role="note">
          This sandbox uses isolated <code>dev_sandbox_</code> browser storage. Test actions cannot modify regular app data.
        </p>

        <div className="dev-sandbox-role-grid">
          {ROLES.map((role) => (
            <article className="dev-sandbox-role-card" key={role.id}>
              <h2>{role.title}</h2>
              <p>{role.description}</p>
              <dl>
                <div><dt>Login</dt><dd>{role.email}</dd></div>
                <div><dt>Password</dt><dd>{role.password}</dd></div>
              </dl>
              <button className="button button-primary" type="button" onClick={() => quickLogin(role)}>
                {role.action}
              </button>
            </article>
          ))}
        </div>

        <div className="dev-panel-actions">
          <button className="button button-outline" type="button" onClick={reseed}>
            Reset / Re-seed Sandbox
          </button>
        </div>
        {message && <p className="dev-sandbox-message" role="status">{message}</p>}
        {summary && <p className="dev-sandbox-summary">Seeded {summary.registeredAccounts} accounts, {summary.dishes} dishes, {summary.orders} orders, and {summary.issues} issue.</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}

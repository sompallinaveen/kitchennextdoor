import { useState } from "react";
import { Link } from "react-router-dom";
import { resetTestData, seedTestData } from "./seedTestData.js";
import "./DevPanel.css";

export default function DevPanel() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function loadData() {
    setError("");
    try {
      setResult(seedTestData());
    } catch (seedError) {
      setError(seedError.message || "Test data could not be loaded.");
    }
  }

  function clearData() {
    if (!window.confirm("Clear all KitchenNextDoor browser data for this origin?")) return;
    setError("");
    try {
      resetTestData();
      setResult(null);
    } catch (resetError) {
      setError(resetError.message || "App data could not be cleared.");
    }
  }

  return (
    <main className="dev-panel-shell">
      <section className="dev-panel">
        <p className="eyebrow">Local development tools</p>
        <h1>KitchenNextDoor test data</h1>
        <p className="dev-only-warning" role="alert">Development data only. Fake accounts and records; never use real data.</p>
        <div className="dev-panel-actions">
          <button className="button button-primary" type="button" onClick={loadData}>Load test data</button>
          <button className="button button-outline" type="button" onClick={clearData}>Clear all data</button>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        {result && (
          <section className="dev-seed-summary" aria-live="polite">
            <h2>Seed summary</h2>
            <p><strong>Society:</strong> {result.society.name} · Bengaluru</p>
            <p><strong>Referral code:</strong> <code>{result.society.referralCode}</code></p>
            <table>
              <thead><tr><th>Role</th><th>Name</th><th>Login email</th><th>Status</th></tr></thead>
              <tbody>{result.accounts.map((account) => (
                <tr key={`${account.role}-${account.email}`}>
                  <td>{account.role}</td><td>{account.name}</td><td>{account.email}</td><td>{account.status}</td>
                </tr>
              ))}</tbody>
            </table>
            <p>Created {result.summary.registeredAccounts} registered accounts, {result.summary.dishes} dishes, {result.summary.polls} polls, {result.summary.orders} orders, and {result.summary.issues} open issue.</p>
            <p>Refresh the page after seeding to initialize the app session and cart contexts from the new data.</p>
          </section>
        )}
        <Link to="/">Return to the Food Menu</Link>
      </section>
    </main>
  );
}

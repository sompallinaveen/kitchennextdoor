export default function ReferralTab({ society, onRegenerate, onToggle }) {
  const shareText = `Join the KitchenNextDoor home chef community at ${society.name}. Use referral code ${society.referralCode} when you register: ${window.location.origin}/login`;
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(society.referralCode);
    } catch {
      window.prompt("Copy this referral code:", society.referralCode);
    }
  }
  return (
    <section className="admin-tab-content">
      <div className="admin-tab-heading"><div><p className="admin-eyebrow">Welcome trusted home chefs</p><h2>Chef referral</h2></div></div>
      <div className="referral-admin-card">
        <p className="admin-eyebrow">{society.name}</p><span className="referral-code-label">Your chef referral code</span>
        <strong className="referral-code-value">{society.referralCode}</strong>
        <div className="referral-actions">
          <button className="button button-outline" type="button" onClick={copyCode}>Copy code</button>
          <a className="button button-primary" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
        </div>
      </div>
      <div className="referral-admin-controls">
        <div><h3>Referral signups</h3><p>Chefs who register with an active code are verified immediately. Chefs without a valid code can still register and will need your manual approval. Changing the code does not affect already verified chefs.</p></div>
        <button className="button button-outline" type="button" onClick={onRegenerate}>Regenerate code</button>
      </div>
      <label className="referral-active-control">
        <input type="checkbox" checked={society.referralActive} onChange={(event) => onToggle(event.target.checked)} />
        <span><strong>{society.referralActive ? "Code active" : "Code inactive"}</strong><small>{society.referralActive ? "Chefs can register with this code." : "The code will not verify new chefs."}</small></span>
      </label>
    </section>
  );
}

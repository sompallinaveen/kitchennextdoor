import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const ROLES = [
  {
    id: "buyer",
    title: "Resident Neighbour",
    roleLabel: "Buyer",
    tagline: "Fresh, warm comfort meals cooked right inside your building.",
    icon: "🍲",
    badge: "For Residents",
    highlights: [
      {
        title: "Hyperlocal Food Menu",
        desc: "Browse daily rotating dishes prepared by verified neighbours living in your own society towers.",
        icon: "📋",
      },
      {
        title: "Dietary & Category Filters",
        desc: "Instant filtering for Pure Veg, Non-Veg, Jain, Vegan, Tiffins, Snacks, Sweets, and Weekend Specials.",
        icon: "🥗",
      },
      {
        title: "Dish Customisation",
        desc: "Choose spice levels, portion sizes, base choices, and special kitchen instructions before adding to cart.",
        icon: "✨",
      },
      {
        title: "Multi-Kitchen Cart & Checkout",
        desc: "Order from multiple home chefs in a single flow with itemised kitchen totals and zero platform fees.",
        icon: "🛒",
      },
      {
        title: "Doorstep or Pickup Handover",
        desc: "Pick up fresh from your neighbour's flat or enjoy fast doorstep delivery with zero transit delay.",
        icon: "🚪",
      },
      {
        title: "Live Order Tracking",
        desc: "Follow order progress in real time through Placed → Preparing → Ready → Delivered status updates.",
        icon: "⏱️",
      },
      {
        title: "Direct UPI & Cash Options",
        desc: "Pay the chef directly via UPI with simple transaction reference or choose Cash on Handover.",
        icon: "💳",
      },
      {
        title: "Verified Resident Reviews",
        desc: "Honest 1–5 star reviews and comments only unlocked after you receive a verified delivered order.",
        icon: "⭐",
      },
    ],
  },
  {
    id: "seller",
    title: "Home Chef",
    roleLabel: "Seller / Kitchen",
    tagline: "Turn your culinary passion into a thriving home business for your community.",
    icon: "👩‍🍳",
    badge: "For Cooks",
    highlights: [
      {
        title: "Seller Studio Control Center",
        desc: "A dedicated dashboard with today's net earnings, orders queue, active inventory, and live ratings.",
        icon: "🎛️",
      },
      {
        title: "Online / Offline Availability",
        desc: "Full autonomy over kitchen hours. Toggle online when ready to take orders or offline when busy.",
        icon: "🟢",
      },
      {
        title: "Dish & Customisation Builder",
        desc: "Add photos with automated compression, manage categories, set dynamic stock counters, and build custom options.",
        icon: "🍳",
      },
      {
        title: "Live Order Progression",
        desc: "Progress orders step-by-step: mark Preparing, signal Ready for pickup, or confirm Delivery & Payment.",
        icon: "📦",
      },
      {
        title: "Instant Stock Restock on Reject",
        desc: "Reject newly placed orders if unavailable, which automatically restores dish inventory for other neighbours.",
        icon: "🔄",
      },
      {
        title: "Order Simulator for Testing",
        desc: "Simulate incoming test orders with one click to rehearse workflow and train kitchen staff safely.",
        icon: "🧪",
      },
      {
        title: "Transparent Commission Ledger",
        desc: "Track commission accrued per delivered dish, view settled amounts, and calculate net take-home earnings.",
        icon: "📊",
      },
      {
        title: "Community Specials Polls",
        desc: "Create society polls asking neighbours what they crave for upcoming weekend specials or delivery timings.",
        icon: "🗳️",
      },
    ],
  },
  {
    id: "admin",
    title: "Society Admin",
    roleLabel: "Community Gatekeeper",
    tagline: "Protect resident safety, verify home cooks, and nurture a thriving society ecosystem.",
    icon: "🛡️",
    badge: "For Resident Councils",
    highlights: [
      {
        title: "Resident Flat Verification",
        desc: "Approve or reject resident buyer accounts by verifying flat numbers and phone numbers for safe access.",
        icon: "✅",
      },
      {
        title: "Home Chef Verification",
        desc: "Review home kitchen profiles, hygiene details, and speciality menus before allowing cooks to go Online.",
        icon: "🔍",
      },
      {
        title: "Society Referral Code System",
        desc: "Generate and share society referral codes (e.g. KND-TES-2248) to fast-track verified home cook onboarding.",
        icon: "🎟️",
      },
      {
        title: "Community Announcement Broadcast",
        desc: "Pin official society announcements for upcoming food fairs, festive pre-orders, or community guidelines.",
        icon: "📢",
      },
      {
        title: "Dispute & Issue Resolution",
        desc: "Mediate order issues, read conversation threads, assign outcomes (Warning, Ban, or Settled), and leave notes.",
        icon: "⚖️",
      },
      {
        title: "Society Poll Moderation",
        desc: "Publish community polls, track democratic resident votes, and close concluded polls when needed.",
        icon: "📊",
      },
    ],
  },
  {
    id: "superadmin",
    title: "Platform App Admin",
    roleLabel: "Super Admin",
    tagline: "Centralized governance, multi-society management, and platform analytics.",
    icon: "⚙️",
    badge: "Platform Ops",
    highlights: [
      {
        title: "Multi-Society Onboarding",
        desc: "Create and manage apartment communities, flat capacities, default commission rates, and status controls.",
        icon: "🏢",
      },
      {
        title: "Single-Use Admin Invites",
        desc: "Issue cryptographically secure single-use invite tokens to hand over society console access to local admins.",
        icon: "🔑",
      },
      {
        title: "Commission & GMV Analytics",
        desc: "Monitor platform gross merchandise value, track delivered-sales graphs, and inspect outstanding dues.",
        icon: "📈",
      },
      {
        title: "Manual Settlement Ledger & CSV",
        desc: "Mark commission settled against delivered orders with audit tracking and export full settlement CSV reports.",
        icon: "📑",
      },
      {
        title: "Cross-Society Read-Only Oversight",
        desc: "Review chef and resident profiles across communities while Society Admins retain authority over local approvals and moderation.",
        icon: "🚫",
      },
      {
        title: "Immutable Audit Log",
        desc: "Comprehensive chronological audit trail of all administrative actions, settlements, and account events.",
        icon: "📜",
      },
    ],
  },
];

const PILLARS = [
  {
    icon: "🏢",
    title: "100% Hyperlocal",
    desc: "Food travels an elevator ride, not miles through city traffic. Dishes arrive fresh, steaming hot, and on time.",
  },
  {
    icon: "🔒",
    title: "Gated Trust & Security",
    desc: "Every buyer and chef is a verified resident of your society. No anonymous cloud kitchens or unknown delivery couriers.",
  },
  {
    icon: "💸",
    title: "Zero Buyer Surcharges",
    desc: "No platform fees, delivery surcharges, or packaging markups. The listed menu price is exactly what the buyer pays.",
  },
  {
    icon: "🤝",
    title: "Direct Chef Support",
    desc: "Empower talented home makers and culinary enthusiasts in your society to earn income and share cherished family recipes.",
  },
];

const KitchenScene = lazy(() => import("../components/KitchenScene.jsx"));

const ROLE_ONBOARDING_PATHS = [
  {
    role: "Resident Neighbour",
    badge: "Buyer Portal",
    step: "Self-Registration",
    detail: "Register via the Resident Portal with your society, flat, and tower. Awaits society admin verification.",
    path: "/login",
    buttonLabel: "Resident Sign Up / Login",
  },
  {
    role: "Home Chef",
    badge: "Seller Studio",
    step: "Kitchen Onboarding",
    detail: "Register your kitchen with speciality, food category, and UPI ID. Use an active referral code for instant verification.",
    path: "/login",
    buttonLabel: "Home Chef Onboarding",
  },
  {
    role: "Society Admin",
    badge: "Community Gatekeeper",
    step: "Tokenized Invite Claim",
    detail: "Claim a single-use invite token at the Society Admin portal issued by the App Admin to manage your society.",
    path: "/admin",
    buttonLabel: "Society Admin Portal",
  },
  {
    role: "Platform App Admin",
    badge: "Platform Control",
    step: "Central Operations",
    detail: "Sign in at the App Admin Control Center to configure societies, generate invites, and manage platform governance.",
    path: "/super-admin",
    buttonLabel: "App Admin Console",
  },
];

export default function Showcase() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState(ROLES[0].id);
  const currentRole = ROLES.find((r) => r.id === activeRole) || ROLES[0];

  return (
    <div className="app-shell showcase-shell">
      <SiteHeader hideNav />

      <main className="showcase-main">
        {/* Hero Section */}
        <section className="showcase-hero">
          <div className="showcase-hero-content">
            <span className="showcase-badge">✦ Hyperlocal Residential Marketplace</span>
            <h1>
              Authentic Home Cooking, <span>One Floor Away.</span>
            </h1>
            <p className="showcase-hero-desc">
              KitchenNextDoor transforms apartment communities into trusted, thriving food marketplaces.
              Verified neighbours cook with love, and residents enjoy wholesome, authentic homemade dishes delivered directly to their doorstep.
            </p>
            <div className="showcase-hero-actions">
              <Link to="/" className="button button-primary">
                Explore Food Menu
              </Link>
              {!user ? (
                <Link to="/login" className="button button-outline">
                  Resident & Chef Login
                </Link>
              ) : user.role === "seller" ? (
                <Link to="/seller" className="button button-outline">
                  Open Seller Studio
                </Link>
              ) : user.role === "admin" ? (
                <Link to="/admin" className="button button-outline">
                  Open Society Admin
                </Link>
              ) : (
                <Link to="/orders" className="button button-outline">
                  My Orders
                </Link>
              )}
            </div>
          </div>
          <div className="showcase-hero-visual">
            <Suspense fallback={<div className="kitchen-scene-loading" role="status">Preparing a little kitchen…</div>}>
              <KitchenScene />
            </Suspense>
          </div>
          <div className="showcase-stats-banner">
            <div className="showcase-stat-item">
              <strong>0%</strong>
              <span>Buyer Platform Markup</span>
            </div>
            <div className="showcase-stat-divider" aria-hidden="true" />
            <div className="showcase-stat-item">
              <strong>100%</strong>
              <span>Verified Society Residents</span>
            </div>
            <div className="showcase-stat-divider" aria-hidden="true" />
            <div className="showcase-stat-item">
              <strong>4</strong>
              <span>Integrated Ecosystem Roles</span>
            </div>
            <div className="showcase-stat-divider" aria-hidden="true" />
            <div className="showcase-stat-item">
              <strong>Real-Time</strong>
              <span>Live Order Progression</span>
            </div>
          </div>
        </section>

        {/* Why KitchenNextDoor Pillars */}
        <section className="showcase-section">
          <div className="showcase-section-header">
            <p className="eyebrow">The Hyperlocal Difference</p>
            <h2>Why KitchenNextDoor Replaces Traditional Food Apps</h2>
            <p className="showcase-section-sub">
              Built specifically for apartment societies and gated communities to foster genuine connections, safety, and fresh food.
            </p>
          </div>
          <div className="showcase-pillars-grid">
            {PILLARS.map((pillar, idx) => (
              <div className="showcase-pillar-card" key={idx}>
                <span className="pillar-icon" aria-hidden="true">{pillar.icon}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Role-Based Feature Explorer */}
        <section className="showcase-section">
          <div className="showcase-section-header">
            <p className="eyebrow">Comprehensive Platform Capabilities</p>
            <h2>Tailored Features for Every Community Member</h2>
            <p className="showcase-section-sub">
              Explore how each role interacts seamlessly inside KitchenNextDoor.
            </p>
          </div>

          <div className="showcase-role-tabs" role="tablist" aria-label="Feature roles">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                role="tab"
                aria-selected={activeRole === role.id}
                className={`showcase-role-tab ${activeRole === role.id ? "is-active" : ""}`}
                onClick={() => setActiveRole(role.id)}
              >
                <span className="tab-icon">{role.icon}</span>
                <span className="tab-title">{role.title}</span>
                <span className="tab-role-badge">{role.roleLabel}</span>
              </button>
            ))}
          </div>

          <div className="showcase-role-details-panel" role="tabpanel">
            <div className="role-panel-intro">
              <div className="role-panel-title-wrap">
                <span className="role-panel-icon">{currentRole.icon}</span>
                <div>
                  <span className="role-panel-tag">{currentRole.badge}</span>
                  <h3>{currentRole.title} Experience</h3>
                  <p>{currentRole.tagline}</p>
                </div>
              </div>
              <div className="role-panel-action">
                {currentRole.id === "buyer" && (
                  <Link to="/" className="button button-primary button-small">Browse Menu</Link>
                )}
                {currentRole.id === "seller" && (
                  <Link to="/seller" className="button button-primary button-small">Seller Studio</Link>
                )}
                {currentRole.id === "admin" && (
                  <Link to="/admin" className="button button-primary button-small">Admin Portal</Link>
                )}
                {currentRole.id === "superadmin" && (
                  <Link to="/super-admin" className="button button-primary button-small">Control Center</Link>
                )}
              </div>
            </div>

            <div className="showcase-features-grid">
              {currentRole.highlights.map((item, index) => (
                <div className="showcase-feature-item" key={index}>
                  <div className="feature-item-header">
                    <span className="feature-icon" aria-hidden="true">{item.icon}</span>
                    <h4>{item.title}</h4>
                  </div>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Order Lifecycle Flow */}
        <section className="showcase-section showcase-lifecycle-section">
          <div className="showcase-section-header">
            <p className="eyebrow">Transparent Order Lifecycle</p>
            <h2>How an Order Travels Through the Community</h2>
          </div>
          <div className="showcase-stepper">
            <div className="stepper-step">
              <span className="stepper-num">1</span>
              <h4>Order Placed</h4>
              <p>Resident configures dishes, selects Doorstep or Pickup, and submits directly to the neighbour's kitchen.</p>
            </div>
            <div className="stepper-arrow" aria-hidden="true">→</div>
            <div className="stepper-step">
              <span className="stepper-num">2</span>
              <h4>Preparing</h4>
              <p>Home chef marks preparation in Seller Studio. Food is prepared fresh with family care and hygiene.</p>
            </div>
            <div className="stepper-arrow" aria-hidden="true">→</div>
            <div className="stepper-step">
              <span className="stepper-num">3</span>
              <h4>Ready</h4>
              <p>Dish is hot and packed. Buyer receives instant live status update for doorstep delivery or flat pickup.</p>
            </div>
            <div className="stepper-arrow" aria-hidden="true">→</div>
            <div className="stepper-step">
              <span className="stepper-num">4</span>
              <h4>Delivered</h4>
              <p>Handover confirmed. Payment completed via UPI or cash, transparent commission logged, and review unlocked.</p>
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="showcase-cta">
          <div className="showcase-cta-card">
            <h2>Experience Hyperlocal Home Cooking Today</h2>
            <p>
              Taste authentic comfort food cooked by neighbours in your society, or start sharing your own kitchen's culinary delights.
            </p>
            <div className="showcase-cta-buttons">
              <Link to="/" className="button button-primary">
                Browse Today's Menu
              </Link>
              <Link to="/login" className="button button-outline">
                Join Your Community
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

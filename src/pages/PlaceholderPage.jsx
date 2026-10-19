import SiteHeader from "../components/SiteHeader.jsx";

export default function PlaceholderPage({ title }) {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="placeholder-page">
        <div className="empty-plate" aria-hidden="true">{title === "Your Cart" ? "🧺" : "📣"}</div>
        <p className="eyebrow">Coming in a later phase</p>
        <h1>{title}</h1>
        <p>This part of KitchenNextDoor is not ready yet. Take a look at the Food Menu meanwhile.</p>
      </main>
    </div>
  );
}

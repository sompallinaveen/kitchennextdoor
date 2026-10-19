const STEPS = ["Placed", "Preparing", "Packed and Ready", "Delivered"];

export default function StatusStepper({ status }) {
  const terminalStatus = ["Rejected", "Cancelled"].includes(status);
  const activeIndex = status === "Ready" || status === "Packed and Ready"
    ? 2
    : status === "Delivered" || status === "Delivered and Paid" || status === "Cash received and delivered"
      ? 3
      : STEPS.indexOf(status);
  return (
    <div className={`order-stepper${terminalStatus ? " is-terminal" : ""}`} aria-label={`Order status: ${status}`}>
      {terminalStatus ? (
        <span className="terminal-order-status">{status}</span>
      ) : STEPS.map((step, index) => (
        <div className={`order-step${index <= activeIndex ? " is-complete" : ""}`} key={step}>
          <span className="order-step-dot">{index < activeIndex ? "✓" : index + 1}</span>
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}

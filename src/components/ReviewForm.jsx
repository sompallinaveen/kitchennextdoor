import { useEffect, useState } from "react";

export default function ReviewForm({ cooks, user, onSubmit }) {
  const [sellerId, setSellerId] = useState(cooks[0]?.id || "");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cooks.some((cook) => cook.id === sellerId)) {
      setSellerId(cooks[0]?.id || "");
    }
  }, [cooks, sellerId]);

  function submit(event) {
    event.preventDefault();
    if (!sellerId || !stars || !comment.trim()) {
      setError("Choose a cook, select a star rating, and add a comment.");
      return;
    }
    setError("");
    onSubmit({
      sellerId,
      stars,
      comment: comment.trim(),
      reviewerName: user.name,
      reviewerFlat: [user.tower, user.flat].filter(Boolean).join(" · "),
    });
    setStars(0);
    setComment("");
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <label>
        Which cook did you order from?
        <select value={sellerId} onChange={(event) => setSellerId(event.target.value)} disabled={!cooks.length}>
          {cooks.map((cook) => (
            <option key={cook.id} value={cook.id}>{cook.kitchenName || cook.name}</option>
          ))}
        </select>
      </label>
      {!cooks.length && <p className="section-empty compact-empty">There are no cooks to review just yet.</p>}
      <fieldset className="star-picker">
        <legend>Your rating</legend>
        <div className="star-buttons" role="radiogroup" aria-label="Rating from one to five stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={stars === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              className={star <= stars ? "star-selected" : ""}
              onClick={() => setStars(star)}
            >★</button>
          ))}
        </div>
      </fieldset>
      <label>
        Your review
        <textarea rows="3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Tell your neighbours what you thought..." />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={!cooks.length}>Post review</button>
    </form>
  );
}

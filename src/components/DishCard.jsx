import { useState } from "react";

function Stars({ value }) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0) return <span className="rating-new">New</span>;
  return (
    <span className="dish-rating" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <span aria-hidden="true">★</span> {rating.toFixed(1)}
    </span>
  );
}

export default function DishCard({ dish, seller, rating, onOrder }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isSoldOut = Number(dish.stock) <= 0;

  return (
    <article className="dish-card">
      <div className="dish-photo-wrap">
        {dish.image && !imageFailed ? (
          <img
            className="dish-photo"
            src={dish.image}
            alt={dish.name}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="dish-placeholder" aria-label="Food image unavailable">🍲</div>
        )}
        <span className={`food-marker ${dish.veg ? "veg-marker" : "nonveg-marker"}`} title={dish.veg ? "Vegetarian" : "Non-vegetarian"}>
          <span />
        </span>
        <span className="prep-badge">⏱ {dish.prepMins} min</span>
      </div>
      <div className="dish-card-body">
        <div className="dish-title-row">
          <h3>{dish.name}</h3>
          <Stars value={rating} />
        </div>
        <p className="dish-description">{dish.description || "Made fresh with a little love."}</p>
        <p className="dish-kitchen">
          <strong>{seller?.kitchenName || "Neighbour's Kitchen"}</strong>
          {seller?.flat && <span> · {seller.flat}</span>}
        </p>
        <div className="dish-bottom-row">
          <div className="dish-price-block">
            <span className="dish-price">₹{Number(dish.price).toFixed(0)}</span>
            <span className={`dish-stock ${isSoldOut ? "stock-empty" : ""}`}>
              {isSoldOut ? "Sold out" : `${dish.stock} available`}
            </span>
          </div>
          {isSoldOut ? (
            <button className="button add-button sold-out-button" type="button" disabled>Sold out</button>
          ) : (
            <button className="button add-button" type="button" onClick={() => onOrder(dish, seller)}>
              {dish.options?.length ? "Customise +" : "Add +"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

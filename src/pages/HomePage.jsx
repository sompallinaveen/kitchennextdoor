import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DishCard from "../components/DishCard.jsx";
import CustomiseModal from "../components/CustomiseModal.jsx";
import ReviewForm from "../components/ReviewForm.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import {
  addReview,
  getAnnouncement,
  getDishes,
  getOrdersByBuyer,
  getReviews,
  getSellers,
  getSociety,
  getSocieties,
  getSocietyIdForUser,
} from "../api/store.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

const CATEGORIES = ["All Dishes", "Tiffins", "Snacks", "Sweets", "Drinks", "Specials"];

function averageRating(reviews) {
  if (!reviews.length) return null;
  return reviews.reduce((sum, review) => sum + Number(review.stars || 0), 0) / reviews.length;
}

function getFlat(seller) {
  return [seller?.tower, seller?.flat].filter(Boolean).join(" · ");
}

export default function HomePage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [guestSocietyId, setGuestSocietyId] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [societySuspended, setSocietySuspended] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState("All");
  const [category, setCategory] = useState("All Dishes");
  const [activeDish, setActiveDish] = useState(null);
  const [orderMessage, setOrderMessage] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");

  const societyId = user ? getSocietyIdForUser(user) : guestSocietyId;
  const loadMenuData = useCallback(() => {
    try {
      setDishes(societyId ? getDishes(societyId) : []);
      setSellers(societyId ? getSellers(societyId) : []);
      setReviews(societyId ? getReviews(societyId) : []);
      setAnnouncement(getAnnouncement(societyId));
      setSocietySuspended(getSociety(societyId)?.status === "suspended");
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "We couldn't load the neighbourhood menu.");
    }
  }, [societyId]);

  useEffect(() => {
    try {
      const availableSocieties = getSocieties();
      setSocieties(availableSocieties);
      if (!user && !guestSocietyId && availableSocieties.length) {
        setGuestSocietyId(availableSocieties[0].id);
      }
    } catch (error) {
      setLoadError(error.message || "Societies couldn't be loaded.");
    }
  }, [user, guestSocietyId]);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  useEffect(() => {
    try {
      setBuyerOrders(user?.role === "buyer" ? getOrdersByBuyer(user.id, societyId) : []);
    } catch (error) {
      setReviewError(error.message || "Your delivered orders couldn't be checked.");
    }
  }, [user?.id, user?.role, societyId]);

  const sellerById = useMemo(
    () => new Map(sellers.map((seller) => [seller.id, seller])),
    [sellers],
  );
  const visibleDishes = useMemo(
    () =>
      dishes.filter((dish) => {
        const seller = sellerById.get(dish.sellerId);
        return seller?.status === "verified" && seller.online === true && dish.available !== false;
      }),
    [dishes, sellerById],
  );
  const cooks = useMemo(() => {
    const availableSellerIds = new Set(
      dishes
        .filter((dish) => dish.available !== false && Number(dish.stock) > 0)
        .map((dish) => dish.sellerId),
    );
    return sellers.filter(
      (seller) => seller.status === "verified" && seller.online === true && availableSellerIds.has(seller.id),
    );
  }, [dishes, sellers]);
  const filteredDishes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return visibleDishes.filter((dish) => {
      const seller = sellerById.get(dish.sellerId);
      const matchesQuery =
        !needle ||
        [dish.name, seller?.kitchenName, seller?.name].some((value) =>
          value?.toLowerCase().includes(needle),
        );
      const matchesDiet = diet === "All" || (diet === "Veg" ? dish.veg : !dish.veg);
      const matchesCategory = category === "All Dishes" || dish.category === category;
      return matchesQuery && matchesDiet && matchesCategory;
    });
  }, [category, diet, query, sellerById, visibleDishes]);

  const ratedCooks = useMemo(
    () =>
      cooks.map((cook) => {
        const cookReviews = reviews.filter((review) => review.sellerId === cook.id);
        return { ...cook, rating: averageRating(cookReviews), reviewCount: cookReviews.length };
      }),
    [cooks, reviews],
  );
  const overallRating = averageRating(reviews);
  const deliveredSellerIds = new Set(
    buyerOrders
      .filter((order) => ["Delivered", "Delivered and Paid", "Cash received and delivered"].includes(order.status))
      .map((order) => order.sellerId),
  );
  const reviewCooks = sellers.filter((seller) => deliveredSellerIds.has(seller.id));

  function requestOrder(dish, seller) {
    setOrderMessage("");
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "buyer") {
      setOrderMessage("Only buyer accounts can place orders.");
      return;
    }
    if (user.status !== "approved") {
      setOrderMessage("You can browse now. Ordering unlocks once your Society Admin approves your flat.");
      return;
    }
    setActiveDish({ dish, seller });
  }

  function addDishToCart(item) {
    addItem(item);
    setActiveDish(null);
    setOrderMessage(`${item.name} added to your cart.`);
  }

  function postReview(review) {
    try {
      addReview({ ...review, buyerId: user.id });
      setReviews(societyId ? getReviews(societyId) : []);
      setReviewError("");
      setReviewMessage("Thanks for sharing your neighbourly review!");
    } catch (error) {
      setReviewMessage("");
      setReviewError(error.message || "We couldn't post your review. Please try again.");
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      {announcement && <div className="announcement-banner">{announcement}</div>}
      {societySuspended && <div className="announcement-banner society-suspended-banner" role="status">Marketplace temporarily paused for this society. Kitchens are offline and new orders are unavailable.</div>}
      <main>
        {!user && societies.length > 0 && (
          <div className="guest-society-picker">
            <label htmlFor="guest-society">Browsing society</label>
            <select id="guest-society" value={guestSocietyId} onChange={(event) => setGuestSocietyId(event.target.value)}>
              {societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}
            </select>
          </div>
        )}
        <section className="menu-hero">
          <div className="menu-hero-copy">
            <p className="eyebrow">Good food, just next door</p>
            <h1>Home-cooked, <span>one floor away.</span></h1>
            <p className="hero-description">
              Discover the lovely things your neighbours are cooking. Fresh, homemade
              favourites are made just around the corner.
            </p>
            {user?.role === "buyer" && user.status === "pending" && (
              <div className="approval-notice" role="status">
                <span className="notice-dot" />
                <span><strong>You're on the list!</strong> Your society admin will approve your
                  flat before you can place an order.</span>
              </div>
            )}
            <div className="menu-stats" aria-label="Community food stats">
              <div><strong>{visibleDishes.length}</strong><span>homemade dishes</span></div>
              <div><strong>{cooks.length}</strong><span>home cooks</span></div>
              <div><strong>{overallRating === null ? "—" : overallRating.toFixed(1)}</strong><span>neighbour rating</span></div>
            </div>
          </div>
          <div className="menu-hero-art">
            <img src="/hero-house.png" alt="A cosy home sharing fresh food with neighbours" />
            <span className="hero-sparkle sparkle-one" aria-hidden="true">✦</span>
            <span className="hero-sparkle sparkle-two" aria-hidden="true">✦</span>
          </div>
        </section>

        <section className="menu-content" aria-labelledby="menu-heading">
          <div className="menu-section-heading">
            <div>
              <p className="eyebrow">Made nearby, with love</p>
              <h2 id="menu-heading">Today's neighbourhood menu</h2>
            </div>
            <span className="dish-total">{visibleDishes.length} {visibleDishes.length === 1 ? "dish" : "dishes"}</span>
          </div>
          <div className="menu-controls">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search dishes, kitchens or cooks"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search dishes, kitchens or cooks"
              />
            </label>
            <div className="diet-toggle" role="group" aria-label="Filter by diet">
              {["All", "Veg", "Non-Veg"].map((filter) => (
                <button
                  key={filter}
                  className={diet === filter ? "active" : ""}
                  type="button"
                  onClick={() => setDiet(filter)}
                >{filter}</button>
              ))}
            </div>
          </div>
          <div className="category-chips" aria-label="Dish categories">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >{item}</button>
            ))}
          </div>

          {loadError ? (
            <div className="section-empty error-empty" role="alert">
              <p>{loadError}</p>
              <button className="button button-outline" type="button" onClick={loadMenuData}>Try again</button>
            </div>
          ) : filteredDishes.length ? (
            <div className="dish-grid">
              {filteredDishes.map((dish) => {
                const seller = sellerById.get(dish.sellerId);
                const cookReviews = reviews.filter((review) => review.sellerId === dish.sellerId);
                return (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    seller={seller}
                    rating={averageRating(cookReviews)}
                    onOrder={requestOrder}
                  />
                );
              })}
            </div>
          ) : (
            <div className="section-empty">
              <span className="section-empty-icon" aria-hidden="true">{dishes.length ? "🔎" : "🍲"}</span>
              <h3>{visibleDishes.length ? "No dishes match just now" : "The first dish is still simmering"}</h3>
              <p>
                {visibleDishes.length
                  ? "Try another search or category to find a neighbourly favourite."
                  : "No dishes yet. Home cooks in your society will list their dishes here soon."}
              </p>
            </div>
          )}
          {orderMessage && <p className="order-message" role="status">{orderMessage}</p>}
        </section>

        <section className="community-section" aria-labelledby="cooks-heading">
          <div className="menu-section-heading">
            <div>
              <p className="eyebrow">Your neighbours at the stove</p>
              <h2 id="cooks-heading">Verified Cooks in Your Society</h2>
            </div>
          </div>
          {ratedCooks.length ? (
            <div className="cook-grid">
              {ratedCooks.map((cook) => (
                <article className="cook-card" key={cook.id}>
                  <div className="cook-avatar" aria-hidden="true">
                    {(cook.kitchenName || cook.name || "K").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="cook-card-main">
                    <h3>{cook.kitchenName || "Neighbour's Kitchen"}</h3>
                    <p>{cook.name} · {getFlat(cook) || "Your society"}</p>
                    <span className="cook-speciality">{cook.speciality || "Home-cooked favourites"}</span>
                  </div>
                  <span className="cook-rating">
                    {cook.rating === null ? "New" : <>★ {cook.rating.toFixed(1)}</>}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="section-empty section-empty-inline">
              <span className="section-empty-icon" aria-hidden="true">👩‍🍳</span>
              <h3>Your neighbour chefs will be here soon</h3>
              <p>No home cooks have listed a dish yet. Keep an eye out for new kitchens.</p>
            </div>
          )}
        </section>

        <section className="review-section" aria-labelledby="review-heading">
          <div className="review-form-panel">
            <p className="eyebrow">A little kindness goes a long way</p>
            <h2 id="review-heading">Rate Your Home-Cooked Meal</h2>
            {user?.role === "buyer" && reviewCooks.length > 0 ? (
              <ReviewForm cooks={reviewCooks} user={user} onSubmit={postReview} />
            ) : user?.role === "buyer" ? (
              <p className="review-access-message">You can review a cook after an order has been delivered</p>
            ) : !user ? (
              <p className="review-access-message">
                <Link to="/login">Log in to review a cook</Link>
              </p>
            ) : (
              <p className="review-access-message">You can review a cook after an order has been delivered</p>
            )}
            {reviewMessage && <p className="success-message" role="status">{reviewMessage}</p>}
            {reviewError && <p className="field-error" role="alert">{reviewError}</p>}
          </div>

          <div className="neighbour-reviews">
            <p className="eyebrow">Kind words from around the corner</p>
            <h2>Neighbour Reviews</h2>
            {reviews.length ? (
              <div className="review-list">
                {[...reviews].reverse().map((review) => {
                  const cook = sellerById.get(review.sellerId);
                  return (
                    <article className="review-card" key={review.id}>
                      <div className="review-card-top">
                        <strong>{cook?.kitchenName || cook?.name || "Neighbour's Kitchen"}</strong>
                        <span className="review-stars" aria-label={`${review.stars} out of 5 stars`}>
                          {"★".repeat(Math.max(0, Math.min(5, Number(review.stars))))}
                        </span>
                      </div>
                      <p>{review.comment}</p>
                      <span className="review-byline">
                        {review.reviewerName || "A neighbour"}
                        {review.reviewerFlat && ` · ${review.reviewerFlat}`}
                      </span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="section-empty section-empty-inline">
                <span className="section-empty-icon" aria-hidden="true">💬</span>
                <h3>Every good meal has a story</h3>
                <p>No neighbour reviews yet. Be the first to share a kind word after a meal.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      {activeDish && (
        <CustomiseModal
          dish={activeDish.dish}
          seller={activeDish.seller}
          onClose={() => setActiveDish(null)}
          onAdd={addDishToCart}
        />
      )}
    </div>
  );
}

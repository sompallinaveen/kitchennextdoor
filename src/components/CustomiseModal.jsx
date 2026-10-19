import { useEffect, useState } from "react";

function initialSelections(options) {
  return Object.fromEntries(
    (options || []).map((option, index) => [`${option.name}-${index}`, option.choices?.[0] || null]),
  );
}

export default function CustomiseModal({ dish, seller, onClose, onAdd }) {
  const [selections, setSelections] = useState(() => initialSelections(dish.options));
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const selectedOptions = (dish.options || []).map((option, index) => ({
    name: option.name,
    choice: selections[`${option.name}-${index}`]?.label || "",
    price: Number(selections[`${option.name}-${index}`]?.price || 0),
  }));
  const unit = Number(dish.price) + selectedOptions.reduce((sum, option) => sum + option.price, 0);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="customise-modal" role="dialog" aria-modal="true" aria-labelledby="customise-title">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <p className="eyebrow">{seller?.kitchenName || "Neighbour's kitchen"}</p>
        <h2 id="customise-title">{dish.name}</h2>
        <p className="modal-description">{dish.description}</p>
        {(dish.options || []).map((option, index) => (
          <fieldset className="option-group" key={`${option.name}-${index}`}>
            <legend>{option.name}</legend>
            {(option.choices || []).map((choice) => {
              const groupName = `choice-${index}`;
              const selected = selections[`${option.name}-${index}`]?.label === choice.label;
              return (
                <label className="option-choice" key={choice.label}>
                  <input
                    type="radio"
                    name={groupName}
                    checked={selected}
                    onChange={() =>
                      setSelections((current) => ({
                        ...current,
                        [`${option.name}-${index}`]: choice,
                      }))
                    }
                  />
                  <span>{choice.label}</span>
                  {Number(choice.price) > 0 && <span className="option-price">(+₹{choice.price})</span>}
                </label>
              );
            })}
          </fieldset>
        ))}
        <label className="note-field">
          Note to the cook <span className="optional">(optional)</span>
          <textarea
            rows="2"
            maxLength="240"
            placeholder="Any little requests?"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="modal-footer">
          <div className="quantity-stepper" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((current) => Math.max(1, current - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" aria-label="Increase quantity" disabled={qty >= Number(dish.stock)} onClick={() => setQty((current) => Math.min(Number(dish.stock), current + 1))}>+</button>
          </div>
          <button
            className="button button-primary modal-add"
            type="button"
            onClick={() =>
              onAdd({
                key: "",
                dishId: dish.id,
                sellerId: dish.sellerId,
                name: dish.name,
                unit,
                qty,
                options: selectedOptions,
                note: note.trim(),
              })
            }
          >
            Add to cart · ₹{unit * qty}
          </button>
        </div>
        <button className="cancel-button" type="button" onClick={onClose}>Cancel</button>
      </section>
    </div>
  );
}

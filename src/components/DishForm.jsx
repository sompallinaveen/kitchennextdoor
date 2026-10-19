import { useState } from "react";
import OptionBuilder from "./OptionBuilder.jsx";

const CATEGORIES = ["Tiffins", "Snacks", "Sweets", "Drinks", "Specials"];

function toEditorGroups(options = []) {
  return options.map((group) => ({
    id: crypto.randomUUID(),
    name: group.name || "",
    choices: (group.choices || []).map((choice) => ({
      id: crypto.randomUUID(),
      label: choice.label || "",
      price: choice.price ?? "",
    })),
  }));
}

async function compressImage(file) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const scale = Math.min(1, 600 / image.naturalWidth, 600 / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo resizing isn't available in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function DishForm({ dish, sellerId, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: dish?.name || "",
    description: dish?.description || "",
    category: dish?.category || CATEGORIES[0],
    veg: dish?.veg ?? true,
    price: dish?.price ?? "",
    prepMins: dish?.prepMins ?? 20,
    stock: dish?.stock ?? 0,
    image: dish?.image || "",
    available: dish?.available ?? true,
    options: toEditorGroups(dish?.options),
  }));
  const [error, setError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the dish photo.");
      return;
    }
    setPhotoBusy(true);
    setError("");
    try {
      const image = await compressImage(file);
      update("image", image);
    } catch (photoError) {
      setError(photoError.message || "We couldn't process that photo.");
    } finally {
      setPhotoBusy(false);
      event.target.value = "";
    }
  }

  function submit(event) {
    event.preventDefault();
    const price = Number(form.price);
    const prepMins = Number(form.prepMins);
    const stock = Number(form.stock);
    if (!form.name.trim()) {
      setError("Dish name is required.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a price greater than ₹0.");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0 || !Number.isFinite(prepMins) || prepMins < 0) {
      setError("Stock and preparation time must be zero or more.");
      return;
    }

    const options = form.options
      .map((group) => ({
        name: group.name.trim(),
        choices: group.choices
          .filter((choice) => choice.label.trim())
          .map((choice) => ({ label: choice.label.trim(), price: Number(choice.price) || 0 })),
      }))
      .filter((group) => group.name && group.choices.length);
    if (options.some((group) => group.choices.some((choice) => choice.price < 0))) {
      setError("Customisation prices cannot be negative.");
      return;
    }

    const saveError = onSave({
      id: dish?.id || crypto.randomUUID(),
      sellerId,
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      veg: form.veg,
      price,
      prepMins,
      stock,
      image: form.image,
      available: form.available,
      options,
    });
    if (saveError) setError(saveError);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="dish-form-modal" role="dialog" aria-modal="true" aria-labelledby="dish-form-title">
        <button className="modal-close" type="button" aria-label="Close" onClick={onCancel}>×</button>
        <p className="eyebrow">A little something from your kitchen</p>
        <h2 id="dish-form-title">{dish ? "Edit dish" : "Add a dish"}</h2>
        <form className="dish-form" onSubmit={submit}>
          <label>
            Dish name *
            <input required maxLength={100} value={form.name} onChange={(event) => update("name", event.target.value)} />
          </label>
          <label>
            Description
            <textarea rows="2" maxLength={300} value={form.description} onChange={(event) => update("description", event.target.value)} />
          </label>
          <div className="dish-form-row">
            <label>
              Category
              <select value={form.category} onChange={(event) => update("category", event.target.value)}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Price (₹) *
              <input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} />
            </label>
          </div>
          <div className="dish-form-row dish-form-numbers">
            <label>
              Preparation (mins)
              <input type="number" min="0" step="1" value={form.prepMins} onChange={(event) => update("prepMins", event.target.value)} />
            </label>
            <label>
              Portions in stock
              <input type="number" min="0" step="1" value={form.stock} onChange={(event) => update("stock", event.target.value)} />
            </label>
          </div>
          <fieldset className="veg-selector">
            <legend>Dish type</legend>
            <label><input type="radio" checked={form.veg} onChange={() => update("veg", true)} /> Veg</label>
            <label><input type="radio" checked={!form.veg} onChange={() => update("veg", false)} /> Non-veg</label>
          </fieldset>
          <div className="dish-photo-field">
            <label>
              Dish photo
              <input type="file" accept="image/*" onChange={handlePhoto} />
            </label>
            {photoBusy && <span className="photo-status">Preparing photo…</span>}
            {form.image && <img className="dish-photo-preview" src={form.image} alt="Dish preview" />}
          </div>
          <OptionBuilder value={form.options} onChange={(options) => update("options", options)} />
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="dish-form-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={photoBusy}>{dish ? "Save changes" : "Add dish"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

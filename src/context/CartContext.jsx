import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCart, saveCart } from "../api/store.js";

const CartContext = createContext(null);

function makeItemKey(item) {
  const options = [...(item.options || [])].sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify([item.dishId, item.sellerId, options, item.note || ""]);
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => getCart());

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((item) => {
    const key = makeItemKey(item);
    setItems((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) {
        return current.map((entry) =>
          entry.key === key ? { ...entry, qty: entry.qty + item.qty } : entry,
        );
      }
      return [...current, { ...item, key }];
    });
  }, []);

  const updateQuantity = useCallback((key, qty) => {
    setItems((current) => current.map((item) =>
      item.key === key ? { ...item, qty } : item,
    ));
  }, []);

  const removeItem = useCallback((key) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      count: items.reduce((total, item) => total + item.qty, 0),
    }),
    [items, addItem, updateQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider.");
  return context;
}

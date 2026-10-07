import { useEffect, useState } from "react";
import { fetchProducts } from "../api/products";

export function useProducts() {
  const [state, setState] = useState({
    products: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((products) => {
        if (!cancelled) setState({ products, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ products: [], loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export default useProducts;

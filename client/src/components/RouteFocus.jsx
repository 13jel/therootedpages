import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const PRODUCT_PAGE = /^\/products\/[^/]+$/;

export default function RouteFocus() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;

    if (previous === pathname) return;
    // Variantbyte på en produktsida: fokus ska stanna på knappen man tryckte på
    if (PRODUCT_PAGE.test(previous) && PRODUCT_PAGE.test(pathname)) return;

    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}

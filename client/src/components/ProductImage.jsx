import { useState } from "react";

export default function ProductImage({
  src,
  alt = "",
  className = "",
  size,
  loading,
}) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className || undefined}
        loading={loading}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  const classes = [
    "product-image-placeholder",
    size ? `product-image-placeholder--${size}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <span>Skapas på beställning</span>
    </div>
  );
}

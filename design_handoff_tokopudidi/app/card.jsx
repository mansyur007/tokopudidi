// ProductCard with style variants (classic / minimal / bold) + small bits

function StarRating({ value, size = 12 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: "#ffb700" }}>
      <Icon name="star" size={size} />
      <span style={{ color: "#2e3137", fontWeight: 600, fontSize: size }}>{value.toFixed(1)}</span>
    </span>
  );
}

function DiscountBadge({ pct, style = {} }) {
  return (
    <span
      style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "var(--red)", color: "#fff", fontWeight: 800, fontSize: 11,
        borderRadius: 6, padding: "1px 5px", lineHeight: 1.05, ...style,
      }}
    >
      {pct}%
    </span>
  );
}

function ProductCard({ p, variant = "classic", onOpen, onAdd }) {
  const isBold = variant === "bold";
  const isMinimal = variant === "minimal";

  return (
    <article
      className={"pcard pcard-" + variant}
      onClick={() => onOpen(p)}
    >
      {/* image */}
      <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: isMinimal ? 0 : 0, overflow: "hidden", background: p.tone }}>
        <Placeholder label={p.label} tone={p.tone} />
        {/* discount badge */}
        {!isMinimal && (
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <DiscountBadge pct={p.discount} />
            {p.mall && (
              <span style={{ background: "rgba(255,255,255,0.92)", color: "var(--green)", fontWeight: 800, fontSize: 10, borderRadius: 5, padding: "2px 5px" }}>
                MALL
              </span>
            )}
          </div>
        )}
        {/* quick add */}
        <button
          className="quick-add"
          onClick={(e) => { e.stopPropagation(); onAdd(p); }}
          aria-label="Tambah ke keranjang"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>

      {/* body */}
      <div style={{ padding: isBold ? "10px 11px 12px" : "9px 10px 11px", display: "flex", flexDirection: "column", gap: isBold ? 5 : 4 }}>
        {p.official && !isMinimal && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted)", fontSize: 10.5, fontWeight: 600 }}>
            <Icon name="shield" size={12} style={{ color: "var(--green)" }} /> Official Store
          </div>
        )}
        <h3 className="pcard-name" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35, color: "#2e3137", margin: 0 }}>
          {p.name}
        </h3>

        {isBold ? (
          <div style={{ marginTop: 2 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "var(--green)", letterSpacing: "-0.01em" }}>{fmtRp(p.price)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
              <span style={{ background: "var(--red-tint)", color: "var(--red)", fontWeight: 700, fontSize: 10.5, borderRadius: 4, padding: "1px 4px" }}>{p.discount}%</span>
              <span style={{ textDecoration: "line-through", color: "var(--muted)", fontSize: 11.5 }}>{fmtRp(p.oldPrice)}</span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: "#2e3137", letterSpacing: "-0.01em", marginTop: 1 }}>{fmtRp(p.price)}</div>
            {!isMinimal && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ textDecoration: "line-through", color: "var(--muted)", fontSize: 11.5 }}>{fmtRp(p.oldPrice)}</span>
              </div>
            )}
          </>
        )}

        {/* bonus pill */}
        {!isMinimal && p.freeOngkir && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start", background: "#fff", border: "1px solid #ffd9be", color: "#c2410c", fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "1px 5px" }}>
            <Icon name="truck" size={11} /> Bebas Ongkir
          </div>
        )}

        {/* rating + sold */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
          <StarRating value={p.rating} />
          <span style={{ color: "var(--line-dark)" }}>•</span>
          <span>{p.sold}</span>
        </div>

        {/* location */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
          {p.official && (
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="check" size={9} stroke={2.5} />
            </span>
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.location}</span>
        </div>
      </div>
    </article>
  );
}

Object.assign(window, { ProductCard, StarRating, DiscountBadge });

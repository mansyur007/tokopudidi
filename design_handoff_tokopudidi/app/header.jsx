// Header: top utility strip, main bar (logo/search/actions), location bar

function Logo({ onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
    >
      <div
        style={{
          width: 30, height: 30, borderRadius: 9,
          background: "var(--green)",
          display: "grid", placeItems: "center",
          boxShadow: "0 2px 6px rgba(31,164,99,0.35)",
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: "50% 50% 50% 2px", background: "#fff", transform: "rotate(45deg)" }} />
      </div>
      <span style={{ fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em", color: "#2e3137" }}>
        toko<span style={{ color: "var(--green)" }}>pudidi</span>
      </span>
    </div>
  );
}

function IconBtn({ name, badge, onClick }) {
  return (
    <button className="icon-btn" onClick={onClick} aria-label={name}>
      <Icon name={name} size={22} />
      {badge != null && <span className="icon-badge">{badge}</span>}
    </button>
  );
}

function Header({ cartCount, onLogoClick, onCartClick, query, setQuery }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#fff", boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }}>
      {/* top utility strip */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 30, fontSize: 11.5, color: "var(--muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#2e3137" }}>
            <span style={{ color: "var(--green)" }}>●</span> Gratis Ongkir + Banyak Promo, belanja di aplikasi
            <Icon name="chevron-right" size={13} />
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {["Tentang Tokopudidi", "Pusat Edukasi Seller", "Promo", "Tokopudidi Care"].map((x) => (
              <a key={x} href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--muted)", textDecoration: "none" }}>{x}</a>
            ))}
          </nav>
        </div>
      </div>

      {/* main bar */}
      <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 18, height: 62 }}>
        <Logo onClick={onLogoClick} />
        <button className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
          <Icon name="menu" size={18} /> Kategori
        </button>
        <div className="search-box">
          <Icon name="search" size={18} style={{ color: "var(--muted)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari di Tokopudidi"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <IconBtn name="cart" badge={cartCount || null} onClick={onCartClick} />
          <IconBtn name="bell" badge={3} />
          <IconBtn name="chat" badge={5} />
        </div>
        <div style={{ width: 1, height: 28, background: "var(--line)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--line)" }}>
            <Placeholder label="" tone="#dfe3e6" />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Toko Saya</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Akun</div>
          </div>
        </div>
      </div>

      {/* location bar */}
      <div className="wrap" style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 8, marginTop: -4 }}>
        <button className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#2e3137" }}>
          <Icon name="pin" size={15} style={{ color: "var(--green)" }} />
          Dikirim ke <strong>Alamat Utama</strong>
          <Icon name="chevron-down" size={14} />
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { Header, Logo, IconBtn });

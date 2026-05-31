// Home view: banner carousel, hero card, category chips, product feed

function BannerCarousel() {
  const [i, setI] = React.useState(0);
  const n = BANNERS.length;
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n]);
  const b = BANNERS[i];
  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", height: 200 }}>
      <div style={{ position: "absolute", inset: 0, background: b.bg, transition: "background 0.5s" }} />
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle at 78% 50%, ${b.accent}44, transparent 55%)`,
        }}
      />
      {/* right-side image slot */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "42%", opacity: 0.5 }}>
        <Placeholder label={b.note} tone="transparent" labelStyle={{ color: "rgba(255,255,255,0.6)" }} style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 10px)" }} />
      </div>
      <div style={{ position: "absolute", left: 40, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", color: "#fff" }}>
        <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: b.accent }} /> {b.kicker}
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.95 }}>{b.title}</div>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>{b.big}</div>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ marginTop: 16, alignSelf: "flex-start", color: "#fff", background: "rgba(255,255,255,0.16)", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          Lihat Promo Lainnya
        </a>
      </div>
      {/* arrows */}
      <button className="carousel-arrow" style={{ left: 12 }} onClick={() => setI((x) => (x - 1 + n) % n)}><Icon name="chevron-left" size={18} /></button>
      <button className="carousel-arrow" style={{ right: 12 }} onClick={() => setI((x) => (x + 1) % n)}><Icon name="chevron-right" size={18} /></button>
      {/* dots */}
      <div style={{ position: "absolute", bottom: 12, left: 40, display: "flex", gap: 6 }}>
        {BANNERS.map((_, k) => (
          <span key={k} onClick={() => setI(k)} style={{ width: k === i ? 18 : 7, height: 7, borderRadius: 4, background: k === i ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.3s" }} />
        ))}
      </div>
    </div>
  );
}

function HeroCard() {
  const [tab, setTab] = React.useState(0);
  const [phone, setPhone] = React.useState("0812 3456 7890");
  return (
    <div className="hero-card">
      {/* left: kategori populer */}
      <div style={{ flex: "1 1 56%", paddingRight: 28, borderRight: "1px solid var(--line)" }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 14px" }}>Kategori Populer</h2>
        <div style={{ position: "relative", minHeight: 112, borderRadius: 12, overflow: "hidden", background: "linear-gradient(100deg, var(--green), #18935a)", display: "flex", alignItems: "center", padding: "18px 22px", color: "#fff", marginBottom: 16 }}>
          <div style={{ maxWidth: "62%", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>Yuk, belanja di Tokopudidi</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>Lengkap dari beragam kategori</div>
            <button style={{ marginTop: 12, background: "#fff", color: "var(--green)", border: "none", padding: "7px 18px", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Cek Sekarang</button>
          </div>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 150, opacity: 0.45 }}>
            <Placeholder label="ilustrasi" tone="transparent" labelStyle={{ color: "rgba(255,255,255,0.65)" }} />
          </div>
        </div>
        <div className="cat-chips">
          {CATEGORIES.map((c) => (
            <button key={c.id} className="cat-chip">
              <span className="cat-chip-icon"><Icon name={c.icon} size={16} /></span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* right: top up & tagihan */}
      <div style={{ flex: "1 1 44%", paddingLeft: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Top Up & Tagihan</h2>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--green)", fontWeight: 700, fontSize: 13, textDecoration: "none", marginLeft: "auto" }}>Lihat Semua</a>
        </div>
        <div style={{ display: "flex", gap: 18, borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
          {TOPUP_TABS.map((t, k) => (
            <button key={t} onClick={() => setTab(k)} className="topup-tab" style={{ color: k === tab ? "var(--green)" : "var(--muted)", borderColor: k === tab ? "var(--green)" : "transparent", fontWeight: k === tab ? 700 : 500 }}>{t}</button>
          ))}
        </div>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>Nomor Telepon</label>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="topup-input" />
          <div style={{ position: "relative", flex: 1 }}>
            <select className="topup-input" style={{ appearance: "none", width: "100%", color: "var(--muted)" }}>
              <option>Pilih Nominal</option>
              <option>Rp10.000</option>
              <option>Rp25.000</option>
              <option>Rp50.000</option>
              <option>Rp100.000</option>
            </select>
            <Icon name="chevron-down" size={16} style={{ position: "absolute", right: 12, top: 13, color: "var(--muted)", pointerEvents: "none" }} />
          </div>
        </div>
        <button style={{ marginTop: 16, width: "100%", background: "var(--green)", color: "#fff", border: "none", padding: "11px", borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Beli</button>
      </div>
    </div>
  );
}

function ProductFeed({ variant, onOpen, onAdd }) {
  const [tab, setTab] = React.useState(0);
  const [count, setCount] = React.useState(18);
  const list = React.useMemo(() => {
    const base = PRODUCTS;
    let arr = tab === 1 ? base.filter((p) => p.mall) : base;
    // repeat to fill the feed
    const out = [];
    for (let k = 0; out.length < count; k++) out.push({ ...arr[k % arr.length], id: arr[k % arr.length].id + "_" + k });
    return out;
  }, [tab, count]);

  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        {FEED_TABS.map((t, k) => (
          <button key={t} onClick={() => setTab(k)} className="feed-tab" style={{ color: k === tab ? "var(--green)" : "#6b6f76", borderColor: k === tab ? "var(--green)" : "transparent", fontWeight: k === tab ? 800 : 600 }}>
            {k === 1 && <span style={{ background: "var(--green)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>MALL</span>}
            {t}
          </button>
        ))}
      </div>
      <div className="feed-grid">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} variant={variant} onOpen={onOpen} onAdd={onAdd} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
        <button onClick={() => setCount((c) => c + 12)} className="load-more">Muat Lebih Banyak</button>
      </div>
    </section>
  );
}

function HomeView({ variant, onOpen, onAdd }) {
  return (
    <main className="wrap" style={{ paddingTop: 12, paddingBottom: 40 }}>
      <BannerCarousel />
      <div style={{ marginTop: 18 }}>
        <HeroCard />
      </div>
      <ProductFeed variant={variant} onOpen={onOpen} onAdd={onAdd} />
    </main>
  );
}

Object.assign(window, { HomeView, BannerCarousel, HeroCard, ProductFeed });

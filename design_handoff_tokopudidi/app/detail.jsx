// Product detail view: gallery, buy box, store, reviews, related products

const REVIEWS = [
  { name: "Mustajab", when: "1 bulan lalu", rating: 5, text: "Insya Allah amanah, pembelian pertama di toko ini. Adminnya responsif, produk yahud. Pengiriman super cepat, pagi order siang sampai. Teknisi ramah. Terima kasih!", photos: 2, helpful: 3 },
  { name: "Gᴬⁿ⁰", when: "1 bulan lalu", rating: 5, text: "Pengiriman cepat dan aman, sesampainya di rumah langsung dibantu pasang. Nice service & nice product.", photos: 0, helpful: 1 },
  { name: "Hadi", when: "3 bulan lalu", rating: 5, text: "Barang pasti original dari official store-nya, kokoh banget. Terima kasih.", photos: 1, helpful: 0 },
  { name: "Muhamad", when: "lebih dari 1 tahun lalu", rating: 5, text: "Beda memang kalau beli di official store, pelayanan sampai ke pemasangan. Mantap.", photos: 1, helpful: 0 },
  { name: "Yohanna", when: "1 minggu lalu", rating: 3, text: "Kasih bintang 3 sebab ada baret cukup dalam di body kiri bawah, foto terlampir.", photos: 1, helpful: 0 },
  { name: "Yasir", when: "2 minggu lalu", rating: 5, text: "Kualitas terpercaya.", photos: 0, helpful: 1 },
  { name: "Mbah", when: "lebih dari 1 tahun lalu", rating: 5, text: "Life goods, memang beda kalau LG. Mantap, hening, bersih.", photos: 0, helpful: 0 },
];

function StoreAvatarTone({ tone = "#dfe3e6", size = 40 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: tone }}><Placeholder label="" tone={tone} /></div>;
}

function Gallery({ p }) {
  const thumbs = [p.tone, "#e9edf0", "#eceae6", "#e8ece9", "#edeaef"];
  const [active, setActive] = React.useState(0);
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {thumbs.map((t, k) => (
          <button key={k} onMouseEnter={() => setActive(k)} onClick={() => setActive(k)}
            style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", border: k === active ? "2px solid var(--green)" : "1px solid var(--line)", padding: 0, cursor: "pointer", background: t }}>
            <Placeholder label="" tone={t} />
          </button>
        ))}
      </div>
      <div style={{ flex: 1, aspectRatio: "1 / 1", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)", background: thumbs[active] }}>
        <Placeholder label={p.label} tone={thumbs[active]} labelStyle={{ fontSize: 12 }} />
      </div>
    </div>
  );
}

function InfoTabs({ p }) {
  const [tab, setTab] = React.useState(0);
  const tabs = ["Detail Produk", "Spesifikasi", "Info Penting"];
  return (
    <div>
      <div style={{ display: "flex", gap: 22, borderBottom: "1px solid var(--line)" }}>
        {tabs.map((t, k) => (
          <button key={t} onClick={() => setTab(k)} className="feed-tab" style={{ fontSize: 14, color: k === tab ? "var(--green)" : "#6b6f76", borderColor: k === tab ? "var(--green)" : "transparent", fontWeight: k === tab ? 800 : 600 }}>{t}</button>
        ))}
      </div>
      <div style={{ paddingTop: 16, fontSize: 13.5, color: "#3a3e45", lineHeight: 1.7 }}>
        {tab === 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            <Row k="Kondisi" v="Baru" />
            <Row k="Berat Satuan" v="150 kg" />
            <Row k="Min. Beli" v="1 Buah" />
            <Row k="Kategori" v={<a href="#" onClick={(e)=>e.preventDefault()} style={{color:"var(--green)",textDecoration:"none",fontWeight:600}}>{p.category}</a>} />
            <Row k="Etalase" v={<a href="#" onClick={(e)=>e.preventDefault()} style={{color:"var(--green)",textDecoration:"none",fontWeight:600}}>Semua Etalase</a>} />
            <div style={{ marginTop: 10 }}>
              <strong style={{ display: "block", marginBottom: 4 }}>{p.name}</strong>
              Teknologi inverter hemat energi & senyap, dengan sistem 6 arah gerakan cuci untuk hasil yang bersih maksimal namun lembut di serat kain. Garansi resmi & pemasangan oleh teknisi.
              <a href="#" onClick={(e)=>e.preventDefault()} style={{ display:"block", color: "var(--green)", fontWeight: 700, marginTop: 6, textDecoration:"none" }}>Lihat Selengkapnya</a>
            </div>
          </div>
        )}
        {tab === 1 && (
          <div style={{ display: "grid", gap: 6 }}>
            <Row k="Kapasitas" v="7 kg" />
            <Row k="Tipe" v="Front Loading / Inverter" />
            <Row k="Konsumsi Daya" v="380 Watt" />
            <Row k="Dimensi" v="60 × 56 × 85 cm" />
            <Row k="Garansi" v="2 tahun resmi" />
          </div>
        )}
        {tab === 2 && (
          <p style={{ margin: 0 }}>Produk dijual oleh penjual resmi. Pastikan cek kelengkapan saat barang diterima dan simpan kartu garansi. Pemasangan gratis di area tertentu.</p>
        )}
      </div>
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, alignItems: "start", lineHeight: 1.5 }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <span style={{ color: "#2e3137" }}>{v}</span>
    </div>
  );
}

function BuyBox({ p, onAdd }) {
  const [qty, setQty] = React.useState(1);
  const subtotal = p.price * qty;
  return (
    <div className="buy-box">
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Atur jumlah dan catatan</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div className="qty-stepper">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}><Icon name="minus" size={14} /></button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)}><Icon name="plus" size={14} /></button>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Stok Total <strong style={{ color: "#2e3137" }}>88</strong></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Subtotal</span>
        <span style={{ fontWeight: 800, fontSize: 19 }}>{fmtRp(subtotal)}</span>
      </div>
      <button onClick={() => onAdd(p, qty)} style={{ width: "100%", background: "var(--green)", color: "#fff", border: "none", padding: "11px", borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Icon name="plus" size={16} /> Keranjang
      </button>
      <button style={{ width: "100%", background: "#fff", color: "var(--green)", border: "1.5px solid var(--green)", padding: "10px", borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 10 }}>Beli Langsung</button>
      <div style={{ display: "flex", justifyContent: "space-around", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: 12.5 }}>
        {[["chat", "Chat"], ["heart", "Wishlist"], ["share", "Share"]].map(([ic, lb]) => (
          <button key={lb} className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name={ic} size={16} /> {lb}</button>
        ))}
      </div>
    </div>
  );
}

function ReviewBreakdown() {
  const dist = [[5, 120], [4, 30], [3, 9], [2, 0], [1, 1]];
  const max = 120;
  return (
    <div style={{ display: "flex", gap: 36, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Icon name="star" size={40} style={{ color: "#ffb700" }} />
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>4.9<span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 600 }}> / 5.0</span></div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>96% pembeli merasa puas</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>26 rating • 14 ulasan</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 5 }}>
        {dist.map(([s, c]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <Icon name="star" size={12} style={{ color: "#ffb700" }} />
            <span style={{ width: 8 }}>{s}</span>
            <div style={{ flex: 1, height: 7, borderRadius: 4, background: "#eef0f2", overflow: "hidden" }}>
              <div style={{ width: (c / max) * 100 + "%", height: "100%", background: "var(--green)" }} />
            </div>
            <span style={{ width: 28, textAlign: "right", color: "var(--muted)" }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div style={{ borderBottom: "1px solid var(--line)", padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: 12.5, marginBottom: 8 }}>{title}<Icon name="chevron-down" size={14} /></div>
      {children}
    </div>
  );
}
function Check({ label, on }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#3a3e45", padding: "4px 0", cursor: "pointer" }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, border: on ? "none" : "1.5px solid var(--line-dark)", background: on ? "var(--green)" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>{on && <Icon name="check" size={11} stroke={3} />}</span>
      {label}
    </label>
  );
}

function ReviewItem({ r }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, color: "#ffb700", marginBottom: 6 }}>
        {[0,1,2,3,4].map((k) => <Icon key={k} name="star" size={13} style={{ color: k < r.rating ? "#ffb700" : "#e2e5e8" }} />)}
        <span style={{ color: "var(--muted)", fontSize: 11.5, marginLeft: 8 }}>{r.when}</span>
        <button className="ghost-btn" style={{ marginLeft: "auto", color: "var(--muted)" }}><Icon name="dots" size={16} /></button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <StoreAvatarTone size={28} tone="#e7eaed" />
        <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#3a3e45", lineHeight: 1.6 }}>{r.text}</p>
      {r.photos > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {Array.from({ length: r.photos }).map((_, k) => (
            <div key={k} style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}><Placeholder label="" tone="#e7eaed" /></div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--muted)" }}>
        <button className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="heart" size={14} /> {r.helpful > 0 ? `${r.helpful} orang terbantu` : "Membantu"}</button>
        <button className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", color: "var(--green)", fontWeight: 600 }}>Lihat Balasan <Icon name="chevron-down" size={13} /></button>
      </div>
    </div>
  );
}

function RelatedRow({ title, products, onOpen, onAdd, variant }) {
  return (
    <section style={{ marginTop: 30 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ marginLeft: "auto", color: "var(--green)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Lihat Semua</a>
      </div>
      <div className="feed-grid">
        {products.map((p) => <ProductCard key={p.id} p={p} variant={variant} onOpen={onOpen} onAdd={onAdd} />)}
      </div>
    </section>
  );
}

function DetailView({ p, variant, onOpen, onAdd, onBack }) {
  const related = PRODUCTS.filter((x) => x.id !== p.id).slice(0, 6);
  const more = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id);
  const moreList = (more.length >= 6 ? more : PRODUCTS).slice(0, 6);
  return (
    <main className="wrap" style={{ paddingTop: 14, paddingBottom: 40 }}>
      {/* breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", marginBottom: 16, flexWrap: "wrap" }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ color: "var(--green)", textDecoration: "none", fontWeight: 600 }}>Home</a>
        <Icon name="chevron-right" size={12} /> <span>Elektronik</span>
        <Icon name="chevron-right" size={12} /> <span style={{ color: "#2e3137" }}>{p.name.slice(0, 28)}…</span>
      </div>

      {/* main 3-col */}
      <div className="detail-grid">
        <div><Gallery p={p} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {p.official && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--green)" }}><Icon name="shield" size={14} /> Official Store</div>}
          <h1 style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{p.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}>
            Terjual {p.sold} <span>•</span> <StarRating value={p.rating} size={13} /> <span>(26 rating)</span>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em" }}>{fmtRp(p.price)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ background: "var(--red-tint)", color: "var(--red)", fontWeight: 800, fontSize: 12, borderRadius: 5, padding: "2px 6px" }}>{p.discount}%</span>
              <span style={{ textDecoration: "line-through", color: "var(--muted)", fontSize: 14 }}>{fmtRp(p.oldPrice)}</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}><InfoTabs p={p} /></div>

          {/* store */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginTop: 4 }}>
            <StoreAvatarTone tone="#e7eaed" />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14 }}>{p.store} {p.official && <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "grid", placeItems: "center" }}><Icon name="check" size={10} stroke={3} /></span>}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}><StarRating value={5.0} size={11} /> • 161 ribu produk</div>
            </div>
            <button style={{ background: "#fff", border: "1.5px solid var(--green)", color: "var(--green)", padding: "7px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Follow</button>
          </div>

          {/* shipping */}
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Pengiriman</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}><Icon name="pin" size={15} style={{ color: "var(--green)" }} /> Dikirim dari <strong style={{ color: "#2e3137" }}>{p.location}</strong></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}><Icon name="truck" size={15} style={{ color: "var(--green)" }} /> Estimasi tiba 2–3 hari • Bebas Ongkir</div>
          </div>
        </div>
        <div><BuyBox p={p} onAdd={onAdd} /></div>
      </div>

      {/* reviews */}
      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", color: "#3a3e45", marginBottom: 16 }}>Ulasan Pembeli</h2>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}><ReviewBreakdown /></div>

        <div style={{ display: "flex", gap: 24, marginTop: 22, alignItems: "flex-start" }}>
          {/* filter sidebar */}
          <aside style={{ width: 200, flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.03em", color: "#3a3e45", marginBottom: 4 }}>FILTER ULASAN</div>
            <FilterGroup title="Media"><Check label="Dengan Foto & Video" on={false} /></FilterGroup>
            <FilterGroup title="Rating">{[5,4,3,2,1].map((s) => <Check key={s} label={<span style={{display:"flex",alignItems:"center",gap:4}}><Icon name="star" size={12} style={{color:"#ffb700"}}/> {s}</span>} on={s === 5} />)}</FilterGroup>
            <FilterGroup title="Topik Ulasan">{["Kualitas Barang", "Pelayanan Penjual", "Pengiriman"].map((t) => <Check key={t} label={t} on={false} />)}</FilterGroup>
          </aside>

          {/* review list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Foto & Video Pembeli</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, marginBottom: 20 }}>
              {["#e7eaed","#eceae6","#e8ece9","#edeaef","#e9edf0"].map((t, k) => (
                <div key={k} style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
                  <Placeholder label="" tone={t} />
                  {k === 4 && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>+3</div>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Ulasan Pilihan <span style={{ color: "var(--muted)", fontWeight: 500 }}>· Menampilkan 10 dari 14 ulasan</span></div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                Urutkan <button className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--line)", padding: "5px 10px", borderRadius: 8 }}>Paling Membantu <Icon name="chevron-down" size={13} /></button>
              </div>
            </div>
            <div>{REVIEWS.map((r, k) => <ReviewItem key={k} r={r} />)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18 }}>
              {[1,2,3].map((n) => <button key={n} className="page-btn" style={{ background: n === 1 ? "var(--green)" : "#fff", color: n === 1 ? "#fff" : "#3a3e45", borderColor: n === 1 ? "var(--green)" : "var(--line)" }}>{n}</button>)}
              <a href="#" onClick={(e) => e.preventDefault()} style={{ marginLeft: 12, color: "var(--green)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Lihat Semua Ulasan</a>
            </div>
          </div>
        </div>
      </section>

      <RelatedRow title="Lainnya di toko ini" products={related} onOpen={onOpen} onAdd={onAdd} variant={variant} />
      <RelatedRow title="Pilihan lainnya untukmu" products={moreList} onOpen={onOpen} onAdd={onAdd} variant={variant} />
    </main>
  );
}

Object.assign(window, { DetailView });

// Footer + floating chat button + add-to-cart toast

function Footer() {
  const cols = [
    ["Tokopudidi", ["Tentang Tokopudidi", "Hak Kekayaan Intelektual", "Karir", "Blog", "Tokopudidi Affiliate", "Tokopudidi B2B Digital", "Marketing Solutions", "Promo Hari Ini", "Beli Lokal"]],
    ["Beli", ["Tagihan & Top Up", "Tokopudidi COD", "Bebas Ongkir"]],
    ["Jual", ["Pusat Edukasi Seller", "Daftar Mall"]],
    ["Bantuan dan Panduan", ["Tokopudidi Care", "Syarat dan Ketentuan", "Kebijakan Privasi"]],
  ];
  return (
    <footer style={{ background: "#fff", borderTop: "1px solid var(--line)", marginTop: 20 }}>
      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 30, display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.6fr", gap: 28 }}>
        {cols.map(([h, items]) => (
          <div key={h}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>{h}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 9 }}>
              {items.map((it) => <li key={it}><a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 12.5 }}>{it}</a></li>)}
            </ul>
          </div>
        ))}
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Nikmati keuntungan spesial di aplikasi</div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: 9 }}>
            {["Diskon 70%* hanya di aplikasi", "Promo khusus aplikasi", "Gratis Ongkir tiap hari"].map((x) => (
              <li key={x} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}><span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--green-tint)", color: "var(--green)", display: "grid", placeItems: "center" }}><Icon name="check" size={11} stroke={3} /></span>{x}</li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 72, height: 72, borderRadius: 8, border: "1px solid var(--line)", overflow: "hidden" }}><Placeholder label="QR" tone="#eef0f2" /></div>
            <div style={{ display: "grid", gap: 6 }}>
              {["Google Play", "App Store"].map((s) => (
                <div key={s} style={{ width: 116, height: 32, borderRadius: 6, background: "#1a1d21", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{s}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--line)" }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, fontSize: 12, color: "var(--muted)" }}>
          <span>© 2009 – 2026, Tokopudidi. All Rights Reserved.</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="lang-pill active">Indonesia</button>
            <button className="lang-pill">English</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ChatFab() {
  return (
    <button className="chat-fab" aria-label="Chat">
      <Icon name="chat" size={20} />
      <span style={{ fontWeight: 700, fontSize: 13 }}>Chat</span>
    </button>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div className="toast">
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "grid", placeItems: "center" }}><Icon name="check" size={13} stroke={3} /></span>
      {msg}
    </div>
  );
}

Object.assign(window, { Footer, ChatFab, Toast });

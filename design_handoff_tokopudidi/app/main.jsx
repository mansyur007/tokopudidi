// App root: routing (home/detail), cart, toast, Tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "cardStyle": "classic",
  "accent": "#1FA463",
  "radius": 12
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState({ name: "home" });
  const [cart, setCart] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [toast, setToast] = React.useState("");
  const toastTimer = React.useRef(null);

  // apply accent + radius to CSS vars
  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--green", t.accent);
    r.style.setProperty("--radius", t.radius + "px");
  }, [t.accent, t.radius]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  const openProduct = (p) => {
    // strip the feed-dedup suffix so detail uses the canonical product
    const base = PRODUCTS.find((x) => p.id.startsWith(x.id)) || p;
    setRoute({ name: "detail", product: base });
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const goHome = () => { setRoute({ name: "home" }); window.scrollTo({ top: 0 }); };

  const addToCart = (p, qty = 1) => {
    setCart((c) => c + qty);
    showToast(`Ditambahkan ke keranjang — ${p.name.slice(0, 28)}${p.name.length > 28 ? "…" : ""}`);
  };

  return (
    <div>
      <Header
        cartCount={cart}
        onLogoClick={goHome}
        onCartClick={() => showToast(cart ? `${cart} barang di keranjang` : "Keranjang masih kosong")}
        query={query}
        setQuery={setQuery}
      />

      {route.name === "home" ? (
        <HomeView variant={t.cardStyle} onOpen={openProduct} onAdd={addToCart} />
      ) : (
        <DetailView p={route.product} variant={t.cardStyle} onOpen={openProduct} onAdd={addToCart} onBack={goHome} />
      )}

      <Footer />
      <ChatFab />
      <Toast msg={toast} />

      <TweaksPanel>
        <TweakSection label="Kartu Produk" />
        <TweakRadio
          label="Gaya kartu"
          value={t.cardStyle}
          options={["classic", "minimal", "bold"]}
          onChange={(v) => setTweak("cardStyle", v)}
        />
        <TweakSection label="Brand" />
        <TweakColor
          label="Warna aksen"
          value={t.accent}
          options={["#1FA463", "#2A6FDB", "#E5484D", "#7C3AED", "#EA580C", "#0D9488"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakSlider
          label="Sudut membulat"
          value={t.radius}
          min={0}
          max={20}
          unit="px"
          onChange={(v) => setTweak("radius", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

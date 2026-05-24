import { useState, useEffect, useCallback } from "react";

// ⚠️ API KEY - letak dalam .env file sebagai REACT_APP_ANTHROPIC_API_KEY
const API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY || "";

async function callClaude(prompt, maxTokens = 1000) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-calls": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.map((c) => c.text || "").join("") || "";
  return text.replace(/```json|```/g, "").trim();
}

async function generateCaption(platform, productName, link) {
  const platformLabel = platform === "shopee" ? "Shopee" : "TikTok Shop";
  const prompt = `Kau adalah copywriter affiliate marketing Malaysia yang power. Generate 3 variasi caption pendek dalam Bahasa Malaysia yang menarik untuk promote produk ini di ${platformLabel}.

Produk: ${productName || "produk menarik"}
Link: ${link}

Format output EXACTLY macam ni (JSON sahaja, tiada teks lain):
{
  "captions": [
    "caption 1 dengan emoji dan CTA",
    "caption 2 dengan gaya lain",
    "caption 3 lebih casual/relatable"
  ]
}

Rules:
- Setiap caption max 3 baris
- Wajib ada emoji
- Ada urgency atau FOMO
- Natural, bukan nampak macam robot
- Sertakan link dalam caption
- Guna bahasa campuran Melayu/Inggeris yang natural`;

  const text = await callClaude(prompt, 1000);
  return JSON.parse(text).captions;
}

async function findWinningProducts(keyword, platform) {
  const platformLabel = platform === "both" ? "Shopee Malaysia dan TikTok Shop Malaysia" : platform === "shopee" ? "Shopee Malaysia" : "TikTok Shop Malaysia";
  const prompt = `Kau adalah pakar affiliate marketing Malaysia dengan pengalaman 10 tahun. User nak cari winning products untuk promote sebagai affiliate di ${platformLabel}.

Keyword carian: "${keyword}"

Berdasarkan trend semasa Malaysia, pengetahuan tentang produk viral, dan data affiliate marketing, suggest 5 winning products yang berpotensi tinggi.

Return HANYA JSON ini (tiada teks lain, tiada markdown):
{
  "products": [
    {
      "name": "Nama produk spesifik",
      "category": "Kategori",
      "platform": "shopee atau tiktok atau both",
      "viralScore": 85,
      "estimatedCommission": "RM 5 - RM 25 per sale",
      "commissionRate": "5-10%",
      "priceRange": "RM 30 - RM 80",
      "targetAudience": "Siapa yang beli produk ni",
      "whyWinning": "Kenapa produk ni berpotensi viral (2-3 sebab)",
      "hook": "Hook caption yang power untuk produk ni",
      "caption": "Caption penuh dengan emoji, BM+English, ada CTA dan urgency",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

Rules penting:
- viralScore mesti antara 60-99
- Produk mesti relevan dengan Malaysia (harga dalam RM, trend lokal)
- whyWinning mesti spesifik dan praktikal
- caption mesti natural, bukan robotic
- hook mesti catchy dan sesuai untuk video/post`;

  const text = await callClaude(prompt, 3000);
  return JSON.parse(text).products;
}

function detectPlatform(url) {
  if (!url) return null;
  if (url.includes("shopee.com.my") || url.includes("shp.ee") || url.includes("s.shopee")) return "shopee";
  if (url.includes("tiktok.com") || url.includes("vm.tiktok") || url.includes("vt.tiktok")) return "tiktok";
  return null;
}

function cleanAffiliateLink(url, platform) {
  try {
    const parsed = new URL(url);
    if (platform === "shopee") {
      const keep = ["af_siteid", "af_sub1", "af_sub2", "af_sub3", "smtt"];
      const newParams = new URLSearchParams();
      keep.forEach((k) => { if (parsed.searchParams.has(k)) newParams.set(k, parsed.searchParams.get(k)); });
      parsed.search = newParams.toString();
      return parsed.toString();
    }
    if (platform === "tiktok") {
      const keep = ["_d", "source", "u_code"];
      const newParams = new URLSearchParams();
      keep.forEach((k) => { if (parsed.searchParams.has(k)) newParams.set(k, parsed.searchParams.get(k)); });
      parsed.search = newParams.toString();
      return parsed.toString();
    }
    return url;
  } catch { return url; }
}

function makeTrackingUrl(cleanUrl, id) {
  return `${window.location.origin}${window.location.pathname}#track=${id}`;
}

const STORAGE_KEY = "affiliate_history_v1";
const CLICK_KEY = "affiliate_clicks_v1";
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveHistory(h) { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); }
function loadClicks() { try { return JSON.parse(localStorage.getItem(CLICK_KEY) || "{}"); } catch { return {}; } }
function saveClicks(c) { localStorage.setItem(CLICK_KEY, JSON.stringify(c)); }

const PlatformBadge = ({ platform }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:platform==="shopee"?"#ff5722":platform==="tiktok"?"#010101":"linear-gradient(135deg,#ff5722,#010101)", color:"#fff", letterSpacing:1, textTransform:"uppercase" }}>
    {platform==="shopee"?"🛒 Shopee":platform==="tiktok"?"🎵 TikTok":"🛒🎵 Both"}
  </span>
);

const ScoreBar = ({ score }) => {
  const color = score >= 85 ? "#4caf50" : score >= 70 ? "#ff9800" : "#ff5722";
  return (
    <div style={{ marginTop:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Viral Score</span>
        <span style={{ fontSize:12, fontWeight:800, color, fontFamily:"'Syne',sans-serif" }}>{score}/100</span>
      </div>
      <div style={{ height:6, borderRadius:99, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${score}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:99 }} />
      </div>
    </div>
  );
};

export default function App() {
  const [tab, setTab] = useState("convert");
  const [inputUrl, setInputUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [platform, setPlatform] = useState(null);
  const [cleanLink, setCleanLink] = useState("");
  const [trackLink, setTrackLink] = useState("");
  const [captions, setCaptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [clicks, setClicks] = useState(loadClicks);
  const [error, setError] = useState("");
  const [activeCaption, setActiveCaption] = useState(0);
  const [wpKeyword, setWpKeyword] = useState("");
  const [wpPlatform, setWpPlatform] = useState("both");
  const [wpLoading, setWpLoading] = useState(false);
  const [wpResults, setWpResults] = useState([]);
  const [wpError, setWpError] = useState("");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState(API_KEY);
  const [savedKey, setSavedKey] = useState(localStorage.getItem("aff_apikey") || API_KEY);

  const getKey = () => savedKey || localStorage.getItem("aff_apikey") || "";

  useEffect(() => {
    const detected = detectPlatform(inputUrl);
    setPlatform(detected);
    setCleanLink(""); setTrackLink(""); setCaptions([]); setError("");
  }, [inputUrl]);

  const handleConvert = useCallback(async () => {
    setError("");
    if (!getKey()) { setError("Masukkan API key dulu dalam Settings!"); return; }
    if (!inputUrl.trim()) { setError("Masukkan link dulu!"); return; }
    if (!platform) { setError("Link mesti dari Shopee atau TikTok."); return; }
    setLoading(true);
    try {
      const cleaned = cleanAffiliateLink(inputUrl, platform);
      const id = `aff_${Date.now()}`;
      const tracking = makeTrackingUrl(cleaned, id);
      setCleanLink(cleaned); setTrackLink(tracking);
      const caps = await generateCaption(platform, productName, tracking);
      setCaptions(caps);
      const entry = { id, platform, productName: productName || "Produk", originalUrl: inputUrl, cleanUrl: cleaned, trackUrl: tracking, captions: caps, createdAt: new Date().toISOString(), clicks: 0 };
      const newHistory = [entry, ...history].slice(0, 50);
      setHistory(newHistory); saveHistory(newHistory);
      const newClicks = { ...clicks, [id]: 0 };
      setClicks(newClicks); saveClicks(newClicks);
    } catch (e) { setError("Gagal generate. Semak API key atau cuba semula."); }
    setLoading(false);
  }, [inputUrl, platform, productName, history, clicks, savedKey]);

  const handleFindWinning = async () => {
    setWpError("");
    if (!getKey()) { setWpError("Masukkan API key dulu dalam Settings!"); return; }
    if (!wpKeyword.trim()) { setWpError("Masukkan keyword dulu!"); return; }
    setWpLoading(true); setWpResults([]);
    try {
      const results = await findWinningProducts(wpKeyword, wpPlatform);
      setWpResults(results);
    } catch (e) { setWpError("Gagal cari produk. Semak API key atau cuba semula."); }
    setWpLoading(false);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  };

  const simulateClick = (id) => {
    const newClicks = { ...clicks, [id]: (clicks[id] || 0) + 1 };
    setClicks(newClicks); saveClicks(newClicks);
    const newHistory = history.map(h => h.id === id ? { ...h, clicks: newClicks[id] } : h);
    setHistory(newHistory); saveHistory(newHistory);
  };

  const deleteHistory = (id) => {
    const newH = history.filter(h => h.id !== id);
    setHistory(newH); saveHistory(newH);
  };

  const totalClicks = Object.values(clicks).reduce((a, b) => a + b, 0);
  const TABS = [["convert","⚡ Convert"],["winning","🏆 Winning"],["history","📋 History"],["settings","⚙️ Settings"]];

  const hasKey = !!getKey();

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#f0f0f0", fontFamily:"'DM Sans','Segoe UI',sans-serif", backgroundImage:"radial-gradient(ellipse at 20% 20%,#1a1a2e 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,#16213e 0%,transparent 60%)", maxWidth:480, margin:"0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#ff5722;border-radius:4px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:1}}
        .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;animation:fadeUp .4s ease both}
        .btn{padding:10px 20px;border-radius:10px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:14px;transition:all .2s}
        .btn-primary{background:linear-gradient(135deg,#ff5722,#ff8a50);color:#fff}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(255,87,34,.35)}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .btn-ghost{background:rgba(255,255,255,0.06);color:#ccc;border:1px solid rgba(255,255,255,0.1)}
        .btn-ghost:hover{background:rgba(255,255,255,0.1);color:#fff}
        .btn-green{background:linear-gradient(135deg,#2e7d32,#43a047);color:#fff}
        .input{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 14px;color:#f0f0f0;font-family:inherit;font-size:14px;outline:none;transition:border .2s}
        .input:focus{border-color:#ff5722;background:rgba(255,87,34,.05)}
        .input::placeholder{color:rgba(255,255,255,0.3)}
        .tab{padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all .2s;white-space:nowrap}
        .tab.active{background:linear-gradient(135deg,#ff5722,#ff8a50);color:#fff}
        .tab.inactive{background:transparent;color:rgba(255,255,255,0.4)}
        .tab.inactive:hover{color:rgba(255,255,255,0.8)}
        .caption-box{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px;cursor:pointer;transition:all .2s}
        .caption-box:hover,.caption-box.active-caption{border-color:#ff5722;background:rgba(255,87,34,.08)}
        .link-box{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;font-size:12px;word-break:break-all;color:#aaa;display:flex;justify-content:space-between;align-items:center;gap:8px}
        .stat-pill{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;text-align:center}
        .spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
        .wp-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;animation:fadeUp .4s ease both;transition:all .2s}
        .wp-card:hover{border-color:rgba(255,87,34,0.3);background:rgba(255,87,34,0.03)}
        .tag{display:inline-block;background:rgba(255,255,255,0.08);border-radius:99px;padding:2px 8px;font-size:10px;color:rgba(255,255,255,0.5);margin:2px}
        .platform-btn{padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all .2s;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5)}
        .platform-btn.selected{background:rgba(255,87,34,0.15);border-color:#ff5722;color:#ff8a50}
        .skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
      `}</style>

      {/* Header */}
      <div style={{ padding:"24px 20px 0", textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:4 }}>🔗</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, letterSpacing:-0.5, background:"linear-gradient(135deg,#ff5722,#ff8a50,#ffcc80)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>AffiliateKit</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Convert • Caption • Winning Products • Track</p>
        {!hasKey && (
          <div style={{ marginTop:10, background:"rgba(255,87,34,0.1)", border:"1px solid rgba(255,87,34,0.3)", borderRadius:10, padding:"8px 14px" }}>
            <p style={{ fontSize:12, color:"#ff8a50" }}>⚠️ Masukkan API key dalam <strong>⚙️ Settings</strong> dulu</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:8, padding:"16px 16px 0" }}>
        {[{label:"Disimpan",value:history.length,icon:"📎"},{label:"Total Klik",value:totalClicks,icon:"👆"},{label:"Shopee",value:history.filter(h=>h.platform==="shopee").length,icon:"🛒"},{label:"TikTok",value:history.filter(h=>h.platform==="tiktok").length,icon:"🎵"}].map(s=>(
          <div key={s.label} className="stat-pill" style={{ flex:1 }}>
            <div style={{ fontSize:16 }}>{s.icon}</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{s.value}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, padding:"14px 16px 0", overflowX:"auto" }}>
        {TABS.map(([key,label])=>(
          <button key={key} className={`tab ${tab===key?"active":"inactive"}`} onClick={()=>setTab(key)}>{label}</button>
        ))}
      </div>

      <div style={{ padding:"16px 16px 40px" }}>

        {/* CONVERT */}
        {tab==="convert" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card">
              <label style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:8 }}>Nama Produk (optional)</label>
              <input className="input" placeholder="Cth: Baju Kurung Moden Viral..." value={productName} onChange={e=>setProductName(e.target.value)} />
            </div>
            <div className="card">
              <label style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:8 }}>Affiliate Link 🔗</label>
              <textarea className="input" placeholder={"Paste link Shopee atau TikTok affiliate...\n\nCth: https://shopee.com.my/..."} value={inputUrl} onChange={e=>setInputUrl(e.target.value)} rows={4} style={{ resize:"vertical" }} />
              {platform && (
                <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Detected:</span>
                  <PlatformBadge platform={platform} />
                  <span style={{ fontSize:11, color:"#4caf50", marginLeft:4 }}>✓ Valid</span>
                </div>
              )}
              {error && <p style={{ color:"#ff5252", fontSize:13, marginTop:8 }}>⚠️ {error}</p>}
            </div>
            <button className="btn btn-primary" disabled={loading||!inputUrl} onClick={handleConvert} style={{ width:"100%", padding:14, fontSize:15 }}>
              {loading?<><span className="spinner" style={{ marginRight:8 }} />Generating...</>:"⚡ Convert & Jana Caption"}
            </button>
            {cleanLink && (
              <>
                <div className="card">
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>🔗 Clean Link</p>
                  <div className="link-box">
                    <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cleanLink}</span>
                    <button className="btn btn-ghost" style={{ padding:"5px 12px", fontSize:12, flexShrink:0 }} onClick={()=>copyToClipboard(cleanLink,"clean")}>{copied==="clean"?"✅ Copied!":"Copy"}</button>
                  </div>
                </div>
                <div className="card">
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>📊 Tracking Link</p>
                  <div className="link-box">
                    <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#ff8a50" }}>{trackLink}</span>
                    <button className="btn btn-ghost" style={{ padding:"5px 12px", fontSize:12, flexShrink:0 }} onClick={()=>copyToClipboard(trackLink,"track")}>{copied==="track"?"✅ Copied!":"Copy"}</button>
                  </div>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:8 }}>💡 Share link ni untuk track klik</p>
                </div>
                {captions.length>0 && (
                  <div className="card">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:1, textTransform:"uppercase" }}>✍️ Caption AI</p>
                      <button className="btn btn-ghost" style={{ padding:"4px 10px", fontSize:11 }} onClick={()=>copyToClipboard(captions[activeCaption],"caption")}>{copied==="caption"?"✅ Copied!":"Copy"}</button>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {captions.map((cap,i)=>(
                        <div key={i} className={`caption-box ${activeCaption===i?"active-caption":""}`} onClick={()=>setActiveCaption(i)}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                            <span style={{ fontSize:10, fontWeight:700, color:activeCaption===i?"#ff8a50":"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:1 }}>Versi {i+1}</span>
                            {activeCaption===i&&<span style={{ fontSize:10, color:"#4caf50" }}>● Selected</span>}
                          </div>
                          <p style={{ fontSize:13, lineHeight:1.6, color:"#e0e0e0", whiteSpace:"pre-wrap" }}>{cap}</p>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-primary" style={{ width:"100%", marginTop:12 }} onClick={()=>copyToClipboard(captions[activeCaption],"caption")}>{copied==="caption"?"✅ Caption Copied!":"📋 Copy Caption Pilihan"}</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* WINNING */}
        {tab==="winning" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card">
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:22 }}>🏆</span>
                <div>
                  <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>Winning Product Finder</h2>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>AI suggest produk trending berpotensi viral</p>
                </div>
              </div>
            </div>
            <div className="card">
              <label style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:10 }}>Platform</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[["both","🛒🎵 Both"],["shopee","🛒 Shopee"],["tiktok","🎵 TikTok"]].map(([val,label])=>(
                  <button key={val} className={`platform-btn ${wpPlatform===val?"selected":""}`} onClick={()=>setWpPlatform(val)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="card">
              <label style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:8 }}>Keyword / Niche 🔍</label>
              <input className="input" placeholder="Cth: skincare, tudung, supplement, dapur..." value={wpKeyword} onChange={e=>setWpKeyword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleFindWinning()} />
              {wpError&&<p style={{ color:"#ff5252", fontSize:13, marginTop:8 }}>⚠️ {wpError}</p>}
            </div>
            <button className="btn btn-primary" disabled={wpLoading||!wpKeyword} onClick={handleFindWinning} style={{ width:"100%", padding:14, fontSize:15 }}>
              {wpLoading?<><span className="spinner" style={{ marginRight:8 }} />AI sedang analisa...</>:"🏆 Cari Winning Products"}
            </button>
            {wpLoading&&[1,2,3].map(i=>(
              <div key={i} className="wp-card">
                <div className="skeleton" style={{ height:16, width:"60%", marginBottom:10 }} />
                <div className="skeleton" style={{ height:12, width:"40%", marginBottom:8 }} />
                <div className="skeleton" style={{ height:40, width:"100%", marginBottom:8 }} />
                <div className="skeleton" style={{ height:8, width:"100%", borderRadius:99 }} />
              </div>
            ))}
            {wpResults.length>0&&!wpLoading&&(
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", textAlign:"center" }}>✅ {wpResults.length} produk untuk "<strong style={{ color:"#ff8a50" }}>{wpKeyword}</strong>"</p>
                {wpResults.map((p,i)=>{
                  const isExp=expandedProduct===i;
                  const scoreColor=p.viralScore>=85?"#4caf50":p.viralScore>=70?"#ff9800":"#ff5722";
                  return (
                    <div key={i} className="wp-card" style={{ cursor:"pointer" }} onClick={()=>setExpandedProduct(isExp?null:i)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, lineHeight:1.3, marginBottom:6 }}>{p.name}</p>
                          <PlatformBadge platform={p.platform} />
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:scoreColor, lineHeight:1 }}>{p.viralScore}</div>
                          <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:1 }}>Viral Score</div>
                        </div>
                      </div>
                      <ScoreBar score={p.viralScore} />
                      <div style={{ display:"flex", gap:8, marginTop:12 }}>
                        <div style={{ flex:1, background:"rgba(76,175,80,0.1)", border:"1px solid rgba(76,175,80,0.2)", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                          <div style={{ fontSize:11, color:"#4caf50", fontWeight:700 }}>💰 Komisen</div>
                          <div style={{ fontSize:12, fontWeight:700, marginTop:2 }}>{p.estimatedCommission}</div>
                          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{p.commissionRate}</div>
                        </div>
                        <div style={{ flex:1, background:"rgba(255,152,0,0.1)", border:"1px solid rgba(255,152,0,0.2)", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                          <div style={{ fontSize:11, color:"#ff9800", fontWeight:700 }}>🏷️ Harga</div>
                          <div style={{ fontSize:12, fontWeight:700, marginTop:2 }}>{p.priceRange}</div>
                        </div>
                      </div>
                      <div style={{ marginTop:10, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                        <p style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>🎯 Target</p>
                        <p style={{ fontSize:13, color:"#e0e0e0" }}>{p.targetAudience}</p>
                      </div>
                      <div style={{ marginTop:8, background:"rgba(255,87,34,0.06)", border:"1px solid rgba(255,87,34,0.15)", borderRadius:10, padding:"10px 12px" }}>
                        <p style={{ fontSize:10, color:"rgba(255,87,34,0.7)", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>🔥 Hook</p>
                        <p style={{ fontSize:13, color:"#ff8a50", fontStyle:"italic", fontWeight:600 }}>"{p.hook}"</p>
                      </div>
                      <div style={{ marginTop:10, textAlign:"center" }}>
                        <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>{isExp?"▲ Sembunyikan":"▼ Tengok Caption & Details"}</span>
                      </div>
                      {isExp&&(
                        <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:10 }} onClick={e=>e.stopPropagation()}>
                          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:12 }}>
                            <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>✅ Kenapa Winning?</p>
                            <p style={{ fontSize:13, color:"#ccc", lineHeight:1.6 }}>{p.whyWinning}</p>
                          </div>
                          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:12 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                              <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:1 }}>✍️ Caption</p>
                              <button className="btn btn-ghost" style={{ padding:"3px 10px", fontSize:11 }} onClick={()=>copyToClipboard(p.caption,`wpcap_${i}`)}>{copied===`wpcap_${i}`?"✅ Copied!":"Copy"}</button>
                            </div>
                            <p style={{ fontSize:13, color:"#e0e0e0", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{p.caption}</p>
                          </div>
                          {p.tags&&p.tags.length>0&&(
                            <div>
                              <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>#️⃣ Hashtags</p>
                              <div style={{ display:"flex", flexWrap:"wrap" }}>{p.tags.map((t,j)=><span key={j} className="tag">#{t}</span>)}</div>
                              <button className="btn btn-ghost" style={{ width:"100%", marginTop:8, fontSize:12, padding:"7px 10px" }} onClick={()=>copyToClipboard(p.tags.map(t=>`#${t}`).join(" "),`wptag_${i}`)}>{copied===`wptag_${i}`?"✅ Copied!":"Copy Hashtags"}</button>
                            </div>
                          )}
                          <button className="btn btn-green" style={{ width:"100%", padding:10, fontSize:13 }} onClick={()=>{ setTab("convert"); setProductName(p.name); }}>➡️ Guna Produk Ni — Pergi Convert</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab==="history" && (
          <div>
            {history.length===0?(
              <div style={{ textAlign:"center", padding:"60px 20px", color:"rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                <p style={{ fontSize:14 }}>Belum ada link yang disimpan.</p>
              </div>
            ):(
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {history.map((item,idx)=>(
                  <div key={item.id} className="card" style={{ animationDelay:`${idx*0.04}s` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div>
                        <PlatformBadge platform={item.platform} />
                        <p style={{ fontWeight:700, fontSize:14, marginTop:6 }}>{item.productName}</p>
                        <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{new Date(item.createdAt).toLocaleDateString("ms-MY",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
                      </div>
                      <button onClick={()=>deleteHistory(item.id)} style={{ background:"none", border:"none", color:"rgba(255,80,80,0.6)", cursor:"pointer", fontSize:18, padding:4 }}>🗑</button>
                    </div>
                    <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                      <div style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"8px 12px", textAlign:"center" }}>
                        <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:"#ff8a50" }}>{clicks[item.id]||0}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>Klik</div>
                      </div>
                      <div style={{ flex:2, display:"flex", flexDirection:"column", gap:4 }}>
                        <button className="btn btn-ghost" style={{ fontSize:12, padding:"6px 10px" }} onClick={()=>copyToClipboard(item.trackUrl,`track_${item.id}`)}>{copied===`track_${item.id}`?"✅ Copied!":"📋 Copy Link"}</button>
                        <button className="btn btn-ghost" style={{ fontSize:12, padding:"6px 10px" }} onClick={()=>copyToClipboard(item.captions?.[0]||"",`cap_${item.id}`)}>{copied===`cap_${item.id}`?"✅ Copied!":"✍️ Copy Caption"}</button>
                      </div>
                    </div>
                    <button className="btn btn-primary" style={{ width:"100%", fontSize:12, padding:8 }} onClick={()=>simulateClick(item.id)}>+ Tambah Klik Manual</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab==="settings" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card">
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, marginBottom:4 }}>⚙️ Settings</h2>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Configure API key untuk guna AI features</p>
            </div>
            <div className="card">
              <label style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:8 }}>🔑 Anthropic API Key</label>
              <input className="input" type="password" placeholder="sk-ant-xxxxxxxxxxxxxxxx" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} />
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:8, lineHeight:1.5 }}>
                Dapatkan API key dari <strong style={{ color:"#ff8a50" }}>console.anthropic.com</strong> → API Keys
              </p>
              <button className="btn btn-primary" style={{ width:"100%", marginTop:12 }} onClick={()=>{ localStorage.setItem("aff_apikey", apiKeyInput); setSavedKey(apiKeyInput); }}>
                💾 Simpan API Key
              </button>
              {savedKey && <p style={{ fontSize:12, color:"#4caf50", marginTop:8, textAlign:"center" }}>✅ API Key aktif</p>}
            </div>
            <div className="card" style={{ background:"rgba(255,87,34,0.06)", borderColor:"rgba(255,87,34,0.2)" }}>
              <p style={{ fontSize:13, color:"#ff8a50", fontWeight:700, marginBottom:6 }}>⚠️ Nota Keselamatan</p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>API key disimpan dalam browser awak sahaja (localStorage). Jangan kongsi API key dengan sesiapa. Pastikan awak set usage limit dalam Anthropic Console.</p>
            </div>
            <div className="card">
              <p style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>📊 Data & Storage</p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:12 }}>History & data disimpan dalam browser. Clear kalau nak reset semua.</p>
              <button className="btn btn-ghost" style={{ width:"100%", fontSize:13 }} onClick={()=>{ if(window.confirm("Reset semua history & data?")){ localStorage.clear(); setHistory([]); setClicks({}); setSavedKey(""); setApiKeyInput(""); }}}>🗑 Reset Semua Data</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

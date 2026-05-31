// ── FIREBASE CONFIG ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBUNByX2p3Lu3ifo9WYSsoTkJBz-8dPRw",
  authDomain: "laporan-keuangan-50c98.firebaseapp.com",
  projectId: "laporan-keuangan-50c98",
  storageBucket: "laporan-keuangan-50c98.firebasestorage.app",
  messagingSenderId: "431349726568",
  appId: "1:431349726568:web:f44c9243f117fa84e56add",
  measurementId: "G-3T3SRMSQPK"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── KONSTANTA ──
const KAT_LABEL = {
  kontribusi: 'Kontribusi',
  sponsor:    'Sponsor',
  donasi:     'Donasi',
  usaha:      'Usaha/Bazaar',
  tiket:      'Tiket Acara',
  lainnya:    'Lainnya'
};

const BAR_CLS = ['c1', 'c2', 'c3', 'c4', 'c5'];

let data = [];
let riwayat = [];

// ── REALTIME LISTENER TRANSAKSI ──
const q = query(collection(db, 'transaksi'), orderBy('tgl', 'asc'));
onSnapshot(q, (snapshot) => {
  data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

// ── REALTIME LISTENER RIWAYAT HAPUS ──
const qr = query(collection(db, 'riwayat_hapus'), orderBy('deletedAt', 'desc'));
onSnapshot(qr, (snapshot) => {
  riwayat = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderRiwayat();
});

// ── FORMAT HELPER ──
function fmt(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function fmtD(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return d + '/' + m + '/' + y.slice(2);
}

function fmtTS(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ── TAMBAH DATA ──
async function tambah() {
  const tgl  = document.getElementById('f-tgl').value;
  const nama = document.getElementById('f-nama').value.trim();
  const ket  = document.getElementById('f-ket').value.trim();
  const kat  = document.getElementById('f-kat').value;
  const jml  = parseFloat(document.getElementById('f-jml').value);

  if (!tgl || !nama || !jml || jml <= 0) {
    alert('Lengkapi: Tanggal, Nama, dan Jumlah.');
    return;
  }

  await addDoc(collection(db, 'transaksi'), { tgl, nama, ket, kat, jml, createdAt: serverTimestamp() });

  document.getElementById('f-nama').value = '';
  document.getElementById('f-ket').value  = '';
  document.getElementById('f-jml').value  = '';
}

// ── HAPUS DATA ──
async function hapus(id) {
  if (!confirm('Hapus entri ini?')) return;
  
  // Cari data sebelum dihapus
  const item = data.find(d => d.id === id);
  if (item) {
    // Simpan ke riwayat_hapus
    await addDoc(collection(db, 'riwayat_hapus'), {
      ...item,
      originalId: id,
      deletedAt: serverTimestamp()
    });
  }
  
  await deleteDoc(doc(db, 'transaksi', id));
}

// ── RENDER SEMUA ──
function render() {
  renderSummary();
  renderChart();
  renderTable();
}

// ── RENDER RINGKASAN ──
function renderSummary() {
  const total   = data.reduce((s, d) => s + d.jml, 0);
  const n       = data.length;
  const avg     = n ? total / n : 0;
  const maxItem = data.reduce((a, b) => b.jml > a.jml ? b : a, { jml: 0, nama: '—' });

  const katT = {};
  data.forEach(r => { katT[r.kat] = (katT[r.kat] || 0) + r.jml; });
  const topKat = Object.entries(katT).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('hero-total').textContent   = fmt(total);
  document.getElementById('hero-sub').textContent     = n + ' transaksi tercatat';
  document.getElementById('s-count').textContent      = n;
  document.getElementById('s-avg').textContent        = fmt(avg);
  document.getElementById('s-max').textContent        = fmt(maxItem.jml);
  document.getElementById('s-max-name').textContent   = maxItem.nama;
  document.getElementById('s-topkat').textContent     = topKat ? KAT_LABEL[topKat[0]] : '—';
  document.getElementById('s-topkat-val').textContent = topKat ? fmt(topKat[1]) : '—';
  document.getElementById('tbl-tot').textContent      = fmt(total);
}

// ── RENDER GRAFIK ──
function renderChart() {
  const ca   = document.getElementById('chart-area');
  const katT = {};
  data.forEach(r => { katT[r.kat] = (katT[r.kat] || 0) + r.jml; });

  if (!Object.keys(katT).length) {
    ca.innerHTML = '<div class="empty">Belum ada data</div>';
    return;
  }

  const entries = Object.entries(katT).sort((a, b) => b[1] - a[1]);
  const max     = entries[0][1];

  ca.innerHTML = entries.map(([k, v], i) => `
    <div class="bar-item">
      <div class="bar-meta">
        <span class="bm-name">${KAT_LABEL[k] || k}</span>
        <span class="bm-val">${fmt(v)}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill ${BAR_CLS[i % BAR_CLS.length]}" style="width:${Math.round(v / max * 100)}%"></div>
      </div>
    </div>
  `).join('');
}

// ── RENDER TABEL ──
function renderTable() {
  const tb     = document.getElementById('tbl-body');
  const sorted = [...data].sort((a, b) => a.tgl > b.tgl ? 1 : -1);

  if (!sorted.length) {
    tb.innerHTML = '<div class="empty">Belum ada data</div>';
    return;
  }

  tb.innerHTML = sorted.map((r, i) => `
    <div class="tbl-row">
      <div class="tbl-no">${i + 1}</div>
      <div class="tbl-info">
        <div class="ti-name">${r.nama}</div>
        <div class="ti-sub">${fmtD(r.tgl)}${r.ket ? ' · ' + r.ket : ''}</div>
        <span class="badge ${r.kat}">${KAT_LABEL[r.kat] || r.kat}</span>
      </div>
      <div class="tbl-amt">${fmt(r.jml)}</div>
      <button class="tbl-del" onclick="hapus('${r.id}')" aria-label="Hapus">✕</button>
    </div>
  `).join('');
}

// ── RENDER RIWAYAT HAPUS ──
function renderRiwayat() {
  const tb = document.getElementById('riwayat-body');
  if (!tb) return;

  if (!riwayat.length) {
    tb.innerHTML = '<div class="empty">Belum ada data yang dihapus</div>';
    return;
  }

  tb.innerHTML = riwayat.map((r, i) => `
    <div class="tbl-row" style="opacity:0.7">
      <div class="tbl-no">${i + 1}</div>
      <div class="tbl-info">
        <div class="ti-name" style="text-decoration:line-through">${r.nama}</div>
        <div class="ti-sub">${fmtD(r.tgl)}${r.ket ? ' · ' + r.ket : ''}</div>
        <span class="badge ${r.kat}">${KAT_LABEL[r.kat] || r.kat}</span>
        <div class="ti-sub" style="color:#e55;margin-top:2px">🗑 Dihapus: ${fmtTS(r.deletedAt)}</div>
      </div>
      <div class="tbl-amt" style="text-decoration:line-through">${fmt(r.jml)}</div>
      <div></div>
    </div>
  `).join('');
}

// ── EXPORT PDF ──
function expPDF() {
  const expRow   = document.querySelector('.export-row');
  const formCard = document.querySelector('.form-card');
  const secLabels = document.querySelectorAll('.sec-label');

  expRow.style.display   = 'none';
  formCard.style.display = 'none';
  secLabels.forEach(s => { s.style.display = 'none'; });

  html2pdf().from(document.body).set({
    margin:      [8, 6, 8, 6],
    filename:    'LaporanKeuangan_17Agustus2026.pdf',
    image:       { type: 'jpeg', quality: 0.97 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0, backgroundColor: '#0D0C0A' },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save().then(() => {
    expRow.style.display   = '';
    formCard.style.display = '';
    secLabels.forEach(s => { s.style.display = ''; });
  });
}

// ── EXPORT CSV ──
function expCSV() {
  const rows   = [['No', 'Tanggal', 'Nama/Sumber', 'Keterangan', 'Kategori', 'Jumlah']];
  const sorted = [...data].sort((a, b) => a.tgl > b.tgl ? 1 : -1);

  sorted.forEach((r, i) => {
    rows.push([
      i + 1,
      r.tgl,
      '"' + r.nama.replace(/"/g, '""') + '"',
      '"' + (r.ket || '').replace(/"/g, '""') + '"',
      KAT_LABEL[r.kat] || r.kat,
      r.jml
    ]);
  });

  const total = data.reduce((s, d) => s + d.jml, 0);
  rows.push(['', '', '', '', 'TOTAL', total]);

  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'LaporanKeuangan_17Agustus2026.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── EXPOSE FUNCTIONS ──
window.tambah = tambah;
window.hapus  = hapus;
window.expPDF = expPDF;
window.expCSV = expCSV;

// ── INIT ──
document.getElementById('f-tgl').value = new Date().toISOString().split('T')[0];
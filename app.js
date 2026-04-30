// --- KONFIGURASI SUPABASE ---
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- FUNGSI CEK LOKAL ---
// Cukup cek localhost, otomatis panel admin menyala di setiap halaman
function isLocalhost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
}

// --- KEAMANAN DASAR ---
if (!isLocalhost()) {
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.onkeydown = function(e) {
        if (e.keyCode == 123) return false; // F12
        if (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0))) return false;
        if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false; // Ctrl+U
    }
}

// --- SISTEM NAVIGASI ---
function bukaHalaman(idHalaman) {
    // Sembunyikan semua halaman
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    // Tampilkan halaman yang dituju
    const targetHalaman = document.getElementById(idHalaman);
    if(targetHalaman) targetHalaman.classList.add('active');

    // Reset tombol menu secara aman (mencegah crash jika ID tidak ditemukan)
    const tombolMenu = ['btn-schedule', 'btn-member', 'btn-song', 'btn-team', 'btn-stage'];
    tombolMenu.forEach(idBtn => {
        const btn = document.getElementById(idBtn);
        if (btn) btn.classList.remove('active');
    });
    
    // Set tombol aktif sesuai halaman
    if(idHalaman.includes('schedule')) {
        const btn = document.getElementById('btn-schedule'); if(btn) btn.classList.add('active');
    }
    else if(idHalaman.includes('member')) {
        const btn = document.getElementById('btn-member'); if(btn) btn.classList.add('active');
    }
    else if(idHalaman.includes('album') || idHalaman.includes('song') || idHalaman.includes('discography')) {
        const btn = document.getElementById('btn-song'); if(btn) btn.classList.add('active');
    }
    else if(idHalaman.includes('team')) {
        const btn = document.getElementById('btn-team'); if(btn) btn.classList.add('active');
    }
    else if(idHalaman.includes('stage')) {
        const btn = document.getElementById('btn-stage'); if(btn) btn.classList.add('active');
    }
    
    window.scrollTo(0, 0); 
    
    // Panggil fungsi muat data berdasarkan menu
    if(idHalaman === 'view-teams') { if(typeof muatDaftarTeam === 'function') muatDaftarTeam(); }
    if(idHalaman === 'view-stages') { if(typeof muatDaftarStage === 'function') muatDaftarStage(); }
    if(idHalaman === 'view-albums') { if(typeof muatDaftarAlbum === 'function') muatDaftarAlbum(); }
}

// --- FUNGSI TANGGAL & HELPER ---
function isBirthdayToday(tanggalLahir) {
    if (!tanggalLahir) return false;
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    const parts = tanggalLahir.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        return parseInt(parts[1]) === currentMonth && parseInt(parts[2]) === currentDay;
    }
    
    const str = tanggalLahir.toLowerCase();
    const bulanIndo = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    for (let i = 0; i < bulanIndo.length; i++) {
        if (str.includes(bulanIndo[i])) {
            const dayMatch = str.match(/\d+/);
            if (dayMatch) {
                const day = parseInt(dayMatch[0]);
                return day === currentDay && (i + 1) === currentMonth;
            }
        }
    }
    
    const d = new Date(tanggalLahir);
    if (!isNaN(d.getTime())) return d.getDate() === currentDay && (d.getMonth() + 1) === currentMonth;
    return false;
}

function formatTanggalIndo(tanggalString) {
    if (!tanggalString) return '<span style="color:#aaa; font-style:italic;">Tanggal tidak diketahui</span>';
    const parts = tanggalString.split('-'); 
    if(parts.length !== 3) return tanggalString;
    const bulanIndo = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(parts[2], 10)} ${bulanIndo[parseInt(parts[1], 10)]} ${parts[0]}`;
}

function getFormatStatusMember(status) {
    if (!status) return { kelas: 'status-anggota', teks: 'Anggota' }; 
    const s = status.toLowerCase();
    if (s.includes('trainee')) return { kelas: 'status-trainee', teks: 'Trainee' };
    if (s.includes('captain') || s.includes('kapten')) return { kelas: 'status-captain', teks: '&#127894;&#65039; Captain' };
    if (s.includes('dismissed') || s.includes('dikeluarkan')) return { kelas: 'status-dismissed', teks: 'Dismissed' };
    if (s.includes('resign') || s.includes('mengundurkan diri')) return { kelas: 'status-resigned', teks: 'Resigned' };
    if (s.includes('suspended')) return { kelas: 'status-suspended', teks: '&#128683; Suspended' };
    if (s.includes('hiatus')) return { kelas: 'status-hiatus', teks: '&#9208;&#65039; Hiatus' };
    if (s.includes('announced')) return { kelas: 'status-announced', teks: '&#128226; Announced Grad' };
    if (s.includes('graduated') || s.includes('graduation') || s.includes('lulus')) return { kelas: 'status-graduated', teks: 'Graduated' };
    return { kelas: 'status-anggota', teks: 'Anggota' }; 
}

function getTeamColor(teamName) {
    if (!teamName) return ''; 
    const t = teamName.toLowerCase();
    if (t.includes('love')) return 'rgb(226, 7, 133)'; 
    if (t.includes('dream')) return 'rgb(0, 164, 165)';
    if (t.includes('passion')) return 'rgb(246, 146, 32)'; 
    if (t.includes('virtual')) return 'rgb(3, 70, 192)'; 
    if (t.includes('trainee')) return 'rgb(196, 120, 120)'; 
    if (t.includes('team j') && !t.includes('jkt48')) return '#ed1c24';
    if (t.includes('team kiii')) return '#ffe900';
    if (t.includes('team t')) return '#f88ccf';
    if (t === 'jkt48') return '#D61515'; 
    return ''; 
}

function formatNamaDuaBaris(nama) {
    if (!nama) return '';
    const namaTrim = nama.trim();
    if (namaTrim.toLowerCase() === 'gita sekar andarini') return 'Gita Sekar<br>Andarini';
    const words = namaTrim.split(' ');
    if (words.length === 1) return namaTrim; 
    const barisSatu = words.shift();
    const barisDua = words.join(' ');
    return `${barisSatu}<br>${barisDua}`;
}

function getFolderStatus(member) {
    if (!member) return 'anggota';
    const t = (member.team || '').toLowerCase();
    if (t.includes('virtual')) return 'virtual';

    const s = (member.status || '').toLowerCase();
    if (s.includes('graduated') || s.includes('graduation') || s.includes('lulus') || s.includes('resign') || s.includes('mengundurkan diri') || s.includes('dismissed') || s.includes('dikeluarkan')) return 'graduated';
    if (s.includes('trainee')) return 'trainee';
    
    return 'anggota'; 
}

function getFotoMemberLokal(member) {
    if (!member || !member.nama) return 'favicon.png';
    const namaFormat = member.nama.toLowerCase().trim().replace(/\s+/g, '_');
    const folder = getFolderStatus(member); 
    return `images/members/${folder}/${namaFormat}.jpg`;
}

function generateMemberImageHtml(member, customJudul = null, customTipe = null, customNomor = null, inlineStyle = '', className = '') {
    if (!member || !member.nama) return `<img src="favicon.png" style="${inlineStyle}; background-color:#d81b60;" class="${className}">`;
    
    const namaFormat = member.nama.toLowerCase().trim().replace(/\s+/g, '_');
    const folder = getFolderStatus(member);

    let fotoSrc = '';
    let isCustom = false;

    if (customJudul) {
        const judul = customJudul.toLowerCase().trim();
        if (customTipe === 'Single' && customNomor) {
            fotoSrc = `images/single/${customNomor}/${namaFormat}.png`;
            isCustom = true;
        } else if (judul.includes('pertaruhan cinta')) {
            fotoSrc = `images/setlist/pertaruhan_cinta/${namaFormat}.jpg`;
            isCustom = true;
        }
    }

    if (!isCustom) {
        fotoSrc = `images/members/${folder}/${namaFormat}.jpg`;
    }

    return `<img src="${fotoSrc}" data-nama="${namaFormat}" data-folder="${folder}" data-custom="${isCustom}" onerror="window.fallbackFoto(this)" alt="${member.nama}" class="${className}" style="${inlineStyle}">`;
}

window.fallbackFoto = function(imgElem) {
    let isCustom = imgElem.getAttribute('data-custom') === 'true';
    let folder = imgElem.getAttribute('data-folder');
    let nama = imgElem.getAttribute('data-nama');

    if (isCustom) {
        imgElem.setAttribute('data-custom', 'false'); 
        imgElem.src = `images/members/${folder}/${nama}.jpg`; 
        return; 
    }

    imgElem.onerror = null; 
    imgElem.src = 'favicon.png';
    imgElem.style.backgroundColor = '#d81b60';
};

async function hitungPengunjung() {
    try {
        if (window.location.hostname === 'jkt48portal.netlify.app' && typeof supabaseClient !== 'undefined') {
            await supabaseClient.rpc('increment_page_view');
        }
    } catch (err) {}
}

// --- INISIALISASI SAAT HALAMAN DIMUAT ---
window.addEventListener('DOMContentLoaded', () => {
    const sekarang = new Date();
    document.getElementById('filter-tahun').value = sekarang.getFullYear();
    document.getElementById('filter-bulan').value = sekarang.getMonth() + 1;
    document.getElementById('tahun-copyright').innerText = sekarang.getFullYear();

    hitungPengunjung(); 
    if(typeof terapkanFilterJadwal === 'function') terapkanFilterJadwal();
    if(typeof muatDaftarMember === 'function') muatDaftarMember();
    if(typeof muatDaftarAlbum === 'function') muatDaftarAlbum();
});
let dataJadwalBulanIni = [];
let filterJadwalAktif = 'Semua';
let currentScheduleData = {};
let isDropdownTahunSiap = false; 

// Menyimpan cache warna agar tidak perlu bolak-balik query ke database
window.mapWarnaTimCache = window.mapWarnaTimCache || null;

// =================================================================================
// PERBAIKAN: Tombol admin HANYA akan aktif jika di localhost DAN sudah berhasil login
// Karena fungsi ini bersifat global, file stage.js & discography.js akan otomatis aman!
// =================================================================================
function isLocalhost() {
    const isLocalEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    return isLocalEnv && isLoggedIn;
}

// --- FUNGSI MENGAMBIL RENTANG TAHUN OTOMATIS DARI DATABASE ---
async function siapkanDropdownTahun() {
    if (isDropdownTahunSiap) return;
    const selectTahun = document.getElementById('filter-tahun');
    if (!selectTahun) return;

    try {
        const { data: minData } = await supabaseClient
            .from('theater_schedules')
            .select('tanggal_waktu')
            .order('tanggal_waktu', { ascending: true })
            .limit(1);

        const { data: maxData } = await supabaseClient
            .from('theater_schedules')
            .select('tanggal_waktu')
            .order('tanggal_waktu', { ascending: false })
            .limit(1);

        let tahunMulai = new Date().getFullYear();
        let tahunAkhir = new Date().getFullYear();

        if (minData && minData.length > 0) {
            tahunMulai = new Date(minData[0].tanggal_waktu).getFullYear();
        }
        if (maxData && maxData.length > 0) {
            const maxTahun = new Date(maxData[0].tanggal_waktu).getFullYear();
            if (maxTahun > tahunAkhir) tahunAkhir = maxTahun;
        }

        const valSkrg = selectTahun.value || new Date().getFullYear();
        selectTahun.innerHTML = '';
        
        for (let y = tahunMulai; y <= tahunAkhir; y++) {
            const opt = document.createElement('option');
            opt.value = y; opt.innerText = y; selectTahun.appendChild(opt);
        }

        if (Array.from(selectTahun.options).some(o => o.value == valSkrg)) {
            selectTahun.value = valSkrg;
        } else {
            selectTahun.value = new Date().getFullYear();
        }
        
        isDropdownTahunSiap = true;
    } catch (e) {
        console.error('Gagal memuat rentang tahun dari database:', e);
    }
}

async function ubahBulan(offset) {
    if(!isDropdownTahunSiap) await siapkanDropdownTahun();

    let selectBulan = document.getElementById('filter-bulan');
    let selectTahun = document.getElementById('filter-tahun');
    let bln = parseInt(selectBulan.value);
    let thn = parseInt(selectTahun.value);

    bln += offset;
    if (bln > 12) { bln = 1; thn++; } 
    else if (bln < 1) { bln = 12; thn--; }

    selectBulan.value = bln;
    
    let yearExists = Array.from(selectTahun.options).some(opt => parseInt(opt.value) === thn);
    if (!yearExists) {
        let opt = document.createElement('option');
        opt.value = thn; opt.text = thn; selectTahun.add(opt);
    }
    
    selectTahun.value = thn;
    terapkanFilterJadwal();
}

async function terapkanFilterJadwal() {
    if(!isDropdownTahunSiap) await siapkanDropdownTahun();
    const thn = document.getElementById('filter-tahun').value;
    const bln = document.getElementById('filter-bulan').value;
    muatJadwalBerdasarkanBulan(thn, bln);
}

function filterTipeJadwal(tipe) {
    filterJadwalAktif = tipe;
    document.getElementById('btn-filter-semua').style.opacity = tipe === 'Semua' ? '1' : '0.5';
    document.getElementById('btn-filter-theater').style.opacity = tipe === 'Theater' ? '1' : '0.5';
    document.getElementById('btn-filter-event').style.opacity = tipe === 'Event' ? '1' : '0.5';
    renderJadwalKeLayar();
}

async function muatJadwalBerdasarkanBulan(tahun, bulan) {
    const container = document.getElementById('list-jadwal');
    const loading = document.getElementById('loading-schedule');
    const adminToggle = document.getElementById('admin-schedule-toggle');
    
    container.innerHTML = ''; loading.style.display = 'block';
    document.getElementById('nav-bulan').style.display = 'none';

    // Toggle Jadwal Baru Admin
    if (adminToggle) {
        if (isLocalhost()) adminToggle.style.display = 'block';
        else adminToggle.style.display = 'none';
    }
    
    const awalBulan = new Date(tahun, bulan - 1, 1).toISOString();
    const akhirBulan = new Date(tahun, bulan, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabaseClient
        .from('theater_schedules')
        .select('*, performing_members(is_birthday, is_graduation)')
        .gte('tanggal_waktu', awalBulan)
        .lte('tanggal_waktu', akhirBulan)
        .order('tanggal_waktu', { ascending: true });

    // PERBAIKAN: Ambil cache warna tim dari database
    if (!window.mapWarnaTimCache) {
        const { data: dataTeams } = await supabaseClient.from('teams').select('nama, warna');
        window.mapWarnaTimCache = {};
        if (dataTeams) {
            dataTeams.forEach(t => {
                if (t.nama && t.warna) window.mapWarnaTimCache[t.nama.toLowerCase()] = t.warna;
            });
        }
    }

    loading.style.display = 'none';
    if (error) return container.innerHTML = `<p style="color:red;">Gagal memuat jadwal: ${error.message}</p>`;
    
    dataJadwalBulanIni = data;
    renderJadwalKeLayar();
}

function renderJadwalKeLayar() {
    const container = document.getElementById('list-jadwal');
    container.innerHTML = '';

    let dataTampil = dataJadwalBulanIni;
    if (filterJadwalAktif === 'Theater') dataTampil = dataJadwalBulanIni.filter(j => !j.tipe_jadwal || j.tipe_jadwal === 'Theater');
    else if (filterJadwalAktif === 'Event') dataTampil = dataJadwalBulanIni.filter(j => j.tipe_jadwal && j.tipe_jadwal !== 'Theater');

    document.getElementById('nav-bulan').style.display = 'flex'; 

    if (dataTampil.length === 0) return container.innerHTML = `<p style="text-align:center;">Belum ada jadwal/event untuk bulan ini.</p>`;

    const thnFilter = parseInt(document.getElementById('filter-tahun').value);
    const blnFilter = parseInt(document.getElementById('filter-bulan').value);
    const now = new Date();
    const isCurrentMonth = (now.getFullYear() === thnFilter && (now.getMonth() + 1) === blnFilter);

    if (isCurrentMonth) {
        const jadwalMendatang = [];
        const jadwalTerlewat = [];
        
        dataTampil.forEach(j => {
            const tglJadwal = new Date(j.tanggal_waktu);
            if (tglJadwal >= now) {
                jadwalMendatang.push(j);
            } else {
                jadwalTerlewat.push(j);
            }
        });
        
        dataTampil = [...jadwalMendatang, ...jadwalTerlewat];
    }

    dataTampil.forEach(jadwal => {
        const tgl = new Date(jadwal.tanggal_waktu);
        const formatTanggal = tgl.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const formatJam = tgl.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }).replace('.', ':') + ' WIB';

        const tipeJadwal = jadwal.tipe_jadwal || 'Theater';
        const tipeSekunder = jadwal.tipe_jadwal_sekunder || '';
        const judul = jadwal.judul_show || '';
        const judulLower = judul.toLowerCase();
        
        const namaTeamRaw = jadwal.team || 'JKT48'; 
        const namaTeam = namaTeamRaw.toUpperCase(); 
        const teamLower = namaTeamRaw.toLowerCase();
        
        // PERBAIKAN: Gunakan warna dari database cache jika ada, kalau tidak ada baru getTeamColor
        let warnaTeam = (window.mapWarnaTimCache && window.mapWarnaTimCache[teamLower]) ? window.mapWarnaTimCache[teamLower] : (getTeamColor(teamLower) || '#d81b60');

        let warnaUtama = '#d81b60'; 
        if (tipeJadwal !== 'Theater') {
            if (tipeSekunder.toUpperCase() === 'RAMADAN' || tipeSekunder.toUpperCase() === 'RAMADHAN') warnaUtama = '#28a745';
            else if (tipeSekunder.toUpperCase() === 'OFC') warnaUtama = '#b8860b';
            else warnaUtama = '#004080'; 
        } else warnaUtama = warnaTeam;

        let badgesHtml = '';

        if (tipeJadwal === 'Theater') badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: ${warnaTeam};">${namaTeam}</span>`;

        let teksTipeJadwal = tipeJadwal.toUpperCase();
        if (teksTipeJadwal === 'THEATER') teksTipeJadwal = 'TEATER';

        let warnaBadgePrimary = (tipeJadwal.toUpperCase() === 'EVENT') ? '#004080' : warnaUtama;
        badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: ${warnaBadgePrimary};">${teksTipeJadwal}</span>`;

        if (tipeSekunder) {
            let warnaBadgeSecondary = '#666'; 
            if (tipeSekunder.toUpperCase() === 'RAMADAN' || tipeSekunder.toUpperCase() === 'RAMADHAN') warnaBadgeSecondary = '#28a745';
            else if (tipeSekunder.toUpperCase() === 'OFC') warnaBadgeSecondary = '#b8860b';
            else if (tipeSekunder.toUpperCase() === 'OFFAIR') warnaBadgeSecondary = '#004080';
            badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: ${warnaBadgeSecondary};">${tipeSekunder.toUpperCase()}</span>`;
        }

        let isSTS = false; let isGrad = false;
        if (jadwal.performing_members && jadwal.performing_members.length > 0) {
            isSTS = jadwal.performing_members.some(pm => pm.is_birthday === true);
            isGrad = jadwal.performing_members.some(pm => pm.is_graduation === true);
        }
        
        if (jadwal.is_shonichi) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #00bcd4;">SHONICHI</span>`;
        if (jadwal.is_senshuraku || judulLower.includes('senshuraku') || judulLower.includes('last show')) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #673ab7;">SENSHURAKU</span>`;
        
        if (isSTS || judulLower.includes('seitansai') || judulLower.includes('birthday') || judulLower.includes('ulang tahun')) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #4caf50;">BIRTHDAY</span>`;
        if (isGrad || judulLower.includes('graduation') || judulLower.includes('kelulusan')) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #e53935;">GRADUATION</span>`;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.borderLeftColor = warnaUtama; 
        div.style.padding = '15px'; 
        
        if (isCurrentMonth && tgl < now) {
            div.style.opacity = '0.6';
            div.style.backgroundColor = '#f8f9fa';
        }

        div.onclick = () => muatDetailJadwal(jadwal.id, judul, formatTanggal + ' | Pukul ' + formatJam, jadwal.lokasi, tipeJadwal, jadwal.foto_event, tipeSekunder);
        
        // Admin Buttons - Tampil khusus localhost
        let adminButtonsHtml = '';
        if (isLocalhost()) {
            adminButtonsHtml = `
                <div style="margin-top: 10px; display:flex; gap:10px; flex-wrap:wrap;">
                    <button onclick="event.stopPropagation(); adminEditSchedule('${jadwal.id}')" style="background:#ff9800; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:0.8em; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Ubah Data</button>
                    <button onclick="event.stopPropagation(); adminHapusSchedule('${jadwal.id}')" style="background:#e53935; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:0.8em; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Hapus</button>
                </div>
            `;
        }

        div.innerHTML = `
            <div style="flex: 1;">
                <div class="list-subtitle" style="margin-bottom: 5px; flex-wrap: wrap; gap: 3px;">${badgesHtml}</div>
                <h3 class="list-title" style="color: ${warnaUtama}; font-size: 1.2em; margin: 0 0 5px 0;">${judul}</h3>
                <div style="font-size: 0.85em; color: #666; font-weight: bold;">${formatTanggal} | Pukul ${formatJam}</div>
                ${adminButtonsHtml}
            </div>
            <div style="color: ${warnaUtama}; font-size: 24px; display: flex; align-items: center; justify-content: flex-end; padding-left: 15px;">&#10140;</div>
        `;
        container.appendChild(div);
    });
}

// =======================================================
// FUNGSI UTAMA: LOAD DETAIL JADWAL (DENGAN TEMA DINAMIS)
// =======================================================
async function muatDetailJadwal(scheduleId, judul, waktu, lokasi, tipeJadwal, fotoEvent, tipeSekunder) {
    currentScheduleData = {scheduleId, judul, waktu, lokasi, tipeJadwal, fotoEvent, tipeSekunder};
    bukaHalaman('view-schedule-detail');
    
    if (typeof siapkanAdminPanel === "function") siapkanAdminPanel(scheduleId);
    
    if (!window.mapWarnaTimCache) {
        const { data: dataTeams } = await supabaseClient.from('teams').select('nama, warna');
        window.mapWarnaTimCache = {};
        if (dataTeams) {
            dataTeams.forEach(t => {
                if (t.nama && t.warna) window.mapWarnaTimCache[t.nama.toLowerCase()] = t.warna;
            });
        }
    }

    // Tarik data tim dari tabel schedule agar warna akurat sesuai dengan Badge list jadwal
    const { data: schedData } = await supabaseClient.from('theater_schedules').select('team').eq('id', scheduleId).single();
    let teamLower = schedData && schedData.team ? schedData.team.toLowerCase() : judul.toLowerCase();
    
    // PERBAIKAN: Gunakan warna dari database cache jika ada
    let warnaTema = (window.mapWarnaTimCache && window.mapWarnaTimCache[teamLower]) ? window.mapWarnaTimCache[teamLower] : (getTeamColor(teamLower) || '#d81b60');
    
    let tipeJudulFoto = 'Foto Teater';
    const elTeksMember = document.getElementById('teks-performing-members');
    elTeksMember.innerText = 'Performing Members'; 

    if (tipeJadwal !== 'Theater') {
        tipeJudulFoto = 'Foto Event';
        if (tipeSekunder && (tipeSekunder.toUpperCase() === 'RAMADAN' || tipeSekunder.toUpperCase() === 'RAMADHAN')) warnaTema = '#28a745'; 
        else if (tipeSekunder && tipeSekunder.toUpperCase() === 'OFC') { warnaTema = '#b8860b'; elTeksMember.innerText = 'Participating Members'; } 
        else warnaTema = '#004080'; 
    }

    const elJudul = document.getElementById('detail-judul-jadwal');
    const elLokasi = document.getElementById('detail-lokasi-jadwal');
    const elWaktu = document.getElementById('detail-waktu-jadwal');
    const elFotoInfo = document.getElementById('judul-foto-dinamis');
    const elTeksLagu = document.getElementById('teks-event-setlist');

    elJudul.innerText = judul;
    elJudul.style.color = warnaTema;

    elWaktu.innerText = waktu;
    elWaktu.style.color = '#666';

    elLokasi.innerHTML = `&#128205; ${lokasi || 'JKT48 Theater, fX Sudirman'}`;
    elLokasi.style.color = warnaTema;

    elTeksMember.style.color = warnaTema;
    if(elTeksLagu) elTeksLagu.style.color = warnaTema;
    
    if(elFotoInfo) {
        elFotoInfo.innerText = tipeJudulFoto;
        elFotoInfo.style.color = warnaTema;
    }

    const areaFoto = document.getElementById('area-foto-event');
    const imgFoto = document.getElementById('detail-foto-event');
    if (fotoEvent && fotoEvent.trim() !== '' && fotoEvent !== 'null') {
        areaFoto.style.display = 'block';
        imgFoto.src = fotoEvent;
    } else {
        areaFoto.style.display = 'none';
        imgFoto.src = '';
    }
    
    const container = document.getElementById('list-performing-members');
    const loading = document.getElementById('loading-performing');
    container.innerHTML = ''; loading.style.display = 'block';

    const { data, error } = await supabaseClient.from('performing_members')
        .select(`is_birthday, is_center, is_shonichi, is_graduation, blocking, members ( id, nama, nama_panggilan, status, team, generasi )`)
        .eq('schedule_id', scheduleId)
        .order('blocking', { ascending: true, nullsFirst: false }) 
        .order('is_center', { ascending: false });

    loading.style.display = 'none';

    if (error) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:red;">Gagal memuat member: ${error.message}</p>`;
    } else if (!data || data.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#999; font-style:italic;">Member yang tampil belum diumumkan.</p>`;
    } else {
        let validMembersData = data.filter(item => item && item.members);

        // ========================================================================
        // LOGIKA SORTING GLOBAL (BERLAKU UNTUK TEATER MAUPUN EVENT)
        // ========================================================================
        validMembersData.sort((a, b) => {
            // 1. Urutkan berdasarkan Blocking (Ascending)
            const blockA = (a.blocking !== null && a.blocking !== '') ? Number(a.blocking) : 9999;
            const blockB = (b.blocking !== null && b.blocking !== '') ? Number(b.blocking) : 9999;
            if (blockA !== blockB) return blockA - blockB;

            // 2. Prioritaskan Center jika blocking sama (atau sama-sama kosong)
            const centerA = a.is_center ? 1 : 0;
            const centerB = b.is_center ? 1 : 0;
            if (centerA !== centerB) return centerB - centerA;

            // 3. Khusus Event, pisahkan Trainee di antrean belakang
            if (tipeJadwal !== 'Theater') {
                const statusA = (a.members.status || 'Anggota').toLowerCase();
                const statusB = (b.members.status || 'Anggota').toLowerCase();
                const isTraineeA = statusA.includes('trainee') ? 1 : 0;
                const isTraineeB = statusB.includes('trainee') ? 1 : 0;
                if (isTraineeA !== isTraineeB) return isTraineeA - isTraineeB;
                
                if (isTraineeA === 1 && isTraineeB === 1) {
                    const genA = Number(a.members.generasi) || 999;
                    const genB = Number(b.members.generasi) || 999;
                    if (genA !== genB) return genA - genB; 
                }
            }

            // 4. FIX: Urutkan berdasarkan Nama Lengkap Anggota (Ascending A-Z)
            // Ini akan memastikan Abigail Rachel selalu di atas Angelina Christy
            const namaA = a.members.nama ? a.members.nama.toLowerCase() : '';
            const namaB = b.members.nama ? b.members.nama.toLowerCase() : '';
            
            return namaA.localeCompare(namaB);
        });

        if (validMembersData.length === 12) container.style.maxWidth = '750px';
        else container.style.maxWidth = '1000px'; 

        validMembersData.forEach(item => {
            const member = item.members;
            const namaPendek = member.nama_panggilan || member.nama.split(' ')[0];
            
            const card = document.createElement('div');
            card.className = 'card-member-mini';
            card.onclick = () => { if(typeof muatDetailMemberById === 'function') muatDetailMemberById(member.id); };

            let activeEvents = [];
            if (item.is_graduation) activeEvents.push({ name: 'LAST SHOW', icon: '&#127800;', color1: '#e53935', color2: '#b71c1c', textColor: '#b71c1c' });
            if (item.is_center) activeEvents.push({ name: 'CENTER', icon: '&#128081;', color1: '#ffd700', color2: '#ffaa00', textColor: '#d4af37' });
            if (item.is_birthday) activeEvents.push({ name: 'STS', icon: '&#127874;', color1: '#4caf50', color2: '#2e7d32', textColor: '#2e7d32' });
            if (item.is_shonichi) activeEvents.push({ name: 'SHONICHI', icon: '&#10024;', color1: '#00bcd4', color2: '#00838f', textColor: '#00838f' });

            let floatingIcons = ''; let floatBadge = ''; let h3Style = '';
            
            // PERBAIKAN WARNA TIM MEMBER: Gunakan cache database jika ada
            const mbrTeamLower = (member.team || '').toLowerCase();
            let warnaTimTampil = (window.mapWarnaTimCache && window.mapWarnaTimCache[mbrTeamLower]) ? window.mapWarnaTimCache[mbrTeamLower] : (getTeamColor(member.team) || warnaTema);

            if (activeEvents.length === 1) {
                const ev = activeEvents[0];
                floatingIcons = `<div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); font-size:1.4em; z-index:3; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));">${ev.icon}</div>`;
                floatBadge = `<div style="position:absolute; bottom:-10px; left:50%; transform:translateX(-50%); background: linear-gradient(135deg, ${ev.color1}, ${ev.color2}); font-size:0.55em; padding:2px 8px; border-radius:10px; color:white; font-weight:bold; border:1px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.2); z-index:3; letter-spacing:0.5px; white-space:nowrap;">${ev.name}</div>`;
                h3Style = `color: ${ev.textColor};`;
            } else if (activeEvents.length >= 2) {
                const ev1 = activeEvents[0]; const ev2 = activeEvents[1];
                floatingIcons = `
                    <div style="position:absolute; top:-8px; left:-8px; font-size:1.3em; z-index:3; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));">${ev1.icon}</div>
                    <div style="position:absolute; top:-8px; right:-8px; font-size:1.3em; z-index:3; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));">${ev2.icon}</div>
                `;
                const badgeText = activeEvents.map(e => e.name).join(' &bull; ');
                floatBadge = `<div style="position:absolute; bottom:-10px; left:50%; transform:translateX(-50%); background: linear-gradient(135deg, ${ev1.color1}, ${ev2.color1}); font-size:0.55em; padding:2px 8px; border-radius:10px; color:white; font-weight:bold; border:1px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.2); z-index:3; letter-spacing:0.5px; white-space:nowrap;">${badgeText}</div>`;
                h3Style = `color: ${ev1.textColor};`;
            } else { 
                h3Style = `color: ${warnaTimTampil};`; 
            }

            let imgStyle = `border: 3px solid ${activeEvents.length >= 1 ? activeEvents[0].color1 : warnaTimTampil}; box-shadow: 0 0 10px ${activeEvents.length >= 1 ? activeEvents[0].color1 : warnaTimTampil}99; width: 80px; height: 80px; object-fit: cover; border-radius: 50%;`;
            
            if (activeEvents.length >= 2) {
                imgStyle = `border: 3px solid transparent; background: linear-gradient(white, white) padding-box, linear-gradient(135deg, ${activeEvents[0].color1}, ${activeEvents[1].color1}) border-box; box-shadow: 0 0 10px ${activeEvents[0].color1}99; width: 80px; height: 80px; object-fit: cover; border-radius: 50%;`;
            }

            const imgHtml = generateMemberImageHtml(member, judul, null, null, imgStyle);

            card.innerHTML = `
                <div style="position:relative; width:80px; height:80px; margin:0 auto 15px auto;">
                    ${floatingIcons}
                    ${imgHtml}
                    ${floatBadge}
                </div>
                <h3 style="${h3Style} margin: 0; font-size:0.85em; font-weight:bold; line-height: 1.2;" title="${member.nama}">${namaPendek}</h3>
            `;
            container.appendChild(card);
        });
    }

    const areaSetlist = document.getElementById('area-setlist-event');
    const containerSongs = document.getElementById('list-schedule-songs');
    const loadingSongs = document.getElementById('loading-schedule-songs');
    
    if (tipeJadwal !== 'Theater') {
        containerSongs.innerHTML = ''; areaSetlist.style.display = 'block'; loadingSongs.style.display = 'block';

        const { data: dataSongs, error: errSongs } = await supabaseClient
            .from('schedule_songs')
            .select('track_number, dibawakan_oleh, center1:members!center_id(id, nama_panggilan), center2:members!center_id_2(id, nama_panggilan), songs(id, judul_lagu, tipe_lagu, tipe_dibawakan)')
            .eq('schedule_id', scheduleId)
            .order('track_number', { ascending: true });

        loadingSongs.style.display = 'none';
        if (errSongs || !dataSongs || dataSongs.length === 0) {
            areaSetlist.style.display = 'none'; 
        } else {
            dataSongs.forEach((item, index) => {
                if (!item.songs) return; 
                const lagu = item.songs;
                const div = document.createElement('div');
                div.className = 'list-item';
                div.style.borderLeftColor = warnaTema;
                div.onclick = () => { if(typeof muatDetailLagu === 'function') muatDetailLagu(lagu.id, 'view-schedule-detail'); };
                
                const tampilanTrack = item.track_number ? `Track ${item.track_number}` : `Track ${index + 1}`;
                const badgeTipeLagu = lagu.tipe_lagu ? `<span class="badge-tipe-lagu" style="background-color:${warnaTema};">${lagu.tipe_lagu}</span>` : '';
                
                const teksDibawakan = item.dibawakan_oleh ? item.dibawakan_oleh : (lagu.tipe_dibawakan ? lagu.tipe_dibawakan : '');
                const isInstrumentalLagu = lagu.tipe_lagu && lagu.tipe_lagu.toLowerCase() === 'instrumental';
                let badgeTipeDibawakan = '';
                if (!isInstrumentalLagu && teksDibawakan) badgeTipeDibawakan = `<span class="badge-tipe-bawa">${teksDibawakan}</span>`;
                
                let namaCenter = '';
                if (item.center1 && item.center1.nama_panggilan) namaCenter += item.center1.nama_panggilan;
                if (item.center2 && item.center2.nama_panggilan) namaCenter += ' & ' + item.center2.nama_panggilan;
                const textCenter = namaCenter !== '' ? `<div style="margin-top: 5px; font-weight: bold; font-size: 0.85em; color: #d4af37;">&#128081; ${namaCenter}</div>` : '';

                div.innerHTML = `
                    <div>
                        <div class="list-subtitle" style="margin-bottom: 5px;">&#127925; ${tampilanTrack} ${badgeTipeLagu}${badgeTipeDibawakan}</div>
                        <h3 class="list-title" style="color:${warnaTema}; margin-top: 2px;">${lagu.judul_lagu}</h3>
                        ${textCenter}
                    </div>
                    <div style="color: ${warnaTema}; font-size: 24px;">&#10140;</div>
                `;
                containerSongs.appendChild(div);
            });
        }
    } else {
        areaSetlist.style.display = 'none';
    }
}

// ============================================================================
// --- ADMIN LOKAL PANEL DENGAN BULK ACTION (NEW) ---
// ============================================================================
let currentAdminScheduleId = null;
window.allMembersAdminCache = [];
window.stagedAdminMembers = []; 

function siapkanAdminPanel(scheduleId) {
    currentAdminScheduleId = scheduleId;
    const toggleBtn = document.getElementById('admin-panel-toggle');
    const adminArea = document.getElementById('admin-lineup-area');
    
    if (isLocalhost()) { toggleBtn.style.display = 'block'; adminArea.style.display = 'none'; } 
    else { toggleBtn.style.display = 'none'; adminArea.style.display = 'none'; }
}

window.toggleAdminLineup = async function() {
    const adminArea = document.getElementById('admin-lineup-area');
    if (adminArea.style.display === 'none') { 
        adminArea.style.display = 'block'; 
        
        adminArea.innerHTML = `
            <h3 style="color: #d81b60; text-align: center; margin-top: 0;">Manajemen Lineup Manual</h3>
            <div id="admin-status-jadwal" style="background:#e2e8f0; padding:15px; border-radius:5px; margin-bottom:15px;"></div>
            <div id="admin-manage-wrapper"><p style="text-align:center;">Mempersiapkan alat...</p></div>
        `;
        
        await muatDataAdminJadwal(); 
        await muatDataAdminLineup(); 
    } else {
        adminArea.style.display = 'none';
    }
}

async function muatDataAdminJadwal() {
    let containerJadwal = document.getElementById('admin-status-jadwal');
    containerJadwal.innerHTML = '<p style="font-size:0.85em; color:#666;">Memuat status jadwal...</p>';

    const { data, error } = await supabaseClient
        .from('theater_schedules')
        .select('is_shonichi, is_senshuraku, team')
        .eq('id', currentAdminScheduleId)
        .single();
    
    if(data) {
        const cShonichi = data.is_shonichi ? 'checked' : '';
        const cSenshuraku = data.is_senshuraku ? 'checked' : '';
        
        const teamOptions = ['JKT48', 'Team J', 'Team KIII', 'Team T', 'Trainee', 'Academy Class A', 'Team Love', 'Team Dream', 'Team Passion'];
        let selTeam = `<select onchange="adminUpdateTextJadwal('team', this.value)" style="padding:6px 12px; border-radius:4px; border: 1px solid #d81b60; font-weight:bold; color:#333; outline:none;">`;
        teamOptions.forEach(t => {
            let selected = (data.team === t) ? 'selected' : '';
            selTeam += `<option value="${t}" ${selected}>${t}</option>`;
        });
        selTeam += `</select>`;

        containerJadwal.innerHTML = `
            <h4 style="margin-top:0; margin-bottom:15px; color:#334155; font-size:1.1em; border-bottom:2px solid #cbd5e1; padding-bottom:5px;">&#127915; Pengaturan Keseluruhan Jadwal</h4>
            
            <div style="margin-bottom:20px;">
                <label style="font-weight:bold; color:#475569; display:inline-block; margin-right:10px;">Tim Penyaji Show/Event ini:</label>
                ${selTeam}
                <p style="margin:5px 0 0 0; font-size:0.8em; color:#888;">(Ubah ini jika jadwal nyasar ke tim yang salah)</p>
            </div>

            <div style="display:flex; gap:25px; flex-wrap:wrap; font-size:0.95em;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px; color:#00838f; font-weight:bold;">
                    <input type="checkbox" ${cShonichi} onchange="adminUpdateStatusJadwal('is_shonichi', this.checked)"> 
                    Shonichi (First Show)
                </label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px; color:#673ab7; font-weight:bold;">
                    <input type="checkbox" ${cSenshuraku} onchange="adminUpdateStatusJadwal('is_senshuraku', this.checked)"> 
                    Senshuraku (Last Show)
                </label>
            </div>
        `;
    } else {
        containerJadwal.innerHTML = '<p style="color:red; font-size:0.85em;">Gagal memuat status jadwal.</p>';
    }
}

window.adminUpdateStatusJadwal = async function(field, isChecked) {
    const { error } = await supabaseClient.from('theater_schedules').update({ [field]: isChecked }).eq('id', currentAdminScheduleId);
    if (error) alert('Gagal update status jadwal: ' + error.message);
    else if (typeof terapkanFilterJadwal === 'function') terapkanFilterJadwal();
}

window.adminUpdateTextJadwal = async function(field, valueText) {
    const { error } = await supabaseClient.from('theater_schedules').update({ [field]: valueText }).eq('id', currentAdminScheduleId);
    if(error) alert('Gagal memindahkan Tim: ' + error.message);
    else { alert(`SUKSES! Jadwal ini sekarang resmi dimiliki oleh ${valueText}`); if (typeof terapkanFilterJadwal === 'function') terapkanFilterJadwal(); }
}

async function muatDataAdminLineup() {
    const wrapper = document.getElementById('admin-manage-wrapper');
    wrapper.innerHTML = '<p style="text-align:center;">Memuat data member & lineup...</p>';

    if (window.allMembersAdminCache.length === 0) {
        const { data: allMem } = await supabaseClient.from('members').select('id, nama, nama_panggilan').order('nama');
        if (allMem) window.allMembersAdminCache = allMem;
    }

    const { data: currentLineup } = await supabaseClient
        .from('performing_members')
        .select('id, member_id, is_center, is_shonichi, is_birthday, is_graduation, members(nama)')
        .eq('schedule_id', currentAdminScheduleId)
        .order('blocking', { ascending: true, nullsFirst: false });

    let dlOptions = '';
    window.allMembersAdminCache.forEach(m => dlOptions += `<option value="${m.nama}">`);

    let html = `
        <div style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
            <h4 style="margin-top:0; color:#333; margin-bottom:10px;">Tambah Member ke Lineup (Bisa Banyak Sekaligus)</h4>
            <div style="display:flex; gap:10px;">
                <input list="dl-admin-members" id="input-admin-member" placeholder="Ketik/Paste nama (pisahkan dengan koma)..." style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;" onkeydown="if(event.key === 'Enter') adminStageMember()">
                <datalist id="dl-admin-members">${dlOptions}</datalist>
                <button onclick="adminStageMember()" style="background:#004080; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer;">+ Masukkan ke Antrean</button>
            </div>
            <div id="staged-members-container" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;"></div>
            <button id="btn-save-staged" onclick="adminSimpanStagedMembers()" style="display:none; margin-top:15px; width:100%; background:#28a745; color:white; border:none; padding:10px; border-radius:5px; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Simpan Antrean ke Database</button>
        </div>

        <div style="overflow-x: auto; background: #fff; border: 1px solid #ddd; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9em;">
                <thead>
                    <tr style="background: #fce4ec; border-bottom: 2px solid #d81b60;">
                        <th style="padding: 10px;">Nama Member</th>
                        <th style="padding: 10px; text-align: center;" title="Center">&#128081; Center</th>
                        <th style="padding: 10px; text-align: center;" title="Shonichi">&#10024; Shonichi</th>
                        <th style="padding: 10px; text-align: center;" title="Seitansai">&#127874; STS</th>
                        <th style="padding: 10px; text-align: center;" title="Last Show">&#127800; Grad</th>
                        <th style="padding: 10px; text-align: center;">Aksi</th>
                    </tr>
                </thead>
                <tbody id="admin-table-body">
    `;

    if (!currentLineup || currentLineup.length === 0) {
        html += '<tr><td colspan="6" style="text-align:center; padding:15px; color:#888;">Belum ada member di lineup ini.</td></tr>';
    } else {
        currentLineup.forEach(item => {
            const cCenter = item.is_center ? 'checked' : '';
            const cShonichi = item.is_shonichi ? 'checked' : '';
            const cSTS = item.is_birthday ? 'checked' : '';
            const cGrad = item.is_graduation ? 'checked' : '';

            html += `
                <tr style="border-bottom: 1px solid #eee;" data-id="${item.id}" data-member-id="${item.member_id}">
                    <td style="padding: 10px; font-weight: bold; color:#444;">${item.members.nama}</td>
                    <td style="padding: 10px; text-align: center;"><input type="checkbox" style="transform: scale(1.3); cursor:pointer;" class="cb-center" ${cCenter}></td>
                    <td style="padding: 10px; text-align: center;"><input type="checkbox" style="transform: scale(1.3); cursor:pointer;" class="cb-shonichi" ${cShonichi}></td>
                    <td style="padding: 10px; text-align: center;"><input type="checkbox" style="transform: scale(1.3); cursor:pointer;" class="cb-sts" ${cSTS}></td>
                    <td style="padding: 10px; text-align: center;"><input type="checkbox" style="transform: scale(1.3); cursor:pointer;" class="cb-grad" ${cGrad}></td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="adminHapusMember('${item.member_id}')" style="background:#e53935; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8em;">Keluarkan</button>
                    </td>
                </tr>
            `;
        });
    }

    html += `</tbody></table></div>`;

    if (currentLineup && currentLineup.length > 0) {
        html += `<button onclick="adminSimpanPerubahanLineup()" style="margin-top:15px; width:100%; background:#ff9800; color:white; border:none; padding:10px; border-radius:5px; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Simpan Semua Centang Sekaligus</button>`;
    }

    wrapper.innerHTML = html;
    window.stagedAdminMembers = []; // Kosongkan antrean
    renderStagedMembers();
}

window.adminStageMember = function() {
    const input = document.getElementById('input-admin-member');
    const rawValues = input.value.split(',').map(s => s.trim()).filter(s => s !== '');
    if (rawValues.length === 0) return;

    const firstValueLower = rawValues[0].toLowerCase();
    let searchType = null;
    
    if (window.allMembersAdminCache.some(m => (m.nama || '').toLowerCase() === firstValueLower)) {
        searchType = 'nama';
    } else if (window.allMembersAdminCache.some(m => (m.nama_panggilan || '').toLowerCase() === firstValueLower)) {
        searchType = 'nama_panggilan';
    }

    if (!searchType) {
        alert(`Nama "${rawValues[0]}" tidak ditemukan di database. Pastikan ejaan nama pertama benar!`);
        return;
    }

    let addedCount = 0; let notFoundList = []; let duplicateList = [];
    const existingTableRows = document.querySelectorAll('#admin-table-body tr[data-member-id]');
    const existingMemberIdsInTable = Array.from(existingTableRows).map(tr => tr.getAttribute('data-member-id'));

    rawValues.forEach(nameStr => {
        const nameLower = nameStr.toLowerCase();
        const memberObj = window.allMembersAdminCache.find(m => (m[searchType] || '').toLowerCase() === nameLower);

        if (!memberObj) { notFoundList.push(nameStr); return; }
        if (window.stagedAdminMembers.some(m => m.id === memberObj.id)) return; 
        if (existingMemberIdsInTable.includes(memberObj.id)) { duplicateList.push(memberObj.nama); return; }

        window.stagedAdminMembers.push(memberObj);
        addedCount++;
    });

    if (notFoundList.length > 0) alert(`Tidak ditemukan sebagai ${searchType}:\n${notFoundList.join(', ')}`);
    if (duplicateList.length > 0) alert(`Sudah ada di lineup:\n${duplicateList.join(', ')}`);

    input.value = ''; renderStagedMembers();
};

window.adminRemoveStagedMember = function(id) {
    window.stagedAdminMembers = window.stagedAdminMembers.filter(m => m.id !== id);
    renderStagedMembers();
};

function renderStagedMembers() {
    const container = document.getElementById('staged-members-container');
    const btnSave = document.getElementById('btn-save-staged');
    
    container.innerHTML = '';
    if (window.stagedAdminMembers.length > 0) {
        window.stagedAdminMembers.forEach(m => {
            container.innerHTML += `
                <div style="background:#0ea5e9; color:white; padding:5px 12px; border-radius:15px; font-size:0.85em; display:flex; align-items:center; gap:8px; font-weight:bold;">
                    ${m.nama}
                    <span onclick="adminRemoveStagedMember('${m.id}')" style="background:white; color:#0ea5e9; border-radius:50%; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; font-size:12px;">&times;</span>
                </div>
            `;
        });
        btnSave.style.display = 'block';
        btnSave.innerText = `Simpan ${window.stagedAdminMembers.length} Member ke Database`;
    } else {
        btnSave.style.display = 'none';
    }
}

window.adminSimpanStagedMembers = async function() {
    if (window.stagedAdminMembers.length === 0) return;
    const inserts = window.stagedAdminMembers.map(m => ({
        schedule_id: currentAdminScheduleId, member_id: m.id, blocking: null
    }));
    const { error } = await supabaseClient.from('performing_members').insert(inserts);
    if (error) alert('Gagal menyimpan member baru: ' + error.message);
    else { alert(`${inserts.length} Member berhasil dimasukkan!`); await muatDataAdminLineup(); refreshDetailSaatIni(); }
};

window.adminSimpanPerubahanLineup = async function() {
    const rows = document.querySelectorAll('#admin-table-body tr[data-id]');
    const updates = [];
    rows.forEach(tr => {
        const id = tr.getAttribute('data-id'); const memberId = tr.getAttribute('data-member-id');
        if(!id || !memberId) return;
        updates.push({
            id: id, schedule_id: currentAdminScheduleId, member_id: memberId,
            is_center: tr.querySelector('.cb-center').checked,
            is_shonichi: tr.querySelector('.cb-shonichi').checked,
            is_birthday: tr.querySelector('.cb-sts').checked,
            is_graduation: tr.querySelector('.cb-grad').checked
        });
    });
    if (updates.length === 0) return alert('Tidak ada data yang bisa disimpan.');
    const { error } = await supabaseClient.from('performing_members').upsert(updates);
    if (error) alert('Gagal menyimpan massal: ' + error.message);
    else { alert('Perubahan centang berhasil disimpan!'); refreshDetailSaatIni(); }
};

window.adminHapusMember = async function(memberId) {
    if (!confirm('Yakin ingin mengeluarkan member ini dari lineup show?')) return;
    const { error } = await supabaseClient.from('performing_members').delete().match({ schedule_id: currentAdminScheduleId, member_id: memberId });
    if (error) alert('Gagal mengeluarkan: ' + error.message);
    else { await muatDataAdminLineup(); refreshDetailSaatIni(); }
};

function refreshDetailSaatIni() {
    if(currentScheduleData && currentScheduleData.scheduleId) {
        muatDetailJadwal(currentScheduleData.scheduleId, currentScheduleData.judul, currentScheduleData.waktu, currentScheduleData.lokasi, currentScheduleData.tipeJadwal, currentScheduleData.fotoEvent, currentScheduleData.tipeSekunder);
    }
}

// ============================================================================
// --- FUNGSI ADMIN: CRUD JADWAL BARU DARI MENU UTAMA ---
// ============================================================================
window.toggleAdminSchedule = function() {
    const area = document.getElementById('admin-schedule-area');
    if (area.style.display === 'none') {
        area.style.display = 'block';
    } else {
        window.adminBatalEditSchedule();
        area.style.display = 'none';
    }
};

window.adminBatalEditSchedule = function() {
    document.getElementById('adm-sch-id').value = '';
    document.getElementById('adm-sch-judul').value = '';
    document.getElementById('adm-sch-waktu').value = '';
    document.getElementById('adm-sch-team').value = 'JKT48';
    document.getElementById('adm-sch-lokasi').value = '';
    document.getElementById('adm-sch-tipe').value = 'Theater';
    document.getElementById('adm-sch-sekunder').value = '';
    document.getElementById('adm-sch-foto').value = '';
    document.getElementById('adm-sch-shonichi').checked = false;
    document.getElementById('adm-sch-senshuraku').checked = false;

    const area = document.getElementById('admin-schedule-area');
    const btnSave = document.querySelector('#adm-sch-btns button');
    if (btnSave) {
        btnSave.innerText = 'Simpan Jadwal';
        btnSave.style.background = '#d81b60';
    }
    document.getElementById('btn-cancel-sch').style.display = 'none';
    area.style.display = 'none';
};

window.adminEditSchedule = function(id) {
    const jadwal = dataJadwalBulanIni.find(j => j.id === id);
    if (!jadwal) return;

    document.getElementById('adm-sch-id').value = id;
    document.getElementById('adm-sch-judul').value = jadwal.judul_show || '';
    
    // Konversi zona waktu database (ISO UTC) menjadi waktu lokal browser untuk input form
    if (jadwal.tanggal_waktu) {
        const d = new Date(jadwal.tanggal_waktu);
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d - tzoffset)).toISOString().slice(0, 16);
        document.getElementById('adm-sch-waktu').value = localISOTime;
    } else {
        document.getElementById('adm-sch-waktu').value = '';
    }

    document.getElementById('adm-sch-team').value = jadwal.team || 'JKT48';
    document.getElementById('adm-sch-lokasi').value = jadwal.lokasi || '';
    document.getElementById('adm-sch-tipe').value = jadwal.tipe_jadwal || 'Theater';
    document.getElementById('adm-sch-sekunder').value = jadwal.tipe_jadwal_sekunder || '';
    document.getElementById('adm-sch-foto').value = jadwal.foto_event || '';
    document.getElementById('adm-sch-shonichi').checked = jadwal.is_shonichi || false;
    document.getElementById('adm-sch-senshuraku').checked = jadwal.is_senshuraku || false;

    const area = document.getElementById('admin-schedule-area');
    area.style.display = 'block';

    const btnSave = document.querySelector('#adm-sch-btns button');
    if (btnSave) {
        btnSave.innerText = 'Simpan Perubahan';
        btnSave.style.background = '#ff9800';
    }
    document.getElementById('btn-cancel-sch').style.display = 'inline-block';
    
    window.scrollTo(0, area.offsetTop - 50);
};

window.adminSimpanScheduleBaru = async function() {
    const id = document.getElementById('adm-sch-id').value;
    const judul = document.getElementById('adm-sch-judul').value;
    const waktuRaw = document.getElementById('adm-sch-waktu').value;
    
    if (!judul || !waktuRaw) {
        alert('Judul dan Waktu Jadwal wajib diisi!');
        return;
    }

    const waktuISO = new Date(waktuRaw).toISOString();

    const payload = {
        judul_show: judul,
        tanggal_waktu: waktuISO,
        team: document.getElementById('adm-sch-team').value,
        lokasi: document.getElementById('adm-sch-lokasi').value || null,
        tipe_jadwal: document.getElementById('adm-sch-tipe').value,
        tipe_jadwal_sekunder: document.getElementById('adm-sch-sekunder').value || null,
        foto_event: document.getElementById('adm-sch-foto').value || null,
        is_shonichi: document.getElementById('adm-sch-shonichi').checked,
        is_senshuraku: document.getElementById('adm-sch-senshuraku').checked
    };

    if (id) {
        const { error } = await supabaseClient.from('theater_schedules').update(payload).eq('id', id);
        if (error) alert('Gagal update: ' + error.message);
        else {
            alert('Jadwal berhasil diperbarui!');
            window.adminBatalEditSchedule();
            terapkanFilterJadwal();
        }
    } else {
        const { error } = await supabaseClient.from('theater_schedules').insert([payload]);
        if (error) alert('Gagal menambah jadwal: ' + error.message);
        else {
            alert('Jadwal baru berhasil ditambahkan!');
            window.adminBatalEditSchedule();
            terapkanFilterJadwal();
        }
    }
};

window.adminHapusSchedule = async function(id) {
    if(!confirm('Yakin ingin menghapus jadwal ini?\\nPerhatian: Semua data Lineup member & Tracklist lagu di dalamnya juga akan terhapus dari database!')) return;
    
    const { error } = await supabaseClient.from('theater_schedules').delete().eq('id', id);
    if (error) {
        alert('Gagal menghapus: ' + error.message);
    } else {
        alert('Jadwal berhasil dihapus!');
        terapkanFilterJadwal();
    }
};
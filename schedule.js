let dataJadwalBulanIni = [];
let filterJadwalAktif = 'Semua';
let currentScheduleData = {};
let isDropdownTahunSiap = false; 

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
    container.innerHTML = ''; loading.style.display = 'block';
    document.getElementById('nav-bulan').style.display = 'none';
    
    const awalBulan = new Date(tahun, bulan - 1, 1).toISOString();
    const akhirBulan = new Date(tahun, bulan, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabaseClient
        .from('theater_schedules')
        .select('*, performing_members(is_birthday, is_graduation)')
        .gte('tanggal_waktu', awalBulan)
        .lte('tanggal_waktu', akhirBulan)
        .order('tanggal_waktu', { ascending: true });

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
        
        let warnaTeam = getTeamColor(teamLower) || '#d81b60'; 

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
        
        // --- LOGIKA BADGE SHONICHI & SENSHURAKU ---
        if (jadwal.is_shonichi) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #00bcd4;">SHONICHI</span>`;
        if (jadwal.is_senshuraku || judulLower.includes('senshuraku') || judulLower.includes('last show')) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #673ab7;">SENSHURAKU</span>`;
        
        if (isSTS || judulLower.includes('seitansai') || judulLower.includes('birthday') || judulLower.includes('ulang tahun')) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #4caf50;">BIRTHDAY</span>`;
        if (isGrad || judulLower.includes('graduation') || judulLower.includes('kelulusan')) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #e53935;">GRADUATION</span>`;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.borderLeftColor = warnaUtama; 
        div.style.padding = '15px'; 
        div.onclick = () => muatDetailJadwal(jadwal.id, judul, formatTanggal + ' | Pukul ' + formatJam, jadwal.lokasi, tipeJadwal, jadwal.foto_event, tipeSekunder);
        
        div.innerHTML = `
            <div>
                <div class="list-subtitle" style="margin-bottom: 5px; flex-wrap: wrap; gap: 3px;">${badgesHtml}</div>
                <h3 class="list-title" style="color: ${warnaUtama}; font-size: 1.2em; margin: 0 0 5px 0;">${judul}</h3>
                <div style="font-size: 0.85em; color: #666; font-weight: bold;">${formatTanggal} | Pukul ${formatJam}</div>
            </div>
            <div style="color: ${warnaUtama}; font-size: 24px;">&#10140;</div>
        `;
        container.appendChild(div);
    });
}

async function muatDetailJadwal(scheduleId, judul, waktu, lokasi, tipeJadwal, fotoEvent, tipeSekunder) {
    currentScheduleData = {scheduleId, judul, waktu, lokasi, tipeJadwal, fotoEvent, tipeSekunder};
    bukaHalaman('view-schedule-detail');
    
    if (typeof siapkanAdminPanel === "function") siapkanAdminPanel(scheduleId);
    
    let warnaTema = '#d81b60'; 
    let tipeJudulFoto = 'Foto Teater';
    const elTeksMember = document.getElementById('teks-performing-members');
    elTeksMember.innerText = 'Performing Members'; 

    if (tipeJadwal !== 'Theater') {
        tipeJudulFoto = 'Foto Event';
        if (tipeSekunder && (tipeSekunder.toUpperCase() === 'RAMADAN' || tipeSekunder.toUpperCase() === 'RAMADHAN')) warnaTema = '#28a745'; 
        else if (tipeSekunder && tipeSekunder.toUpperCase() === 'OFC') { warnaTema = '#b8860b'; elTeksMember.innerText = 'Participating Members'; } 
        else warnaTema = '#004080'; 
    }

    document.getElementById('detail-judul-jadwal').innerText = judul;
    document.getElementById('detail-judul-jadwal').style.color = warnaTema;
    document.getElementById('detail-waktu-jadwal').innerText = waktu;
    document.getElementById('detail-lokasi-jadwal').innerHTML = `&#128205; ${lokasi || 'JKT48 Theater, fX Sudirman'}`;
    document.getElementById('detail-lokasi-jadwal').style.color = warnaTema;
    elTeksMember.style.color = warnaTema;
    document.getElementById('teks-event-setlist').style.color = warnaTema;
    document.getElementById('judul-foto-dinamis').innerText = tipeJudulFoto;
    document.getElementById('judul-foto-dinamis').style.color = warnaTema;

    if (fotoEvent && fotoEvent.trim() !== '') {
        document.getElementById('detail-foto-event').src = fotoEvent;
        document.getElementById('area-foto-event').style.display = 'block';
    } else {
        document.getElementById('area-foto-event').style.display = 'none';
        document.getElementById('detail-foto-event').src = '';
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
    if (error) container.innerHTML = `<p style="color:red;">Gagal memuat member: ${error.message}</p>`;
    else if (data.length === 0) container.innerHTML = `<p style="text-align:center; color:#999; width:100%;">Member yang tampil belum diumumkan.</p>`;
    else {
        let validMembersData = data.filter(item => item && item.members);

        if (tipeJadwal !== 'Theater') {
            validMembersData.sort((a, b) => {
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
                return (a.members.nama || '').localeCompare(b.members.nama || '');
            });
        }

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
            
            let warnaTimTampil = getTeamColor(member.team) || warnaTema;

            if (activeEvents.length === 1) {
                const ev = activeEvents[0];
                floatingIcons = `<div class="icon-single">${ev.icon}</div>`;
                floatBadge = `<div class="badge-single" style="background: linear-gradient(135deg, ${ev.color1}, ${ev.color2});">${ev.name}</div>`;
                h3Style = `color: ${ev.textColor};`;
            } else if (activeEvents.length >= 2) {
                const ev1 = activeEvents[0]; const ev2 = activeEvents[1];
                floatingIcons = `<div class="icon-dual-left">${ev1.icon}</div><div class="icon-dual-right">${ev2.icon}</div>`;
                const badgeText = activeEvents.map(e => e.name).join(' &bull; ');
                floatBadge = `<div class="badge-single" style="background: linear-gradient(135deg, ${ev1.color1}, ${ev2.color1});">${badgeText}</div>`;
                h3Style = `color: ${ev.textColor};`;
            } else { h3Style = `color: ${warnaTimTampil};`; }

            let imgStyle = `border: 3px solid ${activeEvents.length >= 1 ? activeEvents[0].color1 : warnaTimTampil}; box-shadow: 0 0 10px ${activeEvents.length >= 1 ? activeEvents[0].color1 : warnaTimTampil}99;`;
            if (activeEvents.length >= 2) imgStyle = `border: 3px solid transparent; background: linear-gradient(white, white) padding-box, linear-gradient(135deg, ${activeEvents[0].color1}, ${activeEvents[1].color1}) border-box; box-shadow: 0 0 10px ${activeEvents[0].color1}99;`;

            const imgHtml = generateMemberImageHtml(member, judul, null, null, imgStyle);
            card.innerHTML = `<div style="position:relative; width:100%; display:flex; justify-content:center;">${floatingIcons}${imgHtml}${floatBadge}</div><h3 style="${h3Style}" title="${member.nama}">${namaPendek}</h3>`;
            container.appendChild(card);
        });
    }

    const areaSetlist = document.getElementById('area-setlist-event');
    const containerSongs = document.getElementById('list-schedule-songs');
    const loadingSongs = document.getElementById('loading-schedule-songs');
    
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
}

// ============================================================================
// --- ADMIN LOKAL PANEL ---
// ============================================================================
let currentAdminScheduleId = null;

function isLocalhost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
}

function siapkanAdminPanel(scheduleId) {
    currentAdminScheduleId = scheduleId;
    const toggleBtn = document.getElementById('admin-panel-toggle');
    const adminArea = document.getElementById('admin-lineup-area');
    
    if (isLocalhost()) { toggleBtn.style.display = 'block'; adminArea.style.display = 'none'; } 
    else { toggleBtn.style.display = 'none'; adminArea.style.display = 'none'; }
}

async function toggleAdminLineup() {
    const adminArea = document.getElementById('admin-lineup-area');
    if (adminArea.style.display === 'none') { 
        adminArea.style.display = 'block'; 
        await muatDataAdminJadwal(); // Memuat status jadwal (Shonichi/Senshuraku & Edit Team)
        await muatDataAdminLineup(); // Memuat status lineup member
    } else {
        adminArea.style.display = 'none';
    }
}

// --- FITUR BARU: MANAJEMEN STATUS JADWAL & EDIT TEAM ---
async function muatDataAdminJadwal() {
    const adminArea = document.getElementById('admin-lineup-area');
    let containerJadwal = document.getElementById('admin-status-jadwal');
    
    // Injeksi kotak kontrol jika belum ada
    if (!containerJadwal) {
        containerJadwal = document.createElement('div');
        containerJadwal.id = 'admin-status-jadwal';
        containerJadwal.style.marginBottom = '20px';
        containerJadwal.style.padding = '15px';
        containerJadwal.style.backgroundColor = '#f1f5f9';
        containerJadwal.style.borderRadius = '8px';
        containerJadwal.style.border = '1px solid #cbd5e1';
        adminArea.insertBefore(containerJadwal, adminArea.firstChild);
    }

    containerJadwal.innerHTML = '<p style="font-size:0.85em; color:#666;">Memuat status jadwal...</p>';

    // Mengambil data status jadwal saat ini dari database
    const { data, error } = await supabaseClient
        .from('theater_schedules')
        .select('is_shonichi, is_senshuraku, team')
        .eq('id', currentAdminScheduleId)
        .single();
    
    if(data) {
        const cShonichi = data.is_shonichi ? 'checked' : '';
        const cSenshuraku = data.is_senshuraku ? 'checked' : '';
        
        // Opsi Dropdown Tim Penyaji
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
                <p style="margin:5px 0 0 0; font-size:0.8em; color:#888;">(Ubah ini jika jadwal nyasar ke tim yang salah, misalnya show "Kira Kira Girls" masuk ke JKT48 alih-alih Trainee)</p>
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
            <p style="font-size:0.8em; color:#888; margin-top:10px; margin-bottom:0; font-style:italic;">*Perubahan centang akan langsung tersimpan dan merubah badge di halaman depan.</p>
        `;
    } else {
        containerJadwal.innerHTML = '<p style="color:red; font-size:0.85em;">Gagal memuat status jadwal.</p>';
    }
}

async function adminUpdateStatusJadwal(field, isChecked) {
    const { error } = await supabaseClient.from('theater_schedules')
        .update({ [field]: isChecked })
        .eq('id', currentAdminScheduleId);
    
    if (error) alert('Gagal update status jadwal: ' + error.message);
    else {
        console.log(`Status jadwal [${field}] diupdate menjadi: ${isChecked}`);
        if (typeof terapkanFilterJadwal === 'function') terapkanFilterJadwal();
    }
}

// Fungsi Khusus untuk Mengubah Teks (Misal nama Tim)
async function adminUpdateTextJadwal(field, valueText) {
    const { error } = await supabaseClient.from('theater_schedules')
        .update({ [field]: valueText })
        .eq('id', currentAdminScheduleId);
        
    if(error) alert('Gagal memindahkan Tim: ' + error.message);
    else {
        alert(`SUKSES! Jadwal ini sekarang resmi dimiliki oleh ${valueText}`);
        if (typeof terapkanFilterJadwal === 'function') terapkanFilterJadwal();
    }
}
// -----------------------------------------------------------------

async function muatDataAdminLineup() {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:10px;">Memuat data...</td></tr>';

    const selectEl = document.getElementById('admin-select-member');
    if (selectEl.options.length <= 1) {
        const { data: allMembers } = await supabaseClient.from('members').select('id, nama').order('nama');
        if (allMembers) {
            selectEl.innerHTML = '<option value="">-- Pilih Member untuk Ditambahkan --</option>';
            allMembers.forEach(m => selectEl.innerHTML += `<option value="${m.id}">${m.nama}</option>`);
        }
    }

    const { data: currentLineup } = await supabaseClient
        .from('performing_members')
        .select('id, member_id, is_center, is_shonichi, is_birthday, is_graduation, members(nama)')
        .eq('schedule_id', currentAdminScheduleId)
        .order('blocking', { ascending: true, nullsFirst: false });

    tbody.innerHTML = '';
    
    if (!currentLineup || currentLineup.length === 0) return tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:10px; color:#888;">Belum ada member di lineup ini.</td></tr>';

    currentLineup.forEach(item => {
        const cCenter = item.is_center ? 'checked' : '';
        const cShonichi = item.is_shonichi ? 'checked' : '';
        const cSTS = item.is_birthday ? 'checked' : '';
        const cGrad = item.is_graduation ? 'checked' : '';
        const onChangeAction = (field) => `adminUpdateStatus('${item.member_id}', '${field}', this.checked)`;

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">${item.members.nama}</td>
                <td style="padding: 10px; text-align: center;"><input type="checkbox" ${cCenter} onchange="${onChangeAction('is_center')}"></td>
                <td style="padding: 10px; text-align: center;"><input type="checkbox" ${cShonichi} onchange="${onChangeAction('is_shonichi')}"></td>
                <td style="padding: 10px; text-align: center;"><input type="checkbox" ${cSTS} onchange="${onChangeAction('is_birthday')}"></td>
                <td style="padding: 10px; text-align: center;"><input type="checkbox" ${cGrad} onchange="${onChangeAction('is_graduation')}"></td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="adminHapusMember('${item.member_id}')" style="background:#e53935; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8em;">Hapus</button>
                </td>
            </tr>
        `;
    });
}

async function adminUpdateStatus(memberId, fieldName, isChecked) {
    const { error } = await supabaseClient.from('performing_members')
        .update({ [fieldName]: isChecked }).match({ schedule_id: currentAdminScheduleId, member_id: memberId });
    if (error) alert('Gagal update: ' + error.message); else refreshDetailSaatIni();
}

async function adminTambahMember() {
    const memberId = document.getElementById('admin-select-member').value;
    if (!memberId) return alert('Pilih member dulu!');
    const { error } = await supabaseClient.from('performing_members')
        .insert([{ schedule_id: currentAdminScheduleId, member_id: memberId, blocking: 99 }]); 
    if (error) alert('Gagal tambah: ' + error.message);
    else { await muatDataAdminLineup(); refreshDetailSaatIni(); }
}

async function adminHapusMember(memberId) {
    if (!confirm('Yakin ingin menghapus member ini dari lineup?')) return;
    const { error } = await supabaseClient.from('performing_members').delete().match({ schedule_id: currentAdminScheduleId, member_id: memberId });
    if (error) alert('Gagal hapus: ' + error.message);
    else { await muatDataAdminLineup(); refreshDetailSaatIni(); }
}

function refreshDetailSaatIni() {
    if(currentScheduleData && currentScheduleData.scheduleId) {
        muatDetailJadwal(currentScheduleData.scheduleId, currentScheduleData.judul, currentScheduleData.waktu, currentScheduleData.lokasi, currentScheduleData.tipeJadwal, currentScheduleData.fotoEvent, currentScheduleData.tipeSekunder);
    }
}
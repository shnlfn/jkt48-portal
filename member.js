let dataSemuaMember = []; 

// ============================================================================
// --- FUNGSI ADMIN LOKAL ---
// ============================================================================
let currentAdminMemberId = null;
let currentAdminMemberData = null;

function isLocalhost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
}

async function toggleAdminMember(memberId) {
    const area = document.getElementById('admin-member-area');
    if (area.style.display === 'none') {
        area.style.display = 'block';
        currentAdminMemberId = memberId;
        await muatDataAdminProfil();
        await muatDataAdminHistory();
    } else {
        area.style.display = 'none';
    }
}

async function muatDataAdminProfil() {
    const container = document.getElementById('admin-profil-container');
    container.innerHTML = 'Memuat data profil...';
    
    const { data, error } = await supabaseClient.from('members').select('*').eq('id', currentAdminMemberId).single();
    if (error) return container.innerHTML = '<p style="color:red;">Gagal memuat profil.</p>';
    currentAdminMemberData = data;

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 0.9em; color:#444;">
            <div><label style="font-weight:bold;">Nama Lengkap:</label><input type="text" id="adm-nama-lengkap" value="${data.nama_lengkap || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Nama Panggung:</label><input type="text" id="adm-nama" value="${data.nama || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Panggilan:</label><input type="text" id="adm-panggilan" value="${data.nama_panggilan || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Status (Anggota/Trainee/Graduated dll):</label><input type="text" id="adm-status" value="${data.status || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Team Saat Ini:</label><input type="text" id="adm-team" value="${data.team || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Generasi (Bebas Angka/Teks):</label><input type="text" id="adm-generasi" value="${data.generasi || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Tanggal Lahir:</label><input type="date" id="adm-tgl-lahir" value="${data.tanggal_lahir || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Gol. Darah:</label><input type="text" id="adm-goldar" value="${data.golongan_darah || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Tinggi Badan:</label><input type="text" id="adm-tinggi" value="${data.tinggi_badan || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Tanggal Masuk JKT48:</label><input type="date" id="adm-tgl-masuk" value="${data.tanggal_masuk || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Tanggal Keluar/Grad:</label><input type="date" id="adm-tgl-keluar" value="${data.tanggal_keluar || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div><label style="font-weight:bold;">Alasan Keluar (Misal: Lulus/Resign):</label><input type="text" id="adm-alasan-keluar" value="${data.alasan_keluar || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>
            <div style="grid-column: 1 / -1;"><label style="font-weight:bold;">Catchphrase / Jikoshoukai:</label><textarea id="adm-catchphrase" rows="2" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-family:inherit;">${data.catchphrase || ''}</textarea></div>
        </div>
        <div style="text-align:right; margin-top:15px;">
            <button onclick="adminSimpanProfil()" style="padding: 8px 20px; background: #d81b60; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Simpan Perubahan Profil</button>
        </div>
    `;
}

async function adminSimpanProfil() {
    const payload = {
        nama_lengkap: document.getElementById('adm-nama-lengkap').value,
        nama: document.getElementById('adm-nama').value,
        nama_panggilan: document.getElementById('adm-panggilan').value,
        status: document.getElementById('adm-status').value,
        team: document.getElementById('adm-team').value,
        generasi: document.getElementById('adm-generasi').value,
        tanggal_lahir: document.getElementById('adm-tgl-lahir').value || null,
        golongan_darah: document.getElementById('adm-goldar').value,
        tinggi_badan: document.getElementById('adm-tinggi').value,
        tanggal_masuk: document.getElementById('adm-tgl-masuk').value || null,
        tanggal_keluar: document.getElementById('adm-tgl-keluar').value || null,
        alasan_keluar: document.getElementById('adm-alasan-keluar').value,
        catchphrase: document.getElementById('adm-catchphrase').value
    };

    const { error } = await supabaseClient.from('members').update(payload).eq('id', currentAdminMemberId);
    if (error) alert('Gagal simpan profil: ' + error.message);
    else {
        alert('Profil berhasil diperbarui!');
        muatDetailMemberById(currentAdminMemberId); // Refresh halaman
    }
}

async function muatDataAdminHistory() {
    const container = document.getElementById('admin-history-container');
    container.innerHTML = 'Memuat Team History...';
    
    const { data: history, error } = await supabaseClient.from('member_team_history').select('*, teams(id, nama)').eq('member_id', currentAdminMemberId).order('tanggal_mulai', { ascending: true });
    const { data: allTeams } = await supabaseClient.from('teams').select('id, nama').order('tanggal_dibentuk');

    let teamOptions = '<option value="">-- Pilih Tim --</option>';
    if (allTeams) {
        allTeams.forEach(t => teamOptions += `<option value="${t.id}">${t.nama}</option>`);
    }

    let html = `
        <div style="overflow-x:auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85em; margin-bottom: 15px;">
            <tr style="background: #fce4ec; border-bottom: 2px solid #d81b60; text-align:left;">
                <th style="padding: 8px;">Tim</th>
                <th style="padding: 8px;">Tgl Mulai</th>
                <th style="padding: 8px;">Tgl Selesai</th>
                <th style="padding: 8px;">Status Keluar</th>
                <th style="padding: 8px; text-align:center;">Aksi</th>
            </tr>
    `;

    if (history && history.length > 0) {
        history.forEach(h => {
            let currentTeamOpts = '<option value="">-- Pilih Tim --</option>';
            if(allTeams) {
                allTeams.forEach(t => {
                    let sel = (h.team_id === t.id) ? 'selected' : '';
                    currentTeamOpts += `<option value="${t.id}" ${sel}>${t.nama}</option>`;
                });
            }

            html += `
                <tr style="border-bottom: 1px solid #ccc; background:#fff;">
                    <td style="padding: 6px;"><select id="hist-team-${h.id}" style="width:100%; padding:4px;">${currentTeamOpts}</select></td>
                    <td style="padding: 6px;"><input type="date" id="hist-mulai-${h.id}" value="${h.tanggal_mulai || ''}" style="width:100%; padding:4px;"></td>
                    <td style="padding: 6px;"><input type="date" id="hist-selesai-${h.id}" value="${h.tanggal_selesai || ''}" style="width:100%; padding:4px;"></td>
                    <td style="padding: 6px;"><input type="text" id="hist-status-${h.id}" value="${h.status_keluar || ''}" placeholder="(Transferred/Graduated dll)" style="width:100%; padding:4px;"></td>
                    <td style="padding: 6px; text-align:center;">
                        <button onclick="adminUpdateHistory('${h.id}')" style="background:#28a745; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-bottom:4px; width:60px;">Simpan</button>
                        <button onclick="adminHapusHistory('${h.id}')" style="background:#e53935; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; width:60px;">Hapus</button>
                    </td>
                </tr>
            `;
        });
    } else {
        html += `<tr><td colspan="5" style="text-align:center; padding:15px; color:#888;">Belum ada sejarah tim.</td></tr>`;
    }
    
    html += `
            <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1;">
                <td style="padding: 8px;"><select id="hist-new-team" style="width:100%; padding:4px;">${teamOptions}</select></td>
                <td style="padding: 8px;"><input type="date" id="hist-new-mulai" style="width:100%; padding:4px;"></td>
                <td style="padding: 8px;"><input type="date" id="hist-new-selesai" style="width:100%; padding:4px;"></td>
                <td style="padding: 8px;"><input type="text" id="hist-new-status" placeholder="Transferred/Graduated" style="width:100%; padding:4px;"></td>
                <td style="padding: 8px; text-align:center;">
                    <button onclick="adminTambahHistory()" style="background:#0ea5e9; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">+ Tambah</button>
                </td>
            </tr>
        </table></div>
    `;
    container.innerHTML = html;
}

async function adminUpdateHistory(idHist) {
    const payload = {
        team_id: document.getElementById(`hist-team-${idHist}`).value || null,
        tanggal_mulai: document.getElementById(`hist-mulai-${idHist}`).value || null,
        tanggal_selesai: document.getElementById(`hist-selesai-${idHist}`).value || null,
        status_keluar: document.getElementById(`hist-status-${idHist}`).value || null
    };
    const { error } = await supabaseClient.from('member_team_history').update(payload).eq('id', idHist);
    if(error) alert('Gagal update history: ' + error.message); 
    else { alert('History diperbarui!'); muatDetailMemberById(currentAdminMemberId); }
}

async function adminTambahHistory() {
    const teamId = document.getElementById('hist-new-team').value;
    if (!teamId) return alert('Pilih tim terlebih dahulu!');
    const payload = {
        member_id: currentAdminMemberId,
        team_id: teamId,
        tanggal_mulai: document.getElementById('hist-new-mulai').value || null,
        tanggal_selesai: document.getElementById('hist-new-selesai').value || null,
        status_keluar: document.getElementById('hist-new-status').value || null
    };
    const { error } = await supabaseClient.from('member_team_history').insert([payload]);
    if(error) alert('Gagal tambah history: ' + error.message); 
    else { alert('History ditambahkan!'); muatDetailMemberById(currentAdminMemberId); }
}

async function adminHapusHistory(idHist) {
    if (!confirm('Yakin ingin menghapus baris history ini?')) return;
    const { error } = await supabaseClient.from('member_team_history').delete().eq('id', idHist);
    if(error) alert('Gagal hapus history: ' + error.message); 
    else { alert('History dihapus!'); muatDetailMemberById(currentAdminMemberId); }
}


// ============================================================================
// --- FUNGSI TAMPILAN HALAMAN MEMBER (PUBLIK) ---
// ============================================================================

async function muatDaftarMember() {
    const containerLove = document.getElementById('list-member-love');
    const containerDream = document.getElementById('list-member-dream');
    const containerPassion = document.getElementById('list-member-passion');
    const containerTrainee = document.getElementById('list-member-trainee');
    const containerVirtual = document.getElementById('list-member-virtual');
    const loading = document.getElementById('loading-member');
    
    if(dataSemuaMember.length > 0) { loading.style.display = 'none'; return; }

    const { data, error } = await supabaseClient.from('members').select('*').order('nama', { ascending: true });
    loading.style.display = 'none';
    
    if (error) return containerLove.innerHTML = `<p style="color:red; text-align:center; width: 100%;">Gagal memuat: ${error.message}</p>`;

    dataSemuaMember = data; 
    
    document.getElementById('title-love').style.display = 'block';
    document.getElementById('title-dream').style.display = 'block';
    document.getElementById('title-passion').style.display = 'block';
    document.getElementById('title-trainee').style.display = 'block';
    document.getElementById('title-virtual').style.display = 'block';
    
    data.forEach(member => {
        const statusMember = (member.status || '').toLowerCase();
        const isKeluar = statusMember.includes('graduated') || statusMember.includes('lulus') || statusMember.includes('resign') || statusMember.includes('mengundurkan diri') || statusMember.includes('dismissed') || statusMember.includes('dikeluarkan');
                         
        if (isKeluar) return; 
        
        const namaUtama = member.nama_lengkap || member.nama;
        const namaDuaBaris = formatNamaDuaBaris(namaUtama);
        const namaTim = (member.team || '').toLowerCase();
        
        let activeEvents = [];
        if (isBirthdayToday(member.tanggal_lahir)) activeEvents.push({ name: 'BIRTHDAY', icon: '&#127874;', color1: '#e91e63', color2: '#c2185b', textColor: '#c2185b' });
        if (statusMember.includes('captain') || statusMember.includes('kapten')) activeEvents.push({ name: 'CAPTAIN', icon: '&#127894;&#65039;', color1: '#d4af37', color2: '#b8860b', textColor: '#b8860b' });
        if (statusMember.includes('announced')) activeEvents.push({ name: 'ANNOUNCED', icon: '&#128226;', color1: '#ad8a9e', color2: '#8a667b', textColor: '#ad8a9e' });
        if (statusMember.includes('hiatus')) activeEvents.push({ name: 'HIATUS', icon: '&#9208;&#65039;', color1: '#ff9800', color2: '#e65100', textColor: '#e65100' });
        if (statusMember.includes('suspended')) activeEvents.push({ name: 'SUSPENDED', icon: '&#128683;', color1: '#333333', color2: '#000000', textColor: '#333333' });

        let floatingIcons = ''; let floatBadge = ''; let h3Style = '';

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
        }

        const customColor = getTeamColor(member.team);
        let inlineStyle = customColor ? `background-color: ${customColor};` : `background-color: rgb(196, 120, 120);`;
        
        let badgeClass = 'status-anggota';
        let displayTeks = member.generasi ? `Gen ${String(member.generasi).replace(/\D/g, '')}` : 'Gen ?';
        
        if (namaTim.includes('virtual')) {
            displayTeks = 'Virtual';
        } else if (!namaTim.includes('dream') && !namaTim.includes('love') && !namaTim.includes('passion')) {
            badgeClass = 'status-trainee'; 
        }

        let bottomBadgeHtml = `<div style="margin-top:auto; width:100%;"><span class="status-badge ${badgeClass}" style="${inlineStyle}">${displayTeks}</span></div>`;
        const card = document.createElement('div');
        card.className = 'card-member-mini';
        
        card.onclick = () => tampilkanDetailMemberDariData(member);
        
        let activeBorderColor = customColor || 'rgb(196, 120, 120)';
        let imgStyle = `border: 3px solid ${activeBorderColor}; box-shadow: 0 0 10px ${activeBorderColor}99;`;

        if (activeEvents.length >= 1) {
            imgStyle = `border: 3px solid ${activeEvents[0].color1}; box-shadow: 0 0 10px ${activeEvents[0].color1}99;`;
            if (activeEvents.length >= 2) {
                imgStyle = `border: 3px solid transparent; background: linear-gradient(white, white) padding-box, linear-gradient(135deg, ${activeEvents[0].color1}, ${activeEvents[1].color1}) border-box; box-shadow: 0 0 10px ${activeEvents[0].color1}99;`;
            }
        }

        const imgHtml = generateMemberImageHtml(member, null, null, null, imgStyle);
        card.innerHTML = `
            <div style="position:relative; width:100%; display:flex; justify-content:center;">${floatingIcons}${imgHtml}${floatBadge}</div>
            <h3 style="${h3Style}" title="${namaUtama}">${namaDuaBaris}</h3>
            ${bottomBadgeHtml}
        `;
        
        if (namaTim.includes('love')) containerLove.appendChild(card);
        else if (namaTim.includes('dream')) containerDream.appendChild(card);
        else if (namaTim.includes('passion')) containerPassion.appendChild(card);
        else if (namaTim.includes('virtual')) containerVirtual.appendChild(card);
        else containerTrainee.appendChild(card);
    });
}

async function muatJadwalMember(memberId) {
    const container = document.getElementById('list-member-schedule');
    const loading = document.getElementById('loading-member-schedule');
    if (!container || !loading) return;

    try {
        const now = new Date().toISOString();
        const { data, error } = await supabaseClient.from('performing_members')
            .select(`is_birthday, is_graduation, theater_schedules!inner ( id, judul_show, tanggal_waktu, tipe_jadwal, tipe_jadwal_sekunder, lokasi, foto_event, team, is_shonichi )`)
            .eq('member_id', memberId)
            .gte('theater_schedules.tanggal_waktu', now);

        loading.style.display = 'none';
        if (error) throw error;
        if (!data || data.length === 0) return container.innerHTML = `<p style="text-align:center; color:#999; font-style:italic; font-size: 0.9em;">Belum ada jadwal terdekat untuk member ini.</p>`;

        let schedules = data.map(item => ({ ...item.theater_schedules, is_sts_member: item.is_birthday, is_grad_member: item.is_graduation }));
        schedules.sort((a, b) => new Date(a.tanggal_waktu) - new Date(b.tanggal_waktu));

        schedules.forEach(jadwal => {
            const tgl = new Date(jadwal.tanggal_waktu);
            const formatTanggal = tgl.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const formatJam = tgl.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }).replace('.', ':') + ' WIB';
            const formatWaktu = `${formatTanggal} | Pukul ${formatJam}`;

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

            if (jadwal.is_shonichi) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #00bcd4;">SHONICHI</span>`;
            if (jadwal.is_sts_member || judulLower.includes('seitansai') || judulLower.includes('birthday') || judulLower.includes('ulang tahun')) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #4caf50;">BIRTHDAY</span>`;
            if (jadwal.is_grad_member || judulLower.includes('graduation') || judulLower.includes('last show') || judulLower.includes('kelulusan')) badgesHtml += `<span class="badge-tipe-jadwal" style="background-color: #e53935;">GRADUATION</span>`;

            const div = document.createElement('div');
            div.className = 'list-item';
            div.style.borderLeftColor = warnaUtama; 
            div.style.padding = '15px'; 
            
            div.onclick = () => muatDetailJadwal(jadwal.id, judul, formatWaktu, jadwal.lokasi, tipeJadwal, jadwal.foto_event, tipeSekunder);
            
            div.innerHTML = `
                <div>
                    <div class="list-subtitle" style="margin-bottom: 5px; flex-wrap: wrap; gap: 3px;">${badgesHtml}</div>
                    <h3 class="list-title" style="color: ${warnaUtama}; font-size: 1.2em; margin: 0 0 5px 0;">${judul}</h3>
                    <div style="font-size: 0.85em; color: #666; font-weight: bold;">${formatWaktu}</div>
                </div>
                <div style="color: ${warnaUtama}; font-size: 24px;">&#10140;</div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        loading.style.display = 'none';
        container.innerHTML = `<p style="color:red; text-align:center; font-size: 0.85em;">Gagal memuat jadwal: ${err.message}</p>`;
    }
}

async function muatHistoryMember(memberId) {
    const container = document.getElementById('list-member-history');
    const loading = document.getElementById('loading-member-history');
    if (!container || !loading) return;

    try {
        const { data, error } = await supabaseClient.from('member_team_history').select(`*, teams(nama)`).eq('member_id', memberId).order('tanggal_mulai', { ascending: true });
        loading.style.display = 'none';
        if (error) throw error;
        if (!data || data.length === 0) return container.innerHTML = `<p style="text-align:center; color:#999; font-style:italic; font-size: 0.9em;">Data riwayat tim belum tersedia.</p>`;

        let historyHtml = '<div class="grid-team-history">';
        data.forEach(h => {
            const tglMulai = h.tanggal_mulai ? h.tanggal_mulai.split('-')[0] : '';
            const tglSelesai = h.tanggal_selesai ? h.tanggal_selesai.split('-')[0] : 'Sekarang';
            const namaTim = h.teams ? h.teams.nama : (h.catatan && h.catatan.includes('Academy') ? 'Academy' : 'JKT48');
            
            const namaFormatTim = namaTim.toLowerCase().replace(/\s+/g, '_');
            const imgTimSrc = `images/teams/${namaFormatTim}.jpg`;
            
            let statusClass = 'status-active-team'; let statusText = 'Active';
            if (h.status_keluar === 'Transferred') { statusClass = 'status-history-transferred'; statusText = 'Transferred'; }
            else if (h.status_keluar === 'Graduated' || h.status_keluar === 'Resigned' || h.status_keluar === 'Dismissed' || h.status_keluar === 'Canceled') { statusClass = 'status-history-graduated'; statusText = h.status_keluar; }
            else if (h.tanggal_selesai) { statusClass = 'status-history-transferred'; statusText = 'Moved'; }

            let aksiKlik = h.team_id ? `onclick="klikTimDariHistory('${h.team_id}')" style="cursor: pointer;" title="Lihat profil ${namaTim}"` : `style="cursor: default;"`;

            historyHtml += `
                <div class="card-team-history" ${aksiKlik}>
                    <img src="${imgTimSrc}" onerror="this.onerror=null; this.src='favicon.png';">
                    <h4>${namaTim}</h4>
                    <p>${tglMulai} - ${tglSelesai}</p>
                    <div class="status-label ${statusClass}">${statusText}</div>
                </div>
            `;
        });
        historyHtml += '</div>';
        container.innerHTML = historyHtml;
    } catch (err) {
        loading.style.display = 'none';
        container.innerHTML = `<p style="color:red; text-align:center; font-size: 0.85em;">Gagal memuat riwayat: ${err.message}</p>`;
    }
}

async function klikTimDariHistory(teamId) {
    if (!teamId) return;
    if (typeof dataSemuaTeam !== 'undefined' && dataSemuaTeam.length === 0) {
        if(typeof muatDaftarTeam === 'function') await muatDaftarTeam(); 
    }
    if(typeof muatDetailTeam === 'function') {
        muatDetailTeam(teamId);
        window.scrollTo(0, 0);
    }
}

async function muatSenbatsuMember(memberId) {
    const container = document.getElementById('list-member-senbatsu');
    const loading = document.getElementById('loading-member-senbatsu');
    if (!container || !loading) return;

    try {
        const { data, error } = await supabaseClient.from('album_performing_members')
            .select(`is_center, albums ( id, judul_album, judul_jepang, cover_url, tipe_album, nomor_single, tanggal_rilis )`)
            .eq('member_id', memberId);

        loading.style.display = 'none';
        if (error) throw error;

        let validAlbums = data.filter(item => item && item.albums).map(item => ({...item.albums, is_center: item.is_center}));
        validAlbums.sort((a, b) => new Date(b.tanggal_rilis) - new Date(a.tanggal_rilis));

        if (validAlbums.length === 0) return container.innerHTML = `<p style="text-align:center; color:#999; font-style:italic; font-size: 0.9em;">Belum ada data partisipasi senbatsu/setlist.</p>`;

        container.innerHTML = ''; container.className = ''; 

        const groups = [ { id: 'Single', title: 'Single' }, { id: 'Digital Single', title: 'Digital Single' }, { id: 'Setlist', title: 'Setlist / Album' } ];
        let hasAnyRendered = false;

        groups.forEach(group => {
            let albumsInGroup = [];
            if (group.id === 'Setlist') albumsInGroup = validAlbums.filter(a => a.tipe_album === 'Setlist' || a.tipe_album === 'Album' || a.tipe_album === 'Project');
            else albumsInGroup = validAlbums.filter(a => a.tipe_album === group.id);

            if (albumsInGroup.length > 0) {
                hasAnyRendered = true;
                const header = document.createElement('h4');
                header.style.textAlign = 'center'; header.style.color = '#666'; header.style.fontSize = '0.9em';
                header.style.marginTop = '25px'; header.style.marginBottom = '15px';
                header.style.textTransform = 'uppercase'; header.style.letterSpacing = '1px';
                header.innerText = group.title;
                container.appendChild(header);

                const grid = document.createElement('div');
                grid.className = 'grid-senbatsu-mini';
                
                albumsInGroup.forEach(album => {
                    const div = document.createElement('div');
                    div.className = 'card-senbatsu-mini';
                    
                    div.onclick = () => muatDaftarLaguDiAlbum(album.id, album.judul_album, album.judul_jepang, album.cover_url, album.tipe_album, album.nomor_single);
                    
                    const crown = album.is_center ? `<div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); font-size:1.5em; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5)); z-index:2;">&#128081;</div>` : '';
                    const coverUrl = album.cover_url || 'favicon.png';

                    div.innerHTML = `
                        <div style="position:relative; display:inline-block;">
                            ${crown}
                            <img src="${coverUrl}" onerror="this.onerror=null; this.src='favicon.png'; this.style.backgroundColor='#d81b60';" alt="${album.judul_album}">
                        </div>
                        <p title="${album.judul_album}">${album.judul_album}</p>
                    `;
                    grid.appendChild(div);
                });
                container.appendChild(grid);
            }
        });
        if (!hasAnyRendered) container.innerHTML = `<p style="text-align:center; color:#999; font-style:italic; font-size: 0.9em;">Belum ada data partisipasi senbatsu/setlist.</p>`;
    } catch (err) {
        loading.style.display = 'none';
        container.innerHTML = `<p style="color:red; text-align:center; font-size: 0.85em;">Gagal memuat partisipasi: ${err.message}</p>`;
    }
}

function tampilkanDetailMemberDariData(member) {
    bukaHalaman('view-member-detail');
    const container = document.getElementById('info-detail-member');
    const infoStatus = getFormatStatusMember(member.status); 
    
    const statusMember = (member.status || '').toLowerCase();
    const isGraduated = statusMember.includes('graduated') || statusMember.includes('lulus') || statusMember.includes('resign') || statusMember.includes('mengundurkan diri') || statusMember.includes('dismissed') || statusMember.includes('dikeluarkan');
    
    // PANEL ADMIN LOKAL DI-SUNTIKKAN KE SINI
    let adminPanelHtml = '';
    if (isLocalhost()) {
        adminPanelHtml = `
            <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px dashed #d81b60; padding-bottom: 20px;">
                <button onclick="toggleAdminMember('${member.id}')" style="background: #333; color: white; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 2px solid #d81b60; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">&#9881;&#65039; Edit Profil & History (Mode Admin)</button>
            </div>
            <div id="admin-member-area" style="display: none; background: #fff; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 2px solid #d81b60; box-shadow: 0 5px 15px rgba(216, 27, 96, 0.15); text-align: left;">
                <h3 style="color: #d81b60; text-align: center; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">&#128100; Edit Profil Member</h3>
                <div id="admin-profil-container">Memuat data profil...</div>
                
                <h3 style="color: #d81b60; text-align: center; margin-top: 35px; border-bottom: 1px solid #eee; padding-bottom: 10px;">&#128214; Edit Team History</h3>
                <div id="admin-history-container">Memuat data history...</div>
            </div>
        `;
    }

    let memberSosmedHtml = '';
    if (member.twitter || member.instagram || member.tiktok || member.threads || member.showroom || member.idn_live) {
        memberSosmedHtml += `<div style="display:flex; gap:12px; justify-content:center; margin-bottom: 25px; flex-wrap: wrap;">`;
        if(member.twitter) memberSosmedHtml += `<a href="${member.twitter}" target="_blank" class="icon-social bg-x" title="X / Twitter"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg" alt="X"></a>`;
        if(member.instagram) memberSosmedHtml += `<a href="${member.instagram}" target="_blank" class="icon-social bg-ig" title="Instagram"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg" alt="IG"></a>`;
        if(member.tiktok) memberSosmedHtml += `<a href="${member.tiktok}" target="_blank" class="icon-social bg-tt" title="TikTok"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/tiktok.svg" alt="TikTok"></a>`;
        if(member.threads) memberSosmedHtml += `<a href="${member.threads}" target="_blank" class="icon-social bg-threads" title="Threads"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/threads.svg" alt="Threads"></a>`;
        if(member.showroom) memberSosmedHtml += `<a href="${member.showroom}" target="_blank" class="icon-social" title="Showroom"><img src="https://www.google.com/s2/favicons?domain=showroom-live.com&sz=128" class="img-native" alt="SR"></a>`;
        if(member.idn_live) memberSosmedHtml += `<a href="${member.idn_live}" target="_blank" class="icon-social" title="IDN Live"><img src="https://www.google.com/s2/favicons?domain=idn.app&sz=128" class="img-native" alt="IDN"></a>`;
        memberSosmedHtml += `</div>`;
    }

    let fanbaseSosmedHtml = '';
    if (member.fanbase_twitter || member.fanbase_instagram || member.fanbase_tiktok || member.fanbase_linktree) {
        if(member.fanbase_twitter) fanbaseSosmedHtml += `<a href="${member.fanbase_twitter}" target="_blank" class="icon-social small bg-x" title="Fanbase Twitter / X"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg" alt="X"></a>`;
        if(member.fanbase_instagram) fanbaseSosmedHtml += `<a href="${member.fanbase_instagram}" target="_blank" class="icon-social small bg-ig" title="Fanbase Instagram"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg" alt="IG"></a>`;
        if(member.fanbase_tiktok) fanbaseSosmedHtml += `<a href="${member.fanbase_tiktok}" target="_blank" class="icon-social small bg-tt" title="Fanbase TikTok"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/tiktok.svg" alt="TikTok"></a>`;
        if(member.fanbase_linktree) fanbaseSosmedHtml += `<a href="${member.fanbase_linktree}" target="_blank" class="icon-social small bg-linktree" title="Fanbase Linktree"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/linktree.svg" alt="Linktree"></a>`;
    }

    let badgesHtml = '';
    badgesHtml += `<span class="status-badge ${infoStatus.kelas}">${infoStatus.teks}</span>`;
    if (member.team && !isGraduated) {
        const customColor = getTeamColor(member.team);
        let inlineStyle = customColor ? `background-color: ${customColor};` : `background-color: rgb(196, 120, 120);`;
        if (!(infoStatus.teks === 'Trainee' && member.team.toLowerCase().includes('trainee'))) badgesHtml += `<span class="status-badge" style="${inlineStyle}">${member.team}</span>`;
    }
    if (member.generasi) {
        const angkaGen = String(member.generasi).replace(/\D/g, ''); 
        badgesHtml += `<span class="status-badge" style="background-color: #9c27b0;">Gen ${angkaGen}</span>`;
    }
    if (isBirthdayToday(member.tanggal_lahir)) badgesHtml += `<span class="status-badge" style="background-color: #e91e63; font-size: 0.85em; box-shadow: 0 0 10px rgba(233, 30, 99, 0.4);">&#127874; HAPPY BIRTHDAY!</span>`;

    let catchphraseHtml = '';
    if (member.catchphrase && member.catchphrase.trim() !== '') catchphraseHtml = `<div class="catchphrase-box">"${member.catchphrase}"</div>`;

    let jadwalMendatangHtml = '';
    if (!isGraduated) {
        jadwalMendatangHtml = `
            <div style="margin-top: 45px; margin-bottom: 10px;">
                <hr style="border: 0; height: 1px; background: #ddd; margin: 0 auto 20px auto;">
                <h3 style="text-align:center; color:#d81b60; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px; font-size: 1em;">Jadwal Mendatang</h3>
                <div id="loading-member-schedule" style="text-align: center; font-size: 0.85em; color:#666;">Memuat jadwal...</div>
                <div class="list-container" id="list-member-schedule"></div>
            </div>
        `;
    }
    
    let tanggalMasukHtml = member.tanggal_masuk ? `<p><strong>Tanggal Masuk JKT48:</strong> ${formatTanggalIndo(member.tanggal_masuk)}</p>` : '';
    let tanggalKeluarHtml = '';
    if (member.tanggal_keluar) {
        let alasan = member.alasan_keluar ? ` (${member.alasan_keluar})` : '';
        tanggalKeluarHtml = `<p><strong>Tanggal Keluar:</strong> ${formatTanggalIndo(member.tanggal_keluar)} <span style="color:#d32f2f; font-weight:bold; font-size:0.9em;">${alasan}</span></p>`;
    }

    const imgHtml = generateMemberImageHtml(member, null, null, null, '', 'foto-profil');

    container.innerHTML = `
        ${adminPanelHtml}
        ${imgHtml}
        <h2 style="margin-top:0; margin-bottom: 8px;">${member.nama_lengkap || member.nama}</h2>
        <div style="text-align:center; margin-bottom:15px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">${badgesHtml}</div>
        ${memberSosmedHtml}
        ${catchphraseHtml}
        <div style="display:flex; align-items:center; flex-wrap:wrap; border-bottom: 1px solid #eee; padding-bottom: 5px; margin: 10px 0;">
            <strong style="margin-right: 5px;">Nama Fanbase:</strong> <span style="color:#d81b60; font-weight:bold; margin-right: 5px;">${member.nama_fanbase || '-'}</span>${fanbaseSosmedHtml}
        </div>
        <p><strong>Nama Panggilan:</strong> ${member.nama_panggilan || '-'}</p>
        <p><strong>Tanggal Lahir:</strong> ${member.tanggal_lahir || '-'}</p>
        <p><strong>Gol. Darah:</strong> ${member.golongan_darah || '-'}</p>
        <p><strong>Horoskop:</strong> ${member.horoskop || '-'}</p>
        <p><strong>Tinggi Badan:</strong> ${member.tinggi_badan || '-'}</p>
        ${tanggalMasukHtml}
        ${tanggalKeluarHtml}

        <div style="margin-top: 35px; margin-bottom: 20px;">
            <hr style="border: 0; height: 1px; background: #ddd; margin: 0 auto 20px auto;">
            <h3 style="text-align:center; color:#d81b60; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px; font-size: 1em;">&#128214; Team History</h3>
            <div id="loading-member-history" style="text-align: center; font-size: 0.85em; color:#666;">Memuat riwayat...</div>
            <div id="list-member-history"></div>
        </div>
        ${jadwalMendatangHtml}
        <div style="margin-top: 45px; margin-bottom: 20px;">
            <hr style="border: 0; height: 1px; background: #ddd; margin: 0 auto 20px auto;">
            <h3 style="text-align:center; color:#d81b60; margin-bottom:5px; text-transform:uppercase; letter-spacing:1px; font-size: 1em;">Senbatsu Participation</h3>
            <div id="loading-member-senbatsu" style="text-align: center; font-size: 0.85em; color:#666;">Memuat partisipasi...</div>
            <div id="list-member-senbatsu"></div>
        </div>
    `;

    muatHistoryMember(member.id);
    if (!isGraduated) muatJadwalMember(member.id);
    muatSenbatsuMember(member.id);
}

async function muatDetailMemberById(memberId) {
    bukaHalaman('view-member-detail');
    document.getElementById('info-detail-member').innerHTML = `<p style="text-align:center;">Memuat profil...</p>`;
    const { data } = await supabaseClient.from('members').select('*').eq('id', memberId).single();
    if (data) tampilkanDetailMemberDariData(data);
}
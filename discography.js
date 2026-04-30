let dataSemuaAlbum = [];
let currentEditAlbumId = null; 
window.mapLaguMasterCari = {}; 
window.currentAdminSongId = null; // Menyimpan ID lagu yang sedang diedit
window.allMembersCache = []; // Cache daftar member untuk dropdown

// ============================================================================
// 1. DAFTAR ALBUM / DISKOGRAFI UTAMA
// ============================================================================
async function muatDaftarAlbum() {
    const container = document.getElementById('list-albums');
    const loading = document.getElementById('loading-albums');
    const adminArea = document.getElementById('admin-album-area');
    
    if (typeof isLocalhost === 'function' && isLocalhost()) {
        if(adminArea) adminArea.style.display = 'block';
    } else {
        if(adminArea) adminArea.style.display = 'none';
    }
    
    loading.style.display = 'block';
    const { data, error } = await supabaseClient.from('albums').select('*').order('tanggal_rilis', { ascending: false, nullsFirst: false });
    loading.style.display = 'none';
    
    if (error) return container.innerHTML = `<p style="color:red;">Gagal memuat: ${error.message}</p>`;
    dataSemuaAlbum = data; 
    
    terapkanFilterAlbum(); 
}

function terapkanFilterAlbum() {
    const filterEl = document.getElementById('filter-tipe-album');
    const tipeTerpilih = filterEl ? filterEl.value : 'Semua';
    
    if (tipeTerpilih === 'Semua') renderAlbumKeLayar(dataSemuaAlbum);
    else renderAlbumKeLayar(dataSemuaAlbum.filter(album => album.tipe_album === tipeTerpilih));
}

function renderAlbumKeLayar(dataAlbum) {
    const container = document.getElementById('list-albums');
    container.innerHTML = '';
    if (dataAlbum.length === 0) return container.innerHTML = `<p style="text-align:center; width:100%; grid-column: 1 / -1; color:#666;">Belum ada diskografi untuk tipe ini.</p>`;
    
    const isLokal = (typeof isLocalhost === 'function' && isLocalhost());

    dataAlbum.forEach(album => {
        const cover = album.cover_url || 'favicon.png'; 
        let warnaBadgeTipe = 'status-setlist';
        if (album.tipe_album === 'Single') warnaBadgeTipe = 'status-single';
        else if (album.tipe_album === 'Digital Single') warnaBadgeTipe = 'status-digital-single';
        else if (album.tipe_album === 'Album') warnaBadgeTipe = 'status-album';

        let badgeKategoriHtml = album.kategori_album ? `<span class="status-badge status-kategori">${album.kategori_album.toUpperCase()}</span>` : '';
        let judulJepangHtml = album.judul_jepang ? `<div style="font-size: 0.85em; color: #888; margin-bottom: 5px;">${album.judul_jepang}</div>` : '';
        const tanggalRilisFormat = formatTanggalIndo(album.tanggal_rilis);

        let adminButtons = '';
        if (isLokal) {
            const safeJudul = album.judul_album.replace(/'/g, "\\'");
            const safeTipe = album.tipe_album ? album.tipe_album.replace(/'/g, "\\'") : 'Single';
            const safeTgl = album.tanggal_rilis || '';
            const safeCover = album.cover_url ? album.cover_url.replace(/'/g, "\\'") : '';
            const safeHeader = album.header_url ? album.header_url.replace(/'/g, "\\'") : '';

            adminButtons = `
                <div style="margin-top: 10px; display:flex; gap:5px; justify-content:center;">
                    <button onclick="adminEditAlbum(event, '${album.id}', '${safeJudul}', '${safeTipe}', '${safeTgl}', '${safeCover}', '${safeHeader}')" style="background:#ff9800; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8em; font-weight:bold;">Ubah</button>
                    <button onclick="adminHapusAlbum(event, '${album.id}')" style="background:#e53935; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8em; font-weight:bold;">Hapus</button>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'card-album';
        card.onclick = () => muatDaftarLaguDiAlbum(album.id, album.judul_album, album.judul_jepang, cover, album.tipe_album, album.nomor_single);
        
        card.innerHTML = `
            <img src="${cover}" onerror="this.onerror=null; this.src='favicon.png'; this.style.backgroundColor='#d81b60';" alt="${album.judul_album}">
            <h3 style="margin-bottom: 2px;">${album.judul_album}</h3>
            ${judulJepangHtml}
            <div class="album-date">${tanggalRilisFormat}</div>
            <div class="album-badges">
                <span class="status-badge ${warnaBadgeTipe}">${album.tipe_album || 'Setlist'}</span>
                ${badgeKategoriHtml}
            </div>
            ${adminButtons}
        `;
        container.appendChild(card);
    });
}

// ============================================================================
// 2. ADMIN LOKAL: CRUD ALBUM
// ============================================================================
window.adminEditAlbum = function(e, id, judul, tipe, tgl, cover, header) {
    e.stopPropagation(); 
    currentEditAlbumId = id;
    
    document.getElementById('adm-alb-judul').value = judul;
    document.getElementById('adm-alb-tipe').value = tipe;
    document.getElementById('adm-alb-tgl').value = tgl;
    document.getElementById('adm-alb-cover').value = cover;
    document.getElementById('adm-alb-header').value = header;
    
    const btnSimpan = document.querySelector('#admin-album-area button');
    if(btnSimpan) {
        btnSimpan.innerText = 'Simpan Perubahan';
        btnSimpan.style.background = '#ff9800';
    }
    
    window.scrollTo(0, document.getElementById('admin-album-area').offsetTop - 20);
};

window.adminBatalEditAlbum = function() {
    currentEditAlbumId = null;
    ['adm-alb-judul','adm-alb-tgl','adm-alb-cover','adm-alb-header'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('adm-alb-tipe').value = 'Single';
    
    const btnSimpan = document.querySelector('#admin-album-area button');
    if(btnSimpan) {
        btnSimpan.innerText = 'Simpan Data';
        btnSimpan.style.background = '#d81b60';
    }
};

window.adminSimpanAlbum = async function() {
    const payload = {
        judul_album: document.getElementById('adm-alb-judul').value,
        tipe_album: document.getElementById('adm-alb-tipe').value,
        tanggal_rilis: document.getElementById('adm-alb-tgl').value || null,
        cover_url: document.getElementById('adm-alb-cover').value || null,
        header_url: document.getElementById('adm-alb-header').value || null
    };

    if(!payload.judul_album) return alert('Judul Album/Single wajib diisi!');

    if (currentEditAlbumId) {
        const { error } = await supabaseClient.from('albums').update(payload).eq('id', currentEditAlbumId);
        if(error) alert('Gagal mengubah data: ' + error.message);
        else { alert('Album diperbarui!'); adminBatalEditAlbum(); muatDaftarAlbum(); }
    } else {
        const { error } = await supabaseClient.from('albums').insert([payload]);
        if(error) alert('Gagal menambah data: ' + error.message);
        else { alert('Album ditambahkan!'); adminBatalEditAlbum(); muatDaftarAlbum(); }
    }
};

window.adminHapusAlbum = async function(e, id) {
    e.stopPropagation();
    if(!confirm('YAKIN INGIN MENGHAPUS ALBUM INI?\n\nPeringatan: Semua lagu yang ada di tracklist akan kehilangan induknya!')) return;
    const { error } = await supabaseClient.from('albums').delete().eq('id', id);
    if(error) alert('Gagal menghapus: ' + error.message); else muatDaftarAlbum();
};

// ============================================================================
// 3. DETAIL ALBUM & TRACKLIST
// ============================================================================
async function muatDaftarLaguDiAlbum(albumId, judulAlbum, judulJepang, coverUrl, tipeAlbum, nomorSingle) {
    bukaHalaman('view-album-detail');
    document.getElementById('detail-judul-album').innerText = judulAlbum;
    
    const elJudulJepang = document.getElementById('detail-judul-jepang');
    if (judulJepang) { elJudulJepang.innerText = judulJepang; elJudulJepang.style.display = 'block'; } 
    else elJudulJepang.style.display = 'none';
    
    const elCover = document.getElementById('detail-cover-album');
    const elHeader = document.getElementById('detail-header-single');

    if (tipeAlbum === 'Single' && nomorSingle) {
        elCover.style.display = 'none'; elHeader.style.display = 'block';
        elHeader.onerror = function() { this.style.display = 'none'; elCover.style.display = 'block'; elCover.src = coverUrl; };
        elHeader.src = `images/single/${nomorSingle}/header.jpg`;
    } else {
        elHeader.style.display = 'none'; elCover.style.display = 'block'; elCover.src = coverUrl;
    }
    
    // Tampilkan Form Admin Tracklist jika Localhost
    const adminSongArea = document.getElementById('admin-song-area');
    if (typeof isLocalhost === 'function' && isLocalhost()) {
        window.currentAdminAlbumId = albumId;
        
        // Injeksi Form Lanjutan & Panel Member (Lagu + Album Member)
        adminSongArea.innerHTML = `
            <h4 style="color: #004080; margin-top: 0; margin-bottom: 10px;">&#9881;&#65039; Mode Admin: Tambah/Ubah Lagu</h4>
            <input type="hidden" id="adm-trk-id">
            
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
                <input type="number" id="adm-trk-no" placeholder="Track" style="width:80px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                <input list="adm-lagu-master-list" id="adm-trk-judul" placeholder="Cari / Ketik Judul Lagu..." style="flex:1; min-width:200px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                <datalist id="adm-lagu-master-list"></datalist>
                <select id="adm-trk-tipe" style="padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <option value="">-- Tipe Lagu --</option>
                    <option value="Unit">Unit</option>
                    <option value="Solo">Solo</option>
                    <option value="Instrumental">Instrumental</option>
                </select>
            </div>
            
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:15px;">
                <input type="text" id="adm-trk-dibawakan" placeholder="Dibawakan Oleh (Misal: Senbatsu, Undergirls)" style="flex:1; min-width:200px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                
                <label style="display:flex; align-items:center; gap:5px; font-weight:bold; color:#e53935; cursor:pointer;">
                    <input type="checkbox" id="adm-trk-title"> Title Track
                </label>
                
                <button id="btn-submit-trk" onclick="adminSimpanLaguKeAlbum()" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Simpan Track</button>
                <button id="btn-cancel-trk" onclick="adminBatalEditLaguAlbum()" style="display:none; padding: 8px 15px; background: #666; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Batal</button>
            </div>
            
            <p style="margin:0; font-size:0.75em; color:#666; font-style:italic;">*Sistem otomatis membuat Master Lagu baru jika judul yang diketik belum ada.</p>

            <div id="admin-song-member-area" style="display:none; margin-top:20px; padding-top:15px; border-top:2px dashed #ccc;">
                <h5 style="color:#d81b60; margin-top:0; margin-bottom:10px;">&#128101; Recording Members (Lagu): <span id="adm-song-title-label" style="color:#333;"></span></h5>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input list="adm-song-member-list" id="adm-song-member-input" placeholder="Ketik Nama Member (Pisahkan dengan Koma)..." style="padding:8px; flex:1; border-radius:4px; border:1px solid #ccc;">
                    <datalist id="adm-song-member-list"></datalist>
                    <button onclick="adminTambahMemberLagu()" style="background:#004080; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer;">+ Tambah Sekaligus</button>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.85em; text-align:left;">
                        <thead>
                            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
                                <th style="padding:8px;">Nama Member</th>
                                <th style="padding:8px; text-align:center;">Center</th>
                                <th style="padding:8px; text-align:center;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="adm-song-member-tbody"></tbody>
                    </table>
                </div>
            </div>

            <div id="admin-album-member-area" style="margin-top:25px; padding:15px; background:#fdf2f8; border:1px dashed #d81b60; border-radius:8px;">
                <h4 style="color: #d81b60; margin-top: 0; margin-bottom: 10px;">&#127894;&#65039; Recording Members (Level Album / Senbatsu)</h4>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input list="adm-song-member-list" id="adm-album-member-input" placeholder="Ketik Nama Member (Bisa banyak, pisahkan dengan koma)..." style="padding:8px; flex:1; border-radius:4px; border:1px solid #ccc;">
                    <button onclick="adminTambahMemberAlbum()" style="background:#d81b60; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer;">+ Tambah Sekaligus</button>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.85em; text-align:left; background:white;">
                        <thead>
                            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
                                <th style="padding:8px;">Nama Member</th>
                                <th style="padding:8px; text-align:center;">Center</th>
                                <th style="padding:8px; text-align:center;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="adm-album-member-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        adminSongArea.style.display = 'block';

        // Load Datalist Lagu & Cache Member (Menambahkan nama_panggilan untuk pencarian ekstra pintar)
        const [{ data: listLagu }, { data: listMember }] = await Promise.all([
            supabaseClient.from('songs').select('id, judul_lagu').order('judul_lagu'),
            supabaseClient.from('members').select('id, nama, nama_panggilan').order('nama')
        ]);

        const dl = document.getElementById('adm-lagu-master-list');
        const dlMem = document.getElementById('adm-song-member-list');
        
        if (dl && listLagu) {
            dl.innerHTML = ''; window.mapLaguMasterCari = {};
            listLagu.forEach(lg => { window.mapLaguMasterCari[lg.judul_lagu.trim().toLowerCase()] = lg.id; dl.innerHTML += `<option value="${lg.judul_lagu}">`; });
        }
        if (listMember) {
            window.allMembersCache = listMember;
            if (dlMem) {
                dlMem.innerHTML = '';
                listMember.forEach(m => dlMem.innerHTML += `<option value="${m.nama}">`);
            }
        }
        
        muatDataAdminMemberAlbum(); // Muat data senbatsu album

    } else {
        if(adminSongArea) adminSongArea.style.display = 'none';
    }
    
    // Render Senbatsu Album (Public View)
    const containerMembers = document.getElementById('list-album-members');
    const loadingMembers = document.getElementById('loading-album-members');
    const garisPemisah = document.getElementById('garis-pemisah-album');
    const teksAlbumMembers = document.getElementById('teks-album-members');
    
    containerMembers.innerHTML = ''; garisPemisah.style.display = 'none'; teksAlbumMembers.style.display = 'none'; loadingMembers.style.display = 'block';

    const { data: dataMembers } = await supabaseClient.from('album_performing_members')
        .select('is_center, blocking, members(id, nama, nama_panggilan, status, generasi)')
        .eq('album_id', albumId).order('blocking', { ascending: true, nullsFirst: false }).order('is_center', { ascending: false }); 

    loadingMembers.style.display = 'none';
    if (dataMembers && dataMembers.length > 0) {
        let validDataMembers = dataMembers.filter(item => item && item.members);
        if (validDataMembers.length > 0) teksAlbumMembers.style.display = 'block';
        garisPemisah.style.display = 'block'; 
        
        validDataMembers.forEach(item => {
            const m = item.members;
            const div = document.createElement('div');
            div.className = item.is_center ? 'album-member-small is-center' : 'album-member-small';
            div.onclick = () => muatDetailMemberById(m.id);
            const namaPendek = m.nama_panggilan || m.nama.split(' ')[0];
            const crownHtml = item.is_center ? `<div class="center-crown">&#128081;</div><div class="center-badge">CENTER</div>` : '';
            const imgHtml = generateMemberImageHtml(m, judulAlbum, tipeAlbum, nomorSingle, '');
            div.innerHTML = `${crownHtml}${imgHtml}<p>${namaPendek}</p>`;
            containerMembers.appendChild(div);
        });
    }

    const containerSongs = document.getElementById('list-songs-in-album');
    const loadingSongs = document.getElementById('loading-songs-in-album');
    containerSongs.innerHTML = ''; loadingSongs.style.display = 'block';

    const { data: dataSongs, error: errSongs } = await supabaseClient.from('songs')
        .select('id, judul_lagu, tipe_lagu, track_number, tipe_dibawakan, is_title_track')
        .eq('album_id', albumId)
        .order('track_number', { ascending: true, nullsFirst: false }).order('id', { ascending: true }); 
    
    loadingSongs.style.display = 'none';
    if (errSongs) return containerSongs.innerHTML = `<p style="color:red;">Gagal memuat lagu: ${errSongs.message}</p>`;

    dataSongs.forEach((lagu, index) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.onclick = () => muatDetailLagu(lagu.id, 'view-album-detail');
        
        const tampilanTrack = lagu.track_number ? `Track ${lagu.track_number}` : `Track ${index + 1}`;
        const badgeTipeLagu = lagu.tipe_lagu ? `<span class="badge-tipe-lagu">${lagu.tipe_lagu}</span>` : '';
        const isInstrumentalLagu = lagu.tipe_lagu && lagu.tipe_lagu.toLowerCase() === 'instrumental';
        
        let badgeTipeDibawakan = '';
        if (!isInstrumentalLagu && lagu.tipe_dibawakan) badgeTipeDibawakan = `<span class="badge-tipe-bawa">${lagu.tipe_dibawakan}</span>`;
        
        let badgeTitleTrack = lagu.is_title_track ? `<span style="background:#e53935; color:white; font-size:0.7em; padding:2px 6px; border-radius:3px; margin-left:8px; font-weight:bold;">&#128081; TITLE TRACK</span>` : '';

        let adminActions = '';
        if (typeof isLocalhost === 'function' && isLocalhost()) {
            const sJudul = lagu.judul_lagu.replace(/'/g, "\\'");
            const sTipe = lagu.tipe_lagu ? lagu.tipe_lagu.replace(/'/g, "\\'") : '';
            const sBawa = lagu.tipe_dibawakan ? lagu.tipe_dibawakan.replace(/'/g, "\\'") : '';
            const isTitle = lagu.is_title_track ? 'true' : 'false';

            adminActions = `
                <button onclick="adminEditLaguAlbum(event, '${lagu.id}', '${lagu.track_number||''}', '${sJudul}', '${sTipe}', '${sBawa}', ${isTitle})" style="background:#ff9800; color:white; border:none; padding:2px 8px; border-radius:4px; font-size:0.7em; cursor:pointer; margin-left:10px;">Ubah</button>
                <button onclick="adminHapusLaguDariAlbum(event, '${lagu.id}')" style="background:#e53935; color:white; border:none; padding:2px 8px; border-radius:4px; font-size:0.7em; cursor:pointer; margin-left:5px;">Keluarkan</button>
            `;
        }

        div.innerHTML = `
            <div>
                <div class="list-subtitle">&#127925; ${tampilanTrack} ${badgeTipeLagu} ${badgeTipeDibawakan} ${badgeTitleTrack}</div>
                <h3 class="list-title" style="display:inline-block;">${lagu.judul_lagu}</h3> ${adminActions}
            </div>
            <div style="color: #d81b60; font-size: 24px;">&#10140;</div>
        `;
        containerSongs.appendChild(div);
    });
}

// ============================================================================
// 4. ADMIN LOKAL: CRUD LAGU DI TRACKLIST & MEMBER
// ============================================================================
window.adminEditLaguAlbum = function(e, idLagu, track, judul, tipe, dibawakan, isTitle) {
    e.stopPropagation();
    window.currentAdminSongId = idLagu;
    
    document.getElementById('adm-trk-id').value = idLagu;
    document.getElementById('adm-trk-no').value = track;
    document.getElementById('adm-trk-judul').value = judul;
    document.getElementById('adm-trk-tipe').value = tipe;
    document.getElementById('adm-trk-dibawakan').value = dibawakan;
    document.getElementById('adm-trk-title').checked = isTitle;
    
    document.getElementById('btn-submit-trk').innerText = 'Update Track';
    document.getElementById('btn-submit-trk').style.background = '#ff9800';
    document.getElementById('btn-cancel-trk').style.display = 'inline-block';
    
    // Buka Panel Member Lagu
    document.getElementById('admin-song-member-area').style.display = 'block';
    document.getElementById('adm-song-title-label').innerText = judul;
    
    muatDataAdminMemberLagu(); // Load member untuk lagu ini
    window.scrollTo(0, document.getElementById('admin-song-area').offsetTop - 20);
};

window.adminBatalEditLaguAlbum = function() {
    window.currentAdminSongId = null;
    document.getElementById('adm-trk-id').value = '';
    document.getElementById('adm-trk-no').value = '';
    document.getElementById('adm-trk-judul').value = '';
    document.getElementById('adm-trk-tipe').value = '';
    document.getElementById('adm-trk-dibawakan').value = '';
    document.getElementById('adm-trk-title').checked = false;
    
    document.getElementById('btn-submit-trk').innerText = 'Simpan Track';
    document.getElementById('btn-submit-trk').style.background = '#28a745';
    document.getElementById('btn-cancel-trk').style.display = 'none';
    
    document.getElementById('admin-song-member-area').style.display = 'none';
};

window.adminSimpanLaguKeAlbum = async function() {
    const editId = document.getElementById('adm-trk-id').value;
    const trackNo = document.getElementById('adm-trk-no').value;
    const inputJudul = document.getElementById('adm-trk-judul').value.trim();
    const tipeBaru = document.getElementById('adm-trk-tipe').value;
    const dibawakan = document.getElementById('adm-trk-dibawakan').value;
    const isTitle = document.getElementById('adm-trk-title').checked;
    
    if(!inputJudul) return alert('Ketik judul lagu terlebih dahulu!');

    let finalSongId = window.mapLaguMasterCari[inputJudul.toLowerCase()];

    // Mode Insert / Auto-Create Master
    if (!editId) {
        if (!finalSongId) {
            if(!confirm(`Lagu "${inputJudul}" belum ada di Master.\nBuat lagu baru otomatis?`)) return;
            const { data: newS, error: errNew } = await supabaseClient.from('songs')
                .insert([{ judul_lagu: inputJudul, tipe_lagu: tipeBaru || null, album_id: window.currentAdminAlbumId, track_number: trackNo ? parseInt(trackNo) : null, tipe_dibawakan: dibawakan || null, is_title_track: isTitle }])
                .select('id').single();
            if(errNew) return alert('Gagal buat lagu: ' + errNew.message);
            finalSongId = newS.id;
        } else {
            const { error } = await supabaseClient.from('songs').update({ album_id: window.currentAdminAlbumId, track_number: trackNo ? parseInt(trackNo) : null, tipe_dibawakan: dibawakan || null, is_title_track: isTitle }).eq('id', finalSongId);
            if(error) return alert('Gagal menyambungkan: ' + error.message);
        }
        alert('Lagu sukses ditambahkan!');
    } 
    // Mode Update Data Lagu Master
    else {
        const { error } = await supabaseClient.from('songs')
            .update({ judul_lagu: inputJudul, track_number: trackNo ? parseInt(trackNo) : null, tipe_lagu: tipeBaru || null, tipe_dibawakan: dibawakan || null, is_title_track: isTitle })
            .eq('id', editId);
        if(error) return alert('Gagal update lagu: ' + error.message);
        alert('Data tracklist diperbarui!');
    }

    adminBatalEditLaguAlbum();
    const judAlbum = document.getElementById('detail-judul-album').innerText;
    muatDaftarLaguDiAlbum(window.currentAdminAlbumId, judAlbum, null, '', '', '');
};

window.adminHapusLaguDariAlbum = async function(e, songId) {
    e.stopPropagation();
    if(!confirm('Keluarkan lagu ini dari tracklist album?')) return;
    const { error } = await supabaseClient.from('songs').update({ album_id: null, track_number: null, is_title_track: false }).eq('id', songId);
    if(error) alert('Gagal mengeluarkan: ' + error.message);
    else {
        const judAlbum = document.getElementById('detail-judul-album').innerText;
        muatDaftarLaguDiAlbum(window.currentAdminAlbumId, judAlbum, null, '', '', '');
    }
};

// --- FUNGSI ADMIN: RECORDING MEMBERS (LAGU KHUSUS) DENGAN BULK ADD ---
window.muatDataAdminMemberLagu = async function() {
    const tbody = document.getElementById('adm-song-member-tbody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Memuat member...</td></tr>';

    const { data: smData } = await supabaseClient.from('song_performing_members')
        .select('member_id, is_center, members(nama)')
        .eq('song_id', window.currentAdminSongId).order('blocking', { ascending: true });

    tbody.innerHTML = '';
    if (!smData || smData.length === 0) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888;">Belum ada member.</td></tr>';

    smData.forEach(item => {
        const cCenter = item.is_center ? 'checked' : '';
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; font-weight: bold; color:#444;">${item.members.nama}</td>
                <td style="padding: 8px; text-align: center;"><input type="checkbox" ${cCenter} onchange="adminUpdateStatusMemberLagu('${item.member_id}', 'is_center', this.checked)"></td>
                <td style="padding: 8px; text-align: center;"><button onclick="adminHapusMemberLagu('${item.member_id}')" style="background:#e53935; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.8em; cursor:pointer;">Hapus</button></td>
            </tr>
        `;
    });
};

window.adminTambahMemberLagu = async function() {
    const inputNamaRaw = document.getElementById('adm-song-member-input').value;
    if (!inputNamaRaw || !window.currentAdminSongId) return alert('Ketik/pilih nama member terlebih dahulu!');
    
    // Pisahkan input berdasarkan koma untuk Bulk Add
    const namaArray = inputNamaRaw.split(',').map(n => n.trim().toLowerCase()).filter(n => n);
    
    let validInserts = [];
    let notFoundNames = [];

    namaArray.forEach(nama => {
        // Coba cari presisi dulu (Nama Lengkap / Panggilan)
        let fallbackObj = window.allMembersCache.find(m => 
            (m.nama && m.nama.toLowerCase() === nama) || 
            (m.nama_panggilan && m.nama_panggilan.toLowerCase() === nama)
        );
        
        // Kalau tidak ketemu, cari yang mengandung kata tersebut
        if (!fallbackObj) {
            fallbackObj = window.allMembersCache.find(m => m.nama && m.nama.toLowerCase().includes(nama));
        }

        if (fallbackObj) {
            // Mencegah duplikasi di dalam array insert
            if (!validInserts.find(ins => ins.member_id === fallbackObj.id)) {
                validInserts.push({ song_id: window.currentAdminSongId, member_id: fallbackObj.id, blocking: 99 });
            }
        } else {
            notFoundNames.push(nama);
        }
    });

    if (validInserts.length === 0) return alert('Tidak ada member yang cocok ditemukan! Pastikan ejaan benar.');

    const { error } = await supabaseClient.from('song_performing_members').insert(validInserts);
    if(error) alert('Gagal tambah: ' + error.message); 
    else { 
        let msg = `Berhasil menambahkan ${validInserts.length} member!`;
        if (notFoundNames.length > 0) msg += `\n\nNamun, nama berikut dilewati (tidak dikenali): ${notFoundNames.join(', ')}`;
        alert(msg);
        
        document.getElementById('adm-song-member-input').value = ''; 
        muatDataAdminMemberLagu(); 
    }
};

window.adminHapusMemberLagu = async function(memberId) {
    if(!confirm('Keluarkan member ini dari lagu?')) return;
    const { error } = await supabaseClient.from('song_performing_members').delete().match({ song_id: window.currentAdminSongId, member_id: memberId });
    if(error) alert('Gagal hapus: ' + error.message); else muatDataAdminMemberLagu();
};

window.adminUpdateStatusMemberLagu = async function(memberId, field, isChecked) {
    const { error } = await supabaseClient.from('song_performing_members').update({ [field]: isChecked }).match({ song_id: window.currentAdminSongId, member_id: memberId });
    if(error) alert('Gagal update: ' + error.message);
};

// --- FUNGSI ADMIN: RECORDING MEMBERS (LEVEL ALBUM / SENBATSU) DENGAN BULK ADD ---
window.muatDataAdminMemberAlbum = async function() {
    const tbody = document.getElementById('adm-album-member-tbody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Memuat member...</td></tr>';

    const { data: amData } = await supabaseClient.from('album_performing_members')
        .select('member_id, is_center, members(nama)')
        .eq('album_id', window.currentAdminAlbumId).order('blocking', { ascending: true });

    tbody.innerHTML = '';
    if (!amData || amData.length === 0) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888;">Belum ada member senbatsu di album ini.</td></tr>';

    amData.forEach(item => {
        const cCenter = item.is_center ? 'checked' : '';
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; font-weight: bold; color:#444;">${item.members.nama}</td>
                <td style="padding: 8px; text-align: center;"><input type="checkbox" ${cCenter} onchange="adminUpdateStatusMemberAlbum('${item.member_id}', 'is_center', this.checked)"></td>
                <td style="padding: 8px; text-align: center;"><button onclick="adminHapusMemberAlbum('${item.member_id}')" style="background:#e53935; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.8em; cursor:pointer;">Hapus</button></td>
            </tr>
        `;
    });
};

window.adminTambahMemberAlbum = async function() {
    const inputNamaRaw = document.getElementById('adm-album-member-input').value;
    if (!inputNamaRaw || !window.currentAdminAlbumId) return alert('Ketik/pilih nama member terlebih dahulu!');
    
    // Pisahkan input berdasarkan koma untuk Bulk Add
    const namaArray = inputNamaRaw.split(',').map(n => n.trim().toLowerCase()).filter(n => n);
    
    let validInserts = [];
    let notFoundNames = [];

    namaArray.forEach(nama => {
        // Coba cari presisi dulu (Nama Lengkap / Panggilan)
        let fallbackObj = window.allMembersCache.find(m => 
            (m.nama && m.nama.toLowerCase() === nama) || 
            (m.nama_panggilan && m.nama_panggilan.toLowerCase() === nama)
        );
        
        // Kalau tidak ketemu, cari yang mengandung kata tersebut
        if (!fallbackObj) {
            fallbackObj = window.allMembersCache.find(m => m.nama && m.nama.toLowerCase().includes(nama));
        }

        if (fallbackObj) {
            // Mencegah duplikasi di dalam array insert
            if (!validInserts.find(ins => ins.member_id === fallbackObj.id)) {
                validInserts.push({ album_id: window.currentAdminAlbumId, member_id: fallbackObj.id, blocking: 99 });
            }
        } else {
            notFoundNames.push(nama);
        }
    });

    if (validInserts.length === 0) return alert('Tidak ada member yang cocok ditemukan! Pastikan ejaan benar.');

    const { error } = await supabaseClient.from('album_performing_members').insert(validInserts);
    if(error) alert('Gagal tambah: ' + error.message); 
    else { 
        let msg = `Berhasil menambahkan ${validInserts.length} member!`;
        if (notFoundNames.length > 0) msg += `\n\nNamun, nama berikut dilewati (tidak dikenali): ${notFoundNames.join(', ')}`;
        alert(msg);
        
        document.getElementById('adm-album-member-input').value = ''; 
        muatDataAdminMemberAlbum(); 
        
        // Refresh UI Public
        const judAlbum = document.getElementById('detail-judul-album').innerText;
        muatDaftarLaguDiAlbum(window.currentAdminAlbumId, judAlbum, null, '', '', '');
    }
};

window.adminHapusMemberAlbum = async function(memberId) {
    if(!confirm('Keluarkan member ini dari Album/Senbatsu?')) return;
    const { error } = await supabaseClient.from('album_performing_members').delete().match({ album_id: window.currentAdminAlbumId, member_id: memberId });
    if(error) alert('Gagal hapus: ' + error.message); 
    else { 
        muatDataAdminMemberAlbum();
        const judAlbum = document.getElementById('detail-judul-album').innerText;
        muatDaftarLaguDiAlbum(window.currentAdminAlbumId, judAlbum, null, '', '', '');
    }
};

window.adminUpdateStatusMemberAlbum = async function(memberId, field, isChecked) {
    const { error } = await supabaseClient.from('album_performing_members').update({ [field]: isChecked }).match({ album_id: window.currentAdminAlbumId, member_id: memberId });
    if(error) alert('Gagal update: ' + error.message);
    else {
        const judAlbum = document.getElementById('detail-judul-album').innerText;
        muatDaftarLaguDiAlbum(window.currentAdminAlbumId, judAlbum, null, '', '', '');
    }
};

// ============================================================================
// 5. DETAIL LIRIK LAGU
// ============================================================================
async function muatDetailLagu(songId, asalHalaman = 'view-album-detail') {
    bukaHalaman('view-song-detail');
    const btnBack = document.getElementById('btn-back-song');
    if (asalHalaman === 'view-schedule-detail') {
        btnBack.setAttribute('onclick', "bukaHalaman('view-schedule-detail')");
        btnBack.innerHTML = '&#11013; Kembali ke Detail Event';
    } else {
        btnBack.setAttribute('onclick', "bukaHalaman('view-album-detail')");
        btnBack.innerHTML = '&#11013; Kembali ke Tracklist';
    }

    const container = document.getElementById('info-detail-song');
    container.innerHTML = `<p style="text-align:center;">Memuat lirik...</p>`;

    const { data, error } = await supabaseClient.from('songs').select('*, albums(id, judul_album, tipe_album, nomor_single)').eq('id', songId).single();
    if (error || !data) return container.innerHTML = `<p style="color:red;">Gagal memuat lagu.</p>`;

    let linksHtml = '';
    if(data.link_youtube) linksHtml += `<a href="${data.link_youtube}" target="_blank" class="link-yt">&#9654; YouTube</a>`;
    if(data.link_spotify) linksHtml += `<a href="${data.link_spotify}" target="_blank" class="link-sp">&#9835; Spotify</a>`;
    if(data.link_apple_music) linksHtml += `<a href="${data.link_apple_music}" target="_blank" class="link-am">&#9834; Apple Music</a>`;

    const tipeDibawakanText = data.tipe_dibawakan || '';
    const tipeLaguText = data.tipe_lagu || '';
    const judulAlbumLagu = data.albums?.judul_album || '';
    const tipeAlbumLagu = data.albums?.tipe_album || '';
    const nomorSingleLagu = data.albums?.nomor_single || null;
    const isInstrumental = tipeLaguText.toLowerCase() === 'instrumental';

    let badgeBarHtml = `<div style="text-align:center; margin-bottom: 25px;">`;
    if (tipeLaguText) badgeBarHtml += `<span class="badge-tipe-lagu" style="font-size: 0.85em; padding: 4px 12px; border-radius: 15px;">${tipeLaguText}</span>`;
    if (!isInstrumental && tipeDibawakanText) badgeBarHtml += `<span class="badge-tipe-bawa" style="font-size: 0.85em; padding: 4px 12px; border-radius: 15px;">${tipeDibawakanText}</span>`;
    badgeBarHtml += `</div>`;

    let membersSectionHtml = '';
    if (!isInstrumental) {
        membersSectionHtml = `
            <div style="margin-top: 30px; margin-bottom: 10px;">
                <h4 style="text-align:center; color:#d81b60; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px; font-size: 0.9em;">Recording Members</h4>
                <div id="loading-song-members" style="text-align: center; font-size: 0.85em; color:#666;">Memuat foto member...</div>
                <div class="album-members-container" id="list-song-members"></div>
            </div>
        `;
    }

    container.innerHTML = `
        <h2 style="margin-top:0; margin-bottom: 5px;">${data.judul_lagu}</h2>
        <div style="text-align:center; color: #666; font-weight: bold; margin-bottom: 15px;">${judulAlbumLagu || '-'}</div>
        ${badgeBarHtml}
        ${membersSectionHtml}
        ${linksHtml ? `<div class="song-links">${linksHtml}</div>` : ''}
        <div class="lyrics-area">${data.lirik || 'Lirik belum tersedia.'}</div>
    `;

    if (!isInstrumental) {
        const containerMembers = document.getElementById('list-song-members');
        const loadingMembers = document.getElementById('loading-song-members');

        let { data: specificMembers } = await supabaseClient.from('song_performing_members')
            .select('is_center, blocking, members(id, nama, nama_panggilan, status, generasi)')
            .eq('song_id', songId).order('blocking', { ascending: true, nullsFirst: false }).order('is_center', { ascending: false });

        let finalMembersToRender = specificMembers;
        if ((!specificMembers || specificMembers.length === 0) && tipeDibawakanText !== 'Unit Song' && tipeDibawakanText !== 'Solo') {
            const { data: albumMembers } = await supabaseClient.from('album_performing_members')
                .select('is_center, blocking, members(id, nama, nama_panggilan, status, generasi)')
                .eq('album_id', data.albums?.id).order('blocking', { ascending: true, nullsFirst: false }).order('is_center', { ascending: false });
            finalMembersToRender = albumMembers;
        }

        loadingMembers.style.display = 'none';
        let validFinalMembers = finalMembersToRender ? finalMembersToRender.filter(item => item && item.members) : [];
        if (validFinalMembers.length === 12) containerMembers.style.maxWidth = '550px'; 
        else containerMembers.style.maxWidth = '800px'; 

        if (validFinalMembers.length > 0) {
            validFinalMembers.forEach(item => {
                const m = item.members;
                const isCenterUI = item.is_center && tipeDibawakanText !== 'All Member';
                const div = document.createElement('div');
                div.className = isCenterUI ? 'album-member-small is-center' : 'album-member-small';
                div.onclick = () => muatDetailMemberById(m.id); 
                
                const namaPendek = m.nama_panggilan || m.nama.split(' ')[0];
                const crownHtml = isCenterUI ? `<div class="center-crown">&#128081;</div><div class="center-badge">CENTER</div>` : '';
                const imgHtml = generateMemberImageHtml(m, judulAlbumLagu, tipeAlbumLagu, nomorSingleLagu, '');

                div.innerHTML = `${crownHtml}${imgHtml}<p>${namaPendek}</p>`;
                containerMembers.appendChild(div);
            });
        } else {
            containerMembers.innerHTML = `<p style="text-align:center; color:#aaa; font-style:italic; font-size: 0.9em; width: 100%;">Data foto member belum tersedia.</p>`;
        }
    }
}
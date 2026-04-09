let dataSemuaAlbum = [];

async function muatDaftarAlbum() {
    const container = document.getElementById('list-albums');
    const loading = document.getElementById('loading-albums');
    
    if(dataSemuaAlbum.length === 0) { 
        loading.style.display = 'block';
        const { data, error } = await supabaseClient.from('albums').select('*').order('tanggal_rilis', { ascending: false, nullsFirst: false });
        loading.style.display = 'none';
        if (error) return container.innerHTML = `<p style="color:red;">Gagal memuat: ${error.message}</p>`;
        dataSemuaAlbum = data; 
    }
    renderAlbumKeLayar(dataSemuaAlbum);
}

function terapkanFilterAlbum() {
    const tipeTerpilih = document.getElementById('filter-tipe-album').value;
    if (tipeTerpilih === 'Semua') renderAlbumKeLayar(dataSemuaAlbum);
    else renderAlbumKeLayar(dataSemuaAlbum.filter(album => album.tipe_album === tipeTerpilih));
}

function renderAlbumKeLayar(dataAlbum) {
    const container = document.getElementById('list-albums');
    container.innerHTML = '';
    if (dataAlbum.length === 0) return container.innerHTML = `<p style="text-align:center; width:100%; grid-column: 1 / -1; color:#666;">Belum ada diskografi untuk tipe ini.</p>`;
    
    dataAlbum.forEach(album => {
        const cover = album.cover_url || 'favicon.png'; 
        let warnaBadgeTipe = 'status-setlist';
        if (album.tipe_album === 'Single') warnaBadgeTipe = 'status-single';
        else if (album.tipe_album === 'Digital Single') warnaBadgeTipe = 'status-digital-single';
        else if (album.tipe_album === 'Album') warnaBadgeTipe = 'status-album';

        let badgeKategoriHtml = album.kategori_album ? `<span class="status-badge status-kategori">${album.kategori_album.toUpperCase()}</span>` : '';
        let judulJepangHtml = album.judul_jepang ? `<div style="font-size: 0.85em; color: #888; margin-bottom: 5px;">${album.judul_jepang}</div>` : '';
        const tanggalRilisFormat = formatTanggalIndo(album.tanggal_rilis);

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
        `;
        container.appendChild(card);
    });
}

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
    
    const containerMembers = document.getElementById('list-album-members');
    const loadingMembers = document.getElementById('loading-album-members');
    const garisPemisah = document.getElementById('garis-pemisah-album');
    const teksAlbumMembers = document.getElementById('teks-album-members');
    
    containerMembers.innerHTML = ''; garisPemisah.style.display = 'none'; teksAlbumMembers.style.display = 'none'; loadingMembers.style.display = 'block';

    const { data: dataMembers, error: errMembers } = await supabaseClient.from('album_performing_members')
        .select('is_center, blocking, members(id, nama, nama_panggilan, status, generasi)')
        .eq('album_id', albumId)
        .order('blocking', { ascending: true, nullsFirst: false }).order('is_center', { ascending: false }); 

    loadingMembers.style.display = 'none';

    if (!errMembers && dataMembers && dataMembers.length > 0) {
        let validDataMembers = dataMembers.filter(item => item && item.members);
        if (validDataMembers.length > 0) teksAlbumMembers.style.display = 'block';
        if (validDataMembers.length === 12) containerMembers.style.maxWidth = '550px'; 
        else containerMembers.style.maxWidth = '800px'; 

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
        .select('id, judul_lagu, tipe_lagu, track_number, tipe_dibawakan')
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

        div.innerHTML = `
            <div>
                <div class="list-subtitle">&#127925; ${tampilanTrack} ${badgeTipeLagu} ${badgeTipeDibawakan}</div>
                <h3 class="list-title">${lagu.judul_lagu}</h3>
            </div>
            <div style="color: #d81b60; font-size: 24px;">&#10140;</div>
        `;
        containerSongs.appendChild(div);
    });
}

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
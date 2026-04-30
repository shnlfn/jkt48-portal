let dataSemuaStageMaster = [];
window.mapLaguMasterCache = {}; // Untuk sistem pencarian lagu (Select2 Native)
window.asalHalamanStageGlobal = 'view-stages'; // Menyimpan jejak darimana halaman ini dipanggil

// ============================================================================
// 0. FUNGSI JEMBATAN KE DETAIL LAGU DARI STAGE
// ============================================================================
window.muatDetailLaguDariStage = async function(songId) {
    if(typeof muatDetailLagu === 'function') {
        await muatDetailLagu(songId, 'view-stage-detail');
        // Override tombol kembali agar presisi balik ke Stage
        setTimeout(() => {
            const btnBack = document.getElementById('btn-back-song');
            if(btnBack) {
                btnBack.setAttribute('onclick', "bukaHalaman('view-stage-detail')");
                btnBack.innerHTML = '&#11013; Kembali ke Detail Stage';
            }
        }, 100);
    }
};

// ============================================================================
// 1. DAFTAR MASTER STAGE (MENU "STAGES")
// ============================================================================
async function muatDaftarStage() {
    const container = document.getElementById('list-stages');
    const loading = document.getElementById('loading-stages');
    const adminToggle = document.getElementById('admin-stage-toggle');
    
    try {
        if (typeof isLocalhost === 'function' && isLocalhost()) {
            adminToggle.style.display = 'block';
        } else {
            adminToggle.style.display = 'none';
        }

        container.className = 'grid-container'; 

        // Sistem Cache agar tidak selalu loading ulang saat kembali dari detail
        if (dataSemuaStageMaster.length === 0) {
            loading.style.display = 'block';
            container.innerHTML = '';
            
            const { data, error } = await supabaseClient
                .from('stages')
                .select('*')
                .order('tanggal_shonichi', { ascending: false, nullsFirst: false });
            
            loading.style.display = 'none'; 

            if (error) {
                container.innerHTML = `<p style="color:red; text-align:center; width:100%; font-weight:bold;">Gagal memuat Database: ${error.message}</p>`;
                container.className = 'list-container'; 
                return;
            }

            if (!data || data.length === 0) {
                container.innerHTML = `<p style="color:#888; text-align:center; font-style:italic; width:100%;">Belum ada master data Stage. Silakan tambahkan lewat tombol Mode Admin di atas.</p>`;
                container.className = 'list-container'; 
                return;
            }

            dataSemuaStageMaster = data;
        } else {
            loading.style.display = 'none';
        }

        // Render Kartu Stage
        container.innerHTML = '';
        dataSemuaStageMaster.forEach(stage => {
            const div = document.createElement('div');
            div.className = 'card-album'; 
            
            let warnaTema = getTeamColor(stage.team) || '#d81b60';
            // Set penanda asal halaman sebagai view-stages
            div.onclick = () => muatDetailStageMaster(stage.id, warnaTema, true, stage.team || 'JKT48', 'view-stages');

            let tglShonichi = stage.tanggal_shonichi ? formatTanggalIndo(stage.tanggal_shonichi) : 'TBA (Data Dinamis)';
            
            let ketHtml = stage.keterangan ? `<p style="margin:0; color:#333; font-weight:normal; font-size:0.85em;">${stage.keterangan}</p>` : '';

            let namaFormatTim = (stage.team || 'jkt48').toLowerCase().replace('jkt48', '').trim().replace(/\s+/g, '_');
            if(!namaFormatTim) namaFormatTim = 'jkt48';
            let imgSrc = stage.poster_url || stage.banner_url || `images/teams/${namaFormatTim}.jpg`;

            // ADMIN BUTTONS: Muncul hanya jika di localhost
            let adminButtons = '';
            if (typeof isLocalhost === 'function' && isLocalhost()) {
                adminButtons = `
                    <div style="margin-top: 15px; display:flex; gap:10px; justify-content:center;">
                        <button onclick="event.stopPropagation(); window.adminEditStage('${stage.id}')" style="background:#ff9800; color:white; border:none; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:0.85em; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Ubah Data</button>
                        <button onclick="event.stopPropagation(); window.adminHapusStage('${stage.id}')" style="background:#e53935; color:white; border:none; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:0.85em; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Hapus</button>
                    </div>
                `;
            }

            div.innerHTML = `
                <div style="position: relative; height: 180px; width: 100%; overflow: hidden; background-color: ${warnaTema};">
                    <img src="${imgSrc}" onerror="this.onerror=null; this.src='favicon.png';" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.85); transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); padding: 30px 10px 10px 10px; color: white; text-align: center;">
                        <span style="background: ${warnaTema}; padding: 3px 8px; border-radius: 4px; font-size: 0.7em; font-weight: bold; text-transform: uppercase;">${stage.team || 'JKT48'}</span>
                    </div>
                </div>
                <div style="padding: 15px; display: flex; flex-direction: column; flex: 1; text-align: center;">
                    <h3 style="color:${warnaTema}; margin:0 0 5px 0; font-size:1.15em;">${stage.nama_stage}</h3>
                    ${ketHtml}
                    <div style="margin-top: auto; padding-top: 15px;">
                        <p style="margin:0; color:#999; font-size:0.8em; border-top: 1px dashed #ddd; padding-top: 8px;">Shonichi: ${tglShonichi}</p>
                        ${adminButtons}
                    </div>
                </div>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        loading.style.display = 'none';
        container.innerHTML = `<p style="color:red; text-align:center; width:100%; font-weight:bold;">Sistem Crash: ${err.message}</p>`;
    }
}

// ============================================================================
// 2. ADMIN LOKAL: CRUD STAGE (TAMBAH, UBAH, HAPUS)
// ============================================================================
function toggleAdminStage() {
    const area = document.getElementById('admin-stage-area');
    if (area.style.display === 'none') {
        area.style.display = 'block';
    } else {
        window.adminBatalEditStage(); // Reset jika ditutup
        area.style.display = 'none';
    }
}

window.adminEditStage = function(id) {
    const stage = dataSemuaStageMaster.find(s => s.id === id);
    if (!stage) return;

    window.currentEditStageId = id;
    
    document.getElementById('adm-stg-nama').value = stage.nama_stage || '';
    document.getElementById('adm-stg-jepang').value = stage.nama_jepang || '';
    document.getElementById('adm-stg-ket').value = stage.keterangan || '';
    document.getElementById('adm-stg-team').value = stage.team || '';
    document.getElementById('adm-stg-shonichi').value = stage.tanggal_shonichi ? stage.tanggal_shonichi.substring(0, 10) : '';
    document.getElementById('adm-stg-senshuraku').value = stage.tanggal_senshuraku ? stage.tanggal_senshuraku.substring(0, 10) : '';
    document.getElementById('adm-stg-banner').value = stage.banner_url || '';
    document.getElementById('adm-stg-poster').value = stage.poster_url || '';
    document.getElementById('adm-stg-foto-shonichi').value = stage.foto_shonichi_url || '';
    document.getElementById('adm-stg-foto-senshuraku').value = stage.foto_senshuraku_url || '';
    document.getElementById('adm-stg-catatan').value = stage.catatan || '';

    const area = document.getElementById('admin-stage-area');
    area.style.display = 'block';

    const btns = area.querySelectorAll('button');
    if(btns.length > 0) {
        btns[0].innerText = 'Simpan Perubahan';
        btns[0].style.background = '#ff9800';
        
        let btnCancel = document.getElementById('btn-cancel-stg-master-main');
        if(!btnCancel) {
            btnCancel = document.createElement('button');
            btnCancel.id = 'btn-cancel-stg-master-main';
            btnCancel.innerText = 'Batal Edit';
            btnCancel.style.background = '#666';
            btnCancel.style.color = 'white';
            btnCancel.style.border = 'none';
            btnCancel.style.padding = '10px 20px';
            btnCancel.style.borderRadius = '5px';
            btnCancel.style.cursor = 'pointer';
            btnCancel.style.marginLeft = '10px';
            btnCancel.style.fontWeight = 'bold';
            btnCancel.onclick = window.adminBatalEditStage;
            btns[0].parentNode.appendChild(btnCancel);
        }
        btnCancel.style.display = 'inline-block';
    }

    window.scrollTo(0, area.offsetTop - 50);
};

window.adminBatalEditStage = function() {
    window.currentEditStageId = null;
    ['adm-stg-nama','adm-stg-jepang','adm-stg-ket','adm-stg-team','adm-stg-shonichi','adm-stg-senshuraku','adm-stg-banner','adm-stg-poster','adm-stg-foto-shonichi','adm-stg-foto-senshuraku','adm-stg-catatan'].forEach(id => document.getElementById(id).value = '');
    
    const area = document.getElementById('admin-stage-area');
    const btns = area.querySelectorAll('button');
    if(btns.length > 0) {
        btns[0].innerText = 'Simpan Stage';
        btns[0].style.background = ''; // Kembali ke default CSS
    }
    const btnCancel = document.getElementById('btn-cancel-stg-master-main');
    if(btnCancel) btnCancel.style.display = 'none';
    
    area.style.display = 'none';
};

async function adminSimpanStageBaru() {
    const payload = {
        nama_stage: document.getElementById('adm-stg-nama').value,
        nama_jepang: document.getElementById('adm-stg-jepang').value || null,
        keterangan: document.getElementById('adm-stg-ket').value || null,
        team: document.getElementById('adm-stg-team').value || null,
        tanggal_shonichi: document.getElementById('adm-stg-shonichi').value || null,
        tanggal_senshuraku: document.getElementById('adm-stg-senshuraku').value || null,
        banner_url: document.getElementById('adm-stg-banner').value || null,
        poster_url: document.getElementById('adm-stg-poster').value || null,
        foto_shonichi_url: document.getElementById('adm-stg-foto-shonichi').value || null,
        foto_senshuraku_url: document.getElementById('adm-stg-foto-senshuraku').value || null,
        catatan: document.getElementById('adm-stg-catatan').value || null
    };

    if(!payload.nama_stage) return alert('Judul Stage (Primary) wajib diisi!');

    if (window.currentEditStageId) {
        const { error } = await supabaseClient.from('stages').update(payload).eq('id', window.currentEditStageId);
        if(error) alert('Gagal update ke Supabase: ' + error.message);
        else {
            alert('Master Stage berhasil diperbarui!');
            window.adminBatalEditStage();
            dataSemuaStageMaster = []; 
            muatDaftarStage();
        }
    } else {
        const { error } = await supabaseClient.from('stages').insert([payload]);
        if(error) alert('Gagal simpan ke Supabase: ' + error.message);
        else {
            alert('Master Stage berhasil ditambahkan!');
            window.adminBatalEditStage();
            dataSemuaStageMaster = []; 
            muatDaftarStage();
        }
    }
}

window.adminHapusStage = async function(id) {
    if(!confirm('YAKIN INGIN MENGHAPUS MASTER STAGE INI?\\nSemua setlist yang terhubung akan kehilangan referensi Master-nya!')) return;
    const { error } = await supabaseClient.from('stages').delete().eq('id', id);
    if(error) alert('Gagal menghapus: ' + error.message);
    else {
        dataSemuaStageMaster = []; // Refresh cache
        muatDaftarStage();
    }
};

// ============================================================================
// 3. INTERCEPTOR (DARI TOMBOL DETAIL TEAM)
// ============================================================================
window.muatDetailStage = async function(namaStage, namaTeam, warnaTema, asalHalaman = null) {
    if (asalHalaman) {
        window.asalHalamanStageGlobal = asalHalaman;
    } else {
        window.asalHalamanStageGlobal = 'view-stages';
    }
    
    let query = supabaseClient.from('stages').select('id').eq('nama_stage', namaStage);
    if (namaTeam && namaTeam !== '') {
        query = query.eq('team', namaTeam);
    }
    
    const { data, error } = await query.maybeSingle();

    if (data) {
        muatDetailStageMaster(data.id, warnaTema, true, namaTeam, window.asalHalamanStageGlobal);
    } else {
        muatDetailStageMaster(namaStage, warnaTema, false, namaTeam, window.asalHalamanStageGlobal);
    }
};

// ============================================================================
// 4. HALAMAN DETAIL STAGE ULTIMATE
// ============================================================================
async function muatDetailStageMaster(identifier, passedWarna, isMaster = true, fallbackTeam = 'JKT48', asalHalaman = null) {
    if (asalHalaman) window.asalHalamanStageGlobal = asalHalaman;
    bukaHalaman('view-stage-detail');
    
    const btnBack = document.querySelector('#view-stage-detail .btn-back');
    if (btnBack) {
        btnBack.removeAttribute('onclick'); 
        if (window.asalHalamanStageGlobal === 'view-team-detail') {
            btnBack.onclick = () => bukaHalaman('view-team-detail');
            btnBack.innerHTML = '&#11013; Kembali ke Detail Team';
        } else {
            btnBack.onclick = () => { 
                bukaHalaman('view-stages'); 
                muatDaftarStage(); 
            };
            btnBack.innerHTML = '&#11013; Kembali ke Daftar Stage';
        }
    }
    
    const container = document.getElementById('info-detail-stage');
    container.innerHTML = '<div style="text-align:center; padding: 40px 0;">Memuat data Setlist...</div>';
    window.scrollTo(0, 0);

    let stageMaster = {};
    let namaStage = '';
    let namaTeam = '';

    if (isMaster) {
        const { data: masterData, error: errMaster } = await supabaseClient.from('stages').select('*').eq('id', identifier).single();
        if (errMaster || !masterData) return container.innerHTML = '<p style="color:red; text-align:center;">Gagal memuat master stage.</p>';
        stageMaster = masterData;
        namaStage = stageMaster.nama_stage;
        namaTeam = stageMaster.team || fallbackTeam;
    } else {
        // Mode Auto-Generate
        namaStage = identifier;
        namaTeam = fallbackTeam;
        stageMaster = {
            id: null,
            nama_stage: namaStage,
            team: namaTeam,
            keterangan: '<span style="color:#d81b60;">&#9888;&#65039; Belum didaftarkan di Master Data (Auto-Generate)</span>',
            nama_jepang: null,
            tanggal_shonichi: null,
            tanggal_senshuraku: null,
            banner_url: null,
            poster_url: null,
            catatan: null
        };
    }

    const warnaTema = passedWarna || getTeamColor(namaTeam) || '#d81b60';

    let querySchedules = supabaseClient
        .from('theater_schedules')
        .select('id, judul_show, tanggal_waktu, is_shonichi, is_senshuraku, tipe_jadwal_sekunder')
        .eq('judul_show', namaStage)
        .order('tanggal_waktu', { ascending: true });
        
    if (namaTeam && namaTeam !== '') {
        querySchedules = querySchedules.eq('team', namaTeam);
    }

    const { data: schedules } = await querySchedules;

    let dynShonichi = null; let dynSenshuraku = null; let totalPerf = 0;
    const now = new Date();
    let scheduleIds = [];
    let keteranganStageDinamic = `JKT48 ${namaTeam} Spesial Setlist`;

    const masterShonichi = stageMaster.tanggal_shonichi ? stageMaster.tanggal_shonichi.substring(0, 10) : null;
    const masterSenshuraku = stageMaster.tanggal_senshuraku ? stageMaster.tanggal_senshuraku.substring(0, 10) : null;

    let targetShonichiDateStr = masterShonichi;
    let targetSenshurakuDateStr = masterSenshuraku;

    if (schedules && schedules.length > 0) {
        keteranganStageDinamic = schedules[0].tipe_jadwal_sekunder || keteranganStageDinamic;

        if (!targetShonichiDateStr) {
            const shonichiSched = schedules.find(s => s.is_shonichi) || schedules[0];
            targetShonichiDateStr = shonichiSched.tanggal_waktu.substring(0, 10);
            dynShonichi = shonichiSched.tanggal_waktu;
        }

        if (!targetSenshurakuDateStr) {
            const senshuSched = [...schedules].reverse().find(s => s.is_senshuraku || s.judul_show.toLowerCase().includes('senshuraku') || s.judul_show.toLowerCase().includes('last show'));
            if (senshuSched) {
                targetSenshurakuDateStr = senshuSched.tanggal_waktu.substring(0, 10);
                dynSenshuraku = senshuSched.tanggal_waktu;
            }
        }

        // Kumpulkan scheduleIds untuk narik member data
        schedules.forEach(j => {
            scheduleIds.push(j.id);
            if(new Date(j.tanggal_waktu) <= now) totalPerf++;
        });
    }

    const finalShonichi = stageMaster.tanggal_shonichi || dynShonichi;
    const finalSenshuraku = stageMaster.tanggal_senshuraku || dynSenshuraku;
    const isActive = !finalSenshuraku;

    // Filter jadwal yang spesifik hari Shonichi/Senshuraku
    let shonichiScheduleIds = [];
    let senshurakuScheduleIds = [];

    if (schedules && schedules.length > 0) {
        shonichiScheduleIds = schedules.filter(s => s.tanggal_waktu.substring(0, 10) === targetShonichiDateStr).map(s => s.id);
        if (targetSenshurakuDateStr) {
            senshurakuScheduleIds = schedules.filter(s => s.tanggal_waktu.substring(0, 10) === targetSenshurakuDateStr).map(s => s.id);
        }
    }

    function formatTgl(isoStr) {
        if (!isoStr) return 'TBA'; const d = new Date(isoStr);
        return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    }

    const tglShonichiStr = formatTgl(finalShonichi);
    const tglSenshurakuStr = isActive ? 'Sekarang (Active)' : formatTgl(finalSenshuraku);
    const activeBadge = isActive ? `<span style="background-color:${warnaTema}; color:white; padding:3px 8px; font-size:0.4em; border-radius:5px; vertical-align:middle; margin-left:10px; position:relative; top:-5px;">ACTIVE</span>` : '';

    // =========================================================================
    // SMART CHUNKING: MENGAMBIL PARTISIPAN & STATUS CENTER DARI JADWAL SHOW
    // =========================================================================
    let membersData = [];
    if (scheduleIds.length > 0) {
        const chunkSize = 40; 
        for (let i = 0; i < scheduleIds.length; i += chunkSize) {
            const chunk = scheduleIds.slice(i, i + chunkSize);
            const { data, error } = await supabaseClient
                .from('performing_members')
                .select('schedule_id, is_center, members(id, nama, nama_panggilan, status, team, generasi)') 
                .in('schedule_id', chunk);
                
            if (data) membersData.push(...data);
        }
    }

    let shonichiMembers = [];
    let senshurakuMembers = [];
    let allMembersMap = {}; 

    if (membersData && membersData.length > 0) {
        membersData.forEach(item => {
            if (!item.members) return;
            const m = item.members;
            const schedId = item.schedule_id;
            const sched = schedules.find(s => s.id === schedId);

            // Merekam First Appearance
            if (sched) {
                if (!allMembersMap[m.id]) {
                    allMembersMap[m.id] = { member: m, firstAppearance: sched.tanggal_waktu };
                } else {
                    if (new Date(sched.tanggal_waktu) < new Date(allMembersMap[m.id].firstAppearance)) {
                        allMembersMap[m.id].firstAppearance = sched.tanggal_waktu;
                    }
                }
            }

            // Memasukkan ke Shonichi beserta status Center
            if (shonichiScheduleIds.includes(schedId) && !shonichiMembers.some(sm => sm.id === m.id)) {
                shonichiMembers.push({ ...m, is_center: item.is_center });
            }
            
            // Memasukkan ke Senshuraku beserta status Center
            if (senshurakuScheduleIds.includes(schedId) && !senshurakuMembers.some(sm => sm.id === m.id)) {
                senshurakuMembers.push({ ...m, is_center: item.is_center });
            }
        });
    }

    shonichiMembers.sort((a,b) => a.nama.localeCompare(b.nama));
    senshurakuMembers.sort((a,b) => a.nama.localeCompare(b.nama));
    
    let allMemArr = Object.values(allMembersMap).sort((a,b) => {
        const timeA = new Date(a.firstAppearance).getTime();
        const timeB = new Date(b.firstAppearance).getTime();
        if (timeA !== timeB) return timeA - timeB; 
        return a.member.nama.localeCompare(b.member.nama); 
    });

    // =========================================================================
    // FITUR LINK TIM DINAMIS
    // =========================================================================
    let teamLinkHtml = `<strong>${namaTeam}</strong>`;
    if (namaTeam) {
        const { data: teamDataLookup } = await supabaseClient.from('teams').select('id').eq('nama', namaTeam).maybeSingle();
        if (teamDataLookup) {
            teamLinkHtml = `<a href="javascript:void(0)" onclick="if(typeof muatDetailTeam === 'function') muatDetailTeam('${teamDataLookup.id}')" style="color:${warnaTema}; text-decoration:none; font-weight:bold; border-bottom: 1px dashed ${warnaTema}; transition:0.2s;" onmouseover="this.style.color='#004080'; this.style.borderBottomColor='#004080'" onmouseout="this.style.color='${warnaTema}'; this.style.borderBottomColor='${warnaTema}'">${namaTeam}</a>`;
        }
    }

    // =========================================================================
    // MULAI RENDER HALAMAN
    // =========================================================================
    let html = '';
    
    // POSTER DI SAMPING GENERAL INFO (DENGAN TINGGI NATURAL)
    let posterHtml = '';
    if (stageMaster.poster_url) {
        posterHtml = `<img src="${stageMaster.poster_url}" style="width: 120px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.15); display: block; flex-shrink: 0;">`;
    }

    let ketHtmlDetail = stageMaster.keterangan ? `<p style="margin:0; font-size:1.1em; color:#333; font-weight:bold;">${stageMaster.keterangan}</p>` : `<p style="margin:0; font-size:1.1em; color:#555; font-weight:bold;">Keterangan: <span style="color:${warnaTema};">${keteranganStageDinamic}</span></p>`;

    html += `
        <div style="border-bottom: 3px solid ${warnaTema}; padding-bottom: 15px; margin-bottom: 25px;">
            <h1 style="color:${warnaTema}; margin:0 0 5px 0; font-size:2.2em;">${namaStage} ${activeBadge}</h1>
            ${stageMaster.nama_jepang ? `<p style="margin:0 0 5px 0; color:#888; font-style:italic; font-size:1.1em;">${stageMaster.nama_jepang}</p>` : ''}
            ${ketHtmlDetail}
        </div>
        
        <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 30px; align-items: flex-start;">
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 5px solid ${warnaTema};">
                <ul style="list-style:none; padding:0; margin:0; line-height:1.8; color:#444;">
                    <li><strong>Stage Name:</strong> ${namaStage}</li>
                    <li><strong>Team:</strong> ${teamLinkHtml}</li>
                    <li><strong>Shonichi / Senshuraku:</strong> ${tglShonichiStr} - ${tglSenshurakuStr}</li>
                    <li>
                        <strong>Total Performances:</strong> 
                        <a href="javascript:void(0)" onclick="window.muatDaftarPerformanceStage('${namaStage.replace(/'/g, "\\'")}', '${namaTeam}', '${warnaTema}')" style="color:${warnaTema}; text-decoration:none; border-bottom: 1px dashed ${warnaTema}; font-weight:bold; margin-left:5px;">
                            ${totalPerf} Shows (Lihat Daftar Show &#10140;)
                        </a>
                    </li>
                    ${stageMaster.catatan ? `<li style="margin-top:10px; padding-top:10px; border-top:1px dashed #ccc; color:#666;"><strong>Notes:</strong><br>${stageMaster.catatan.replace(/\n/g, '<br>')}</li>` : ''}
                </ul>
            </div>
            ${posterHtml}
        </div>
    `;

    html += `<h3 style="color:${warnaTema}; border-bottom: 1px solid #eee; padding-bottom:10px;">&#127925; Setlist</h3>`;

    if (typeof isLocalhost === 'function' && isLocalhost()) {
        const safeJudulStage = namaStage.replace(/'/g, "\\'");
        const safeNamaTeam = namaTeam.replace(/'/g, "\\'");
        
        if (isMaster) {
            html += `
                <div style="background:#f1f5f9; padding:15px; margin-bottom:20px; border-radius:8px; border: 1px dashed ${warnaTema};">
                    <h4 style="margin-top:0; color:#334155; font-size:0.95em;">&#9881;&#65039; Mode Admin: Tambah/Ubah Lagu & Unit</h4>
                    <input type="hidden" id="adm-master-stagesong-id">
                    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
                        <input type="number" id="adm-master-track" placeholder="Track (1,2,3)" style="width:100px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <input list="adm-master-song-list" id="adm-master-song-input" placeholder="Ketik / Pilih Judul Lagu Master..." style="flex:1; min-width:200px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <datalist id="adm-master-song-list"></datalist>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <input type="text" id="adm-master-unit" placeholder="Member Unit (Contoh: Aurellia, Grace, Michelle)" style="flex:1; min-width:200px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <button id="btn-submit-lagu-master" onclick="window.adminTambahLaguMaster('${stageMaster.id}', '${warnaTema}', '${safeJudulStage}', '${safeNamaTeam}')" style="background:#28a745; color:white; border:none; padding:6px 15px; cursor:pointer; border-radius:4px; font-weight:bold;">+ Tambah Lagu / Simpan</button>
                        <button id="btn-cancel-lagu-master" onclick="window.adminBatalEditLaguMaster()" style="display:none; background:#666; color:white; border:none; padding:6px 15px; cursor:pointer; border-radius:4px; font-weight:bold;">Batal</button>
                    </div>
                </div>
            `;
            setTimeout(async () => {
                const { data: listLagu } = await supabaseClient.from('songs').select('id, judul_lagu').order('judul_lagu');
                const dl = document.getElementById('adm-master-song-list');
                if (dl && listLagu) {
                    dl.innerHTML = '';
                    window.mapLaguMasterCache = {};
                    listLagu.forEach(lg => {
                        window.mapLaguMasterCache[lg.judul_lagu.trim().toLowerCase()] = lg.id;
                        dl.innerHTML += `<option value="${lg.judul_lagu}">`;
                    });
                }
            }, 500);
        } else {
            html += `
                <div style="background:#fff3cd; padding:15px; margin-bottom:20px; border-radius:8px; border: 1px dashed #856404; color: #856404;">
                    <strong>&#9888;&#65039; Mode Admin Terbatas:</strong> Setlist ini belum didaftarkan di tabel Master Data Stage. Silakan kembali ke menu "Stage" dan buat Master untuk Setlist ini terlebih dahulu agar fitur edit lagu & unit bisa terbuka.
                </div>
            `;
        }
    }

    let songsData = [];
    const shonichiScheduleIdForSongs = shonichiScheduleIds.length > 0 ? shonichiScheduleIds[0] : null;

    if (stageMaster.id) {
        const { data } = await supabaseClient
            .from('stage_songs')
            .select('id, track_number, keterangan_unit, song_id, songs(id, judul_lagu, tipe_lagu)')
            .eq('stage_id', stageMaster.id)
            .order('track_number', { ascending: true });
        songsData = data;
    } else if (shonichiScheduleIdForSongs) {
        const { data } = await supabaseClient
            .from('schedule_songs')
            .select('track_number, song_id, songs(id, judul_lagu, tipe_lagu)')
            .eq('schedule_id', shonichiScheduleIdForSongs)
            .order('track_number', { ascending: true });
        songsData = data;
    }

    if (songsData && songsData.length > 0) {
        html += `<ul style="list-style:none; padding:0; margin:0 0 30px 0;">`;
        songsData.forEach((item, idx) => {
            const lagu = item.songs; if(!lagu) return;
            const trackNo = item.track_number ? String(item.track_number).padStart(2, '0') : String(idx + 1).padStart(2, '0');
            const unitBadge = (lagu.tipe_lagu && lagu.tipe_lagu.toLowerCase() === 'unit') ? `<span style="background:#ff9800; color:white; font-size:0.7em; padding:2px 6px; border-radius:4px; margin-left:10px;">UNIT</span>` : '';
            
            // FITUR LINK JUDUL LAGU KE MENU DISCOGRAPHY
            const safeSongId = lagu.id || item.song_id;
            let judulLaguHtml = `<strong style="font-size:1.05em; color:#333;">${lagu.judul_lagu}</strong>`;
            if (safeSongId) {
                judulLaguHtml = `<a href="javascript:void(0)" onclick="window.muatDetailLaguDariStage('${safeSongId}')" style="font-size:1.05em; font-weight:bold; color:#004080; text-decoration:none; transition:0.2s;" onmouseover="this.style.color='${warnaTema}'; this.style.textDecoration='underline'" onmouseout="this.style.color='#004080'; this.style.textDecoration='none'">${lagu.judul_lagu}</a>`;
            }

            let unitText = '';
            if (item.keterangan_unit) {
                const memberNames = item.keterangan_unit.split(',').map(n => n.trim());
                const linkedNames = memberNames.map(name => {
                    const found = allMemArr.find(m => {
                        const panggil = (m.member.nama_panggilan || '').toLowerCase();
                        const lengkap = (m.member.nama || '').toLowerCase();
                        const search = name.toLowerCase();
                        return panggil === search || lengkap.includes(search);
                    });
                    if (found) {
                        return `<a href="javascript:void(0)" onclick="if(typeof muatDetailMemberById === 'function') muatDetailMemberById('${found.member.id}')" style="color:#004080; text-decoration:none; border-bottom: 1px dashed #004080; transition:0.2s;" onmouseover="this.style.color='${warnaTema}'; this.style.borderBottomColor='${warnaTema}'" onmouseout="this.style.color='#004080'; this.style.borderBottomColor='#004080'">${name}</a>`;
                    }
                    return name; 
                });
                unitText = `<div style="font-size:0.85em; color:#555; margin-left:45px; margin-top:5px; font-weight:600;">&#8618; &nbsp;${linkedNames.join(', ')}</div>`;
            }

            let btnUbah = ''; let btnHapus = '';
            if (typeof isLocalhost === 'function' && isLocalhost() && isMaster) {
                const safeJudul = lagu.judul_lagu.replace(/'/g, "\\'");
                const safeUnit = item.keterangan_unit ? item.keterangan_unit.replace(/'/g, "\\'") : '';
                const safeJudulStage = namaStage.replace(/'/g, "\\'");
                const safeNamaTeam = namaTeam.replace(/'/g, "\\'");
                btnUbah = `<button onclick="window.adminEditLaguMaster('${item.id}', '${item.track_number || ''}', '${safeJudul}', '${safeUnit}')" style="background:#ff9800; color:white; border:none; padding:2px 6px; border-radius:3px; font-size:0.7em; cursor:pointer; margin-left:10px;">Ubah</button>`;
                btnHapus = `<button onclick="window.adminHapusLaguMaster('${item.id}', '${stageMaster.id}', '${warnaTema}', '${safeJudulStage}', '${safeNamaTeam}')" style="background:#e53935; color:white; border:none; padding:2px 6px; border-radius:3px; font-size:0.7em; cursor:pointer; margin-left:5px;">Hapus</button>`;
            }

            html += `<li style="padding: 12px 0; border-bottom: 1px dashed #e2e8f0; color: #444;">
                        <div style="display: flex; align-items: center; flex-wrap: wrap;">
                            <span style="color:#999; font-weight:bold; font-size:1.05em; width:45px; flex-shrink:0;">M${trackNo}.</span> 
                            ${judulLaguHtml} 
                            ${unitBadge} 
                            <div style="margin-left: auto;">${btnUbah}${btnHapus}</div>
                        </div>
                        ${unitText}
                     </li>`;
        });
        html += `</ul>`;
    } else {
        html += `<p style="color:#888; font-style:italic; margin-bottom: 30px;">Data tracklist belum diinput di database.</p>`;
    }

    html += `<h3 style="color:${warnaTema}; border-bottom: 1px solid #eee; padding-bottom:10px; margin-bottom: 15px; margin-top:30px;">&#128101; Participating Members</h3>`;

    // FUNGSI RENDER GRID (TATA LETAK PRESISI + CROWN & BADGE CENTER)
    const renderMemberGrid = (membersArr) => {
        if (membersArr.length === 0) return `<p style="color:#888; font-style:italic; padding-left:15px; margin-bottom:20px;">Belum ada data.</p>`;
        
        let containerMaxWidth = '100%';
        if (membersArr.length === 16) containerMaxWidth = '750px'; 
        else if (membersArr.length === 12) containerMaxWidth = '560px'; 
        else containerMaxWidth = '850px'; 

        let gridHtml = `<div style="display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 15px; max-width: ${containerMaxWidth}; margin: 0 0 25px 0;">`;
        
        membersArr.forEach(m => {
            const namaPendek = m.nama_panggilan || m.nama.split(' ')[0];
            const isGraduated = (m.status || '').toLowerCase().includes('graduated');
            let imgStyle = `width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 3px solid ${warnaTema}; box-shadow: 0 0 5px ${warnaTema}66;`;
            
            if(isGraduated) imgStyle += ` filter: grayscale(100%); opacity: 0.8;`;
            
            const imgHtml = generateMemberImageHtml(m, null, null, null, imgStyle, '');
            
            // FITUR MAHKOTA DAN BADGE GLOBAL CENTER
            let crownHtml = '';
            let marginBawah = '';
            if (m.is_center) {
                crownHtml = `
                    <div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); font-size:1.4em; z-index:3; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));" title="Global Center">&#128081;</div>
                    <div style="position:absolute; bottom:-10px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; z-index:4; align-items:center; width:max-content;">
                        <span style="background: linear-gradient(135deg, #ffd700, #ffaa00); font-size: 0.55em; padding: 2px 6px; border-radius: 4px; color: white; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); border: 1px solid white; white-space: nowrap; line-height: 1;">CENTER</span>
                    </div>
                `;
                marginBawah = 'margin-bottom: 12px;'; 
            }

            gridHtml += `
                <div style="text-align:center; cursor:pointer; width: 80px;" onclick="if(typeof muatDetailMemberById === 'function') muatDetailMemberById('${m.id}')">
                    <div style="position:relative; width:80px; height:80px; margin:0 auto; ${marginBawah}">
                        ${crownHtml}
                        ${imgHtml}
                    </div>
                    <p style="color:${isGraduated ? '#64748b' : warnaTema}; margin: 5px 0 0 0; font-size:0.85em; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${namaPendek}">${namaPendek}</p>
                </div>
            `;
        });
        gridHtml += `</div>`;
        return gridHtml;
    };

    html += `<h4 style="margin:0 0 10px 0; color:#555; text-align:left;">&#9656; Shonichi</h4>`;
    html += renderMemberGrid(shonichiMembers);

    if (senshurakuScheduleIds.length > 0 || stageMaster.tanggal_senshuraku) {
        html += `<h4 style="margin:0 0 10px 0; color:#555; text-align:left;">&#9656; Senshuraku</h4>`;
        html += renderMemberGrid(senshurakuMembers);
    }

    html += `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; margin-top: 30px;">
            <h4 style="margin:0; color:#555;">&#9656; All Performing Members (${allMemArr.length})</h4>
            <button onclick="const tbl = document.getElementById('wrapper-all-members'); tbl.style.display = (tbl.style.display === 'none' ? 'block' : 'none');" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; padding:6px 12px; cursor:pointer; color:#334155; font-weight:bold; font-size:0.8em; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Lihat / Sembunyikan Tabel</button>
        </div>
    `;

    if (allMemArr.length > 0) {
        html += `
        <div id="wrapper-all-members" style="display:none; overflow-x: auto; border-radius: 4px; border: 1px solid #ccc; margin-bottom:30px;">
            <table class="wikitable sortable" style="width: 100%; border-collapse: collapse; font-size: 0.85em; background: #fff; text-align: center;">
                <thead style="background-color: #f1f5f9; color: #333; border-bottom: 2px solid #ccc;">
                    <tr>
                        <th style="padding: 10px; border: 1px solid #ccc;">Generasi</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align:left;">Member</th>
                        <th style="padding: 10px; border: 1px solid #ccc;">Shonichi</th>
                        <th style="padding: 10px; border: 1px solid #ccc;">Keterangan</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        allMemArr.forEach(item => {
            const m = item.member;
            const isGrad = m.status.toLowerCase().includes('grad') ? 'Graduated' : '';
            const tColor = getTeamColor(m.team) || '#ccc';
            
            let genDisplay = m.generasi ? m.generasi : '-';
            if(genDisplay !== '-' && !genDisplay.toString().toLowerCase().includes('gen')) {
                genDisplay = 'Gen ' + genDisplay;
            }
            
            const tBadge = `<span style="background:${tColor}; color:white; padding:3px 6px; border-radius:4px; font-weight:bold;">${genDisplay}</span>`;
            const firstAppDate = new Date(item.firstAppearance).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
            const renderTableMember = `<a href="javascript:void(0)" onclick="muatDetailMemberById('${m.id}')" style="color:${warnaTema}; text-decoration:none; font-weight:bold;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${m.nama}</a>`;
            
            html += `
                <tr style="border-bottom:1px solid #eee; transition:0.2s;" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='#fff'">
                    <td style="padding: 8px; border: 1px solid #ccc;">${tBadge}</td>
                    <td style="padding: 8px; border: 1px solid #ccc; text-align:left;">${renderTableMember}</td>
                    <td style="padding: 8px; border: 1px solid #ccc;">${firstAppDate}</td>
                    <td style="padding: 8px; border: 1px solid #ccc; color:#e53935; font-weight:bold;">${isGrad}</td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    }

    // FOTO DOKUMENTASI 
    if (stageMaster.foto_shonichi_url || stageMaster.foto_senshuraku_url) {
        html += `<h3 style="color:${warnaTema}; border-bottom: 1px solid #eee; padding-bottom:10px; margin-bottom: 15px; margin-top:30px;">&#128248; Foto Dokumentasi</h3>`;
        html += `
            <div style="display:flex; justify-content:flex-end; margin-bottom: 15px;">
                <button onclick="const box = document.getElementById('wrapper-foto-stage'); box.style.display = (box.style.display === 'none' ? 'flex' : 'none');" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; padding:6px 12px; cursor:pointer; color:#334155; font-weight:bold; font-size:0.8em; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Lihat / Sembunyikan Foto</button>
            </div>
            
            <div id="wrapper-foto-stage" style="display:flex; gap: 20px; flex-wrap: wrap; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #eee; margin-bottom:30px;">
        `;
        
        if (stageMaster.foto_shonichi_url) {
            html += `
                <div style="flex: 1; min-width: 300px;">
                    <h5 style="color:#555; margin: 0 0 10px 0; font-size: 1.1em;">Shonichi</h5>
                    <img src="${stageMaster.foto_shonichi_url}" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); object-fit: cover;">
                </div>
            `;
        }
        
        if (stageMaster.foto_senshuraku_url) {
            html += `
                <div style="flex: 1; min-width: 300px;">
                    <h5 style="color:#555; margin: 0 0 10px 0; font-size: 1.1em;">Senshuraku</h5>
                    <img src="${stageMaster.foto_senshuraku_url}" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); object-fit: cover;">
                </div>
            `;
        }
        
        html += `</div>`;
    }

    // SECTION BANNER DI FOOTER
    if (stageMaster.banner_url) {
        html += `<h3 style="color:${warnaTema}; border-bottom: 1px solid #eee; padding-bottom:10px; margin-bottom: 15px; margin-top:30px;">&#128444;&#65039; Banner</h3>`;
        html += `
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="${stageMaster.banner_url}" alt="Banner Stage" style="width: 100%; max-width: 900px; border-radius: 12px; object-fit: cover; display: block; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
            </div>
        `;
    }

    container.innerHTML = html;
}

// ============================================================================
// 5. ADMIN LOKAL: SIMPAN, UBAH & HAPUS LAGU MASTER (DIKEMBALIKAN & DISAMBUNGKAN)
// ============================================================================
window.adminEditLaguMaster = function(stageSongId, trackNo, songJudul, unitKet) {
    document.getElementById('adm-master-stagesong-id').value = stageSongId;
    document.getElementById('adm-master-track').value = trackNo;
    document.getElementById('adm-master-song-input').value = songJudul;
    document.getElementById('adm-master-unit').value = unitKet;
    
    const btnSubmit = document.getElementById('btn-submit-lagu-master');
    if(btnSubmit) {
        btnSubmit.innerText = 'Simpan Perubahan';
        btnSubmit.style.background = '#ff9800';
    }
    
    const btnCancel = document.getElementById('btn-cancel-lagu-master');
    if(btnCancel) btnCancel.style.display = 'block';
    
    const inputTrack = document.getElementById('adm-master-track');
    if(inputTrack) window.scrollTo(0, inputTrack.offsetTop - 100);
};

window.adminBatalEditLaguMaster = function() {
    document.getElementById('adm-master-stagesong-id').value = '';
    document.getElementById('adm-master-track').value = '';
    document.getElementById('adm-master-song-input').value = '';
    document.getElementById('adm-master-unit').value = '';
    
    const btnSubmit = document.getElementById('btn-submit-lagu-master');
    if(btnSubmit) {
        btnSubmit.innerText = '+ Tambah Lagu / Simpan';
        btnSubmit.style.background = '#28a745';
    }
    
    const btnCancel = document.getElementById('btn-cancel-lagu-master');
    if(btnCancel) btnCancel.style.display = 'none';
};

window.adminTambahLaguMaster = async function(stageId, warnaTema, namaStage, namaTeam) {
    const editId = document.getElementById('adm-master-stagesong-id').value;
    const trackNo = document.getElementById('adm-master-track').value;
    const inputJudulRaw = document.getElementById('adm-master-song-input').value;
    const unitKet = document.getElementById('adm-master-unit').value;
    
    if(!inputJudulRaw) return alert('Pilih atau ketik judul lagu master terlebih dahulu!');
    
    const inputJudul = inputJudulRaw.trim();
    const inputJudulLower = inputJudul.toLowerCase();
    
    // Cari songId di cache (case-insensitive)
    let songId = window.mapLaguMasterCache ? window.mapLaguMasterCache[inputJudulLower] : null;
    
    // FITUR: Auto-Create jika lagu belum ada di Master
    if (!songId) {
        if(!confirm(`Lagu "${inputJudul}" belum ada di Master Database.\nApakah kamu ingin mendaftarkannya sebagai lagu baru otomatis?`)) return;
        
        const { data: newS, error: errNew } = await supabaseClient.from('songs')
            .insert([{ judul_lagu: inputJudul }])
            .select('id').single();
            
        if(errNew) return alert('Gagal buat lagu baru di master: ' + errNew.message);
        
        songId = newS.id;
        window.mapLaguMasterCache[inputJudulLower] = songId; // Update cache
    }
    
    const payload = {
        stage_id: stageId,
        song_id: songId,
        track_number: trackNo ? parseInt(trackNo) : null,
        keterangan_unit: unitKet || null
    };

    if (editId) {
        const { error } = await supabaseClient.from('stage_songs').update(payload).eq('id', editId);
        if(error) alert('Gagal mengubah lagu: ' + error.message);
        else {
            alert('Lagu & Unit berhasil diubah!');
            window.adminBatalEditLaguMaster();
            muatDetailStageMaster(stageId, warnaTema, true, namaTeam, window.asalHalamanStageGlobal);
        }
    } else {
        const { error } = await supabaseClient.from('stage_songs').insert([payload]);
        if(error) alert('Gagal menambahkan lagu: ' + error.message);
        else {
            alert('Lagu & Unit berhasil ditambahkan ke setlist!');
            document.getElementById('adm-master-track').value = '';
            document.getElementById('adm-master-song-input').value = '';
            document.getElementById('adm-master-unit').value = '';
            muatDetailStageMaster(stageId, warnaTema, true, namaTeam, window.asalHalamanStageGlobal);
        }
    }
};

window.adminHapusLaguMaster = async function(stageSongId, stageId, warnaTema, namaStage, namaTeam) {
    if(!confirm('Yakin ingin menghapus lagu ini dari setlist master?')) return;
    const { error } = await supabaseClient.from('stage_songs').delete().eq('id', stageSongId);
    if(error) alert('Gagal menghapus: ' + error.message);
    else muatDetailStageMaster(stageId, warnaTema, true, namaTeam, window.asalHalamanStageGlobal);
};


// ============================================================================
// 6. HALAMAN DAFTAR PERFORMANCES (TABEL SHOWS) DENGAN SMART CHUNKING
// ============================================================================
window.muatDaftarPerformanceStage = async function(namaStage, namaTeam, warnaTema) {
    bukaHalaman('view-stage-performances');
    
    document.getElementById('btn-back-stage-performances').onclick = () => window.muatDetailStage(namaStage, namaTeam, warnaTema, window.asalHalamanStageGlobal);
    
    const container = document.getElementById('info-stage-performances');
    container.innerHTML = '<div style="text-align:center; margin-top:50px;">Memuat daftar performance...</div>';
    window.scrollTo(0, 0);

    let querySchedules = supabaseClient
        .from('theater_schedules')
        .select('id, judul_show, tanggal_waktu, is_shonichi, is_senshuraku, lokasi, tipe_jadwal, tipe_jadwal_sekunder, foto_event')
        .eq('judul_show', namaStage)
        .order('tanggal_waktu', { ascending: true });
        
    if (namaTeam && namaTeam !== '') {
        querySchedules = querySchedules.eq('team', namaTeam);
    }

    const { data: schedules, error } = await querySchedules;

    if (error || !schedules || schedules.length === 0) return container.innerHTML = `<p style="text-align:center; color:red;">Gagal memuat data jadwal.</p>`;

    const scheduleIds = schedules.map(s => s.id);
    
    // SMART CHUNKING UNTUK PERFORMANCES
    let membersData = [];
    if (scheduleIds.length > 0) {
        const chunkSize = 40;
        for (let i = 0; i < scheduleIds.length; i += chunkSize) {
            const chunk = scheduleIds.slice(i, i + chunkSize);
            const { data } = await supabaseClient
                .from('performing_members')
                .select('schedule_id, is_center, is_birthday, is_graduation, is_shonichi, members(nama, nama_panggilan)')
                .in('schedule_id', chunk);
            if (data) membersData.push(...data);
        }
    }

    let showDetailsMap = {};
    schedules.forEach(s => {
        showDetailsMap[s.id] = { center: [], sts: [], grad: [], shonichi: [] };
    });

    if (membersData && membersData.length > 0) {
        membersData.forEach(item => {
            if (item.members) {
                const namaPendek = item.members.nama_panggilan || item.members.nama.split(' ')[0];
                if (item.is_center) showDetailsMap[item.schedule_id].center.push(namaPendek);
                if (item.is_birthday) showDetailsMap[item.schedule_id].sts.push(namaPendek);
                if (item.is_graduation) showDetailsMap[item.schedule_id].grad.push(namaPendek);
                if (item.is_shonichi) showDetailsMap[item.schedule_id].shonichi.push(namaPendek);
            }
        });
    }

    let html = `
        <div style="border-bottom: 3px solid ${warnaTema}; padding-bottom: 15px; margin-bottom: 25px;">
            <h1 style="color:${warnaTema}; margin:0 0 5px 0; font-size:2.2em;">${namaStage}</h1>
            <p style="margin:0; font-size:1.1em; color:#555; font-weight:bold;">Team: ${namaTeam}</p>
        </div>
        
        <h3 style="color:${warnaTema}; margin-top:0; border-bottom: 1px solid #eee; padding-bottom: 10px;">&#127915; Performance List</h3>
        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em; background: #fff;">
                <thead>
                    <tr style="background-color: ${warnaTema}; color: white; text-align:center;">
                        <th style="padding: 12px; border: 1px solid #eee;">#</th>
                        <th style="padding: 12px; border: 1px solid #eee; text-align:left;">Hari, Tanggal</th>
                        <th style="padding: 12px; border: 1px solid #eee;">Waktu</th>
                        <th style="padding: 12px; border: 1px solid #eee;">Global Center</th>
                        <th style="padding: 12px; border: 1px solid #eee;">Shonichi</th>
                        <th style="padding: 12px; border: 1px solid #eee;">STS</th>
                        <th style="padding: 12px; border: 1px solid #eee;">Last Show</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let showCounter = 1;
    const now = new Date();
    schedules.forEach(j => {
        const tgl = new Date(j.tanggal_waktu);
        if (tgl <= now) {
            const formatHari = tgl.toLocaleDateString('id-ID', { weekday: 'long' });
            const formatTglLengkap = tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const formatJam = tgl.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }).replace('.', ':');
            
            const formatWaktuFull = `${formatHari}, ${formatTglLengkap} | Pukul ${formatJam} WIB`;
            const judulAman = j.judul_show.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const lokasiAman = (j.lokasi || '').replace(/'/g, "\\'");
            const tipeAman = (j.tipe_jadwal || 'Theater').replace(/'/g, "\\'");
            const sekunderAman = (j.tipe_jadwal_sekunder || '').replace(/'/g, "\\'");
            const fotoAman = (j.foto_event || '').replace(/'/g, "\\'");
            
            const clickAction = `muatDetailJadwal('${j.id}', '${judulAman}', '${formatWaktuFull}', '${lokasiAman}', '${tipeAman}', '${fotoAman}', '${sekunderAman}')`;

            const details = showDetailsMap[j.id];
            const centerTxt = details.center.length > 0 ? details.center.join(', ') : '-';
            const shonichiTxt = details.shonichi.length > 0 ? details.shonichi.join(', ') : '-';
            const stsTxt = details.sts.length > 0 ? details.sts.join(', ') : '-';
            const gradTxt = details.grad.length > 0 ? details.grad.join(', ') : '-';

            html += `
                <tr style="border-bottom: 1px solid #eee; background-color: #fff; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='#fff'">
                    <td style="padding: 10px; text-align: center; color: #555; font-weight:bold;">${showCounter}</td>
                    <td style="padding: 10px;">
                        <a href="javascript:void(0)" onclick="${clickAction}" style="color: ${warnaTema}; text-decoration: none; font-weight: bold; border-bottom: 1px solid transparent; transition:0.2s;" onmouseover="this.style.borderBottom='1px solid ${warnaTema}'" onmouseout="this.style.borderBottom='1px solid transparent'">
                            ${formatHari}, ${formatTglLengkap}
                        </a>
                    </td>
                    <td style="padding: 10px; text-align: center; color: #666; font-weight: bold;">${formatJam}</td>
                    <td style="padding: 10px; text-align: center; color: #d4af37; font-weight: bold;">${centerTxt}</td>
                    <td style="padding: 10px; text-align: center; color: #00bcd4; font-weight: bold;">${shonichiTxt}</td>
                    <td style="padding: 10px; text-align: center; color: #4caf50; font-weight: bold;">${stsTxt}</td>
                    <td style="padding: 10px; text-align: center; color: #e53935; font-weight: bold;">${gradTxt}</td>
                </tr>
            `;
            showCounter++;
        }
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
};
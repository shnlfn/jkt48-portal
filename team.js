let dataSemuaTeam = [];

function bukaTabTim(tabName, event, warnaTimFix) {
    let i, tabcontent, tablinks;
    
    tabcontent = document.getElementsByClassName("team-tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    
    tablinks = document.getElementsByClassName("team-tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].style.backgroundColor = '#eee';
        tablinks[i].style.color = '#333';
    }
    
    const targetTab = document.getElementById(tabName);
    if(targetTab) targetTab.style.display = "block";
    
    if(event && event.currentTarget) {
        event.currentTarget.style.backgroundColor = warnaTimFix;
        event.currentTarget.style.color = 'white';
    }
}

async function muatDaftarTeam() {
    const container = document.getElementById('list-teams');
    const loading = document.getElementById('loading-teams');
    
    if (dataSemuaTeam.length === 0) {
        loading.style.display = 'block';
        const { data, error } = await supabaseClient.from('teams').select('*').order('tanggal_dibentuk', { ascending: true });
        loading.style.display = 'none';
        
        if (error) return container.innerHTML = `<p style="color:red; text-align:center; width:100%;">Gagal memuat tim: ${error.message}</p>`;
        if (!data || data.length === 0) return container.innerHTML = `<p style="color:#666; text-align:center; width:100%;">Belum ada data tim.</p>`;
        
        dataSemuaTeam = data;
    }
    
    container.innerHTML = '';
    dataSemuaTeam.forEach(team => {
        const div = document.createElement('div');
        div.className = 'list-item'; 
        div.style.textAlign = 'center';
        div.style.padding = '20px';
        div.style.cursor = 'pointer';
        div.style.flexDirection = 'column';
        
        const warnaTimFix = getTeamColor(team.nama) || team.warna || '#ccc';
        div.style.borderBottom = `5px solid ${warnaTimFix}`;
        div.onclick = () => muatDetailTeam(team.id);
        
        const tahunBentuk = team.tanggal_dibentuk ? team.tanggal_dibentuk.split('-')[0] : '?';
        const tahunBubar = team.tanggal_bubar ? team.tanggal_bubar.split('-')[0] : 'Sekarang';
        const namaFormat = team.nama.toLowerCase().trim().replace(/\s+/g, '_'); 
        const lokalFotoSrc = `images/teams/${namaFormat}.jpg`;
        
        div.innerHTML = `
            <img src="${lokalFotoSrc}" onerror="this.onerror=null; this.src='favicon.png';" alt="${team.nama}" style="width:100px; height:100px; object-fit:cover; border-radius:50%; margin-bottom:10px; border: 3px solid ${warnaTimFix};">
            <h3 style="color:${warnaTimFix}; margin:0 0 5px 0;">${team.nama}</h3>
            <p style="font-size:0.85em; color:#666; margin:0; font-weight:bold;">${tahunBentuk} - ${tahunBubar}</p>
        `;
        container.appendChild(div);
    });
}

async function muatDetailTeam(teamId) {
    bukaHalaman('view-team-detail');
    const container = document.getElementById('info-detail-team');
    container.innerHTML = '<p style="text-align:center;">Memuat data sejarah tim...</p>';
    
    const team = dataSemuaTeam.find(t => String(t.id) === String(teamId));
    if(!team) return container.innerHTML = '<p style="text-align:center; color:red;">Gagal menemukan data tim.</p>';

    const warnaTimFix = getTeamColor(team.nama) || team.warna || '#d81b60';

    const { data: captains } = await supabaseClient.from('team_captains').select('*, members(id, nama, nama_panggilan, status, generasi)').eq('team_id', team.id).order('urutan', { ascending: true });
    let activeTeamCaptainIds = [];
    if (captains) activeTeamCaptainIds = captains.filter(c => !c.tanggal_selesai && c.member_id).map(c => c.member_id);
        
    const { data: teamMembers } = await supabaseClient.from('members').select('*').eq('team', team.nama).not('status', 'ilike', '%Graduated%').not('status', 'ilike', '%Resign%').not('status', 'ilike', '%Dismissed%').order('nama', { ascending: true });
    const { data: historyData } = await supabaseClient.from('member_team_history').select('status_keluar, tanggal_selesai, members(id, nama, nama_panggilan, status, generasi)').eq('team_id', team.id).order('tanggal_selesai', { ascending: false, nullsFirst: false });

    const { data: teamSchedules } = await supabaseClient.from('theater_schedules')
        .select('id, judul_show, tanggal_waktu, is_shonichi, is_senshuraku, tipe_jadwal')
        .eq('team', team.nama).order('tanggal_waktu', { ascending: true });

    let isDisbanded = team.tanggal_bubar ? true : false;

    let captainHtml = '';
    if (captains && captains.length > 0) {
        captainHtml = '<div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">';
        captains.forEach((c, index) => {
            const styleImgCaptain = `width: 60px; height: 60px; object-fit: cover; border-radius: 50%; border: 2px solid ${warnaTimFix};`;
            const imgHtml = c.members ? generateMemberImageHtml(c.members, null, null, null, styleImgCaptain, '') : `<img src="favicon.png" style="width:60px; height:60px; object-fit:cover; border-radius:50%; background-color:${warnaTimFix};">`;
            
            const mulai = c.tanggal_mulai ? formatTanggalIndo(c.tanggal_mulai) : '?';
            const selesai = c.tanggal_selesai ? formatTanggalIndo(c.tanggal_selesai) : 'Sekarang';
            const aksiKlik = c.members?.id ? `onclick="muatDetailMemberById('${c.members.id}')"` : '';
            const namaCaptain = c.members ? (c.members.nama_lengkap || c.members.nama) : c.nama_captain;

            captainHtml += `
                <div style="display:flex; align-items:center; background:#f9f9f9; padding:10px 15px; border-radius:8px; border-left:4px solid ${warnaTimFix}; cursor:pointer;" ${aksiKlik}>
                    <div style="font-size:1.2em; font-weight:bold; color:#ccc; min-width:30px;">#${index+1}</div>
                    <div style="margin-right:15px; width: 60px; height: 60px;">${imgHtml}</div>
                    <div>
                        <h4 style="margin:0 0 5px 0; color:${warnaTimFix};">${namaCaptain}</h4>
                        <p style="margin:0; font-size:0.85em; color:#666;">${mulai} &mdash; ${selesai}</p>
                    </div>
                </div>
            `;
        });
        captainHtml += '</div>';
    }

    let currentHtml = ''; let transferredHtml = ''; let graduatedHtml = '';
    let countCurrent = 0; let countT = 0; let countG = 0;

    if (teamMembers && teamMembers.length > 0) {
        countCurrent = teamMembers.length;
        currentHtml = `<div class="grid-members-mini" style="margin-top: 15px;">`;
        teamMembers.forEach(m => {
            const namaPendek = m.nama_panggilan || m.nama.split(' ')[0];
            const statusMember = (m.status || '').toLowerCase();
            let isThisTeamCaptain = activeTeamCaptainIds.includes(m.id) || statusMember.includes('captain');
            let crown = isThisTeamCaptain ? `<div style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-size:1.2em; z-index:2; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">&#127894;&#65039;</div>` : '';
            
            const isHiatus = statusMember.includes('hiatus'); const isSuspended = statusMember.includes('suspended');
            let extraStyle = (isHiatus || isSuspended) ? 'filter: grayscale(100%); opacity: 0.7;' : '';
            
            let imgStyle = `width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 3px solid ${warnaTimFix}; box-shadow: 0 0 10px ${warnaTimFix}99; ${extraStyle}`;
            const imgHtml = generateMemberImageHtml(m, null, null, null, imgStyle, '');
            
            let namaTercoret = isSuspended ? `text-decoration: line-through; opacity: 0.6;` : ``;

            currentHtml += `
                <div style="text-align:center; cursor:pointer;" onclick="muatDetailMemberById('${m.id}')">
                    <div style="position:relative; width:80px; height:80px; margin:0 auto;">${crown}${imgHtml}</div>
                    <p style="color:${warnaTimFix}; font-weight:bold; font-size:0.85em; margin-top:5px; ${namaTercoret}">${namaPendek}</p>
                </div>
            `;
        });
        currentHtml += '</div>';
    }

    if (historyData && historyData.length > 0) {
        transferredHtml = '<div class="grid-members-mini" style="margin-top: 15px;">';
        graduatedHtml = '<div class="grid-members-mini" style="margin-top: 15px;">';

        historyData.forEach(h => {
            if(!h.members) return; const m = h.members;
            const namaPendek = m.nama_panggilan || m.nama.split(' ')[0];
            
            let styleImgHistory = `width: 80px; height: 80px; object-fit: cover; border-radius: 50%; filter: grayscale(50%); border: 2px solid #ccc;`;
            const imgHtml = generateMemberImageHtml(m, null, null, null, styleImgHistory, '');

            let cardStr = `
                <div style="text-align:center; cursor:pointer;" onclick="muatDetailMemberById('${m.id}')">
                    <div style="position:relative; width:80px; height:80px; margin:0 auto;">${imgHtml}</div>
                    <p style="color:#666; font-weight:bold; font-size:0.85em; margin-top:5px;">${namaPendek}</p>
                </div>
            `;

            if (h.status_keluar === 'Transferred') { transferredHtml += cardStr; countT++; }
            else if (h.status_keluar === 'Graduated' || h.status_keluar === 'Resigned' || h.status_keluar === 'Dismissed' || h.status_keluar === 'Canceled') { graduatedHtml += cardStr; countG++; }
        });

        transferredHtml += '</div>'; graduatedHtml += '</div>';
    }

    let membersTabberHtml = '';
    let activeTab = countCurrent > 0 ? 'current' : (countT > 0 ? 'transferred' : (countG > 0 ? 'graduated' : 'none'));

    if (countCurrent > 0 || countT > 0 || countG > 0) {
        let tabsButtons = ''; let tabsContent = '';
        const btnStyle = "padding:8px 15px; border:none; border-radius:5px; font-weight:bold; cursor:pointer; margin-right:5px; margin-bottom:10px;";

        if (countCurrent > 0) {
            tabsButtons += `<button class="team-tab-btn" style="${btnStyle} background:${activeTab === 'current' ? warnaTimFix : '#eee'}; color:${activeTab === 'current' ? 'white' : '#333'};" onclick="bukaTabTim('tab-current', event, '${warnaTimFix}')">Current (${countCurrent})</button>`;
            tabsContent += `<div id="tab-current" class="team-tab-content" style="display:${activeTab === 'current' ? 'block' : 'none'};">${currentHtml}</div>`;
        }
        if (countT > 0) {
            tabsButtons += `<button class="team-tab-btn" style="${btnStyle} background:${activeTab === 'transferred' ? warnaTimFix : '#eee'}; color:${activeTab === 'transferred' ? 'white' : '#333'};" onclick="bukaTabTim('tab-transferred', event, '${warnaTimFix}')">Transferred (${countT})</button>`;
            tabsContent += `<div id="tab-transferred" class="team-tab-content" style="display:${activeTab === 'transferred' ? 'block' : 'none'};">${transferredHtml}</div>`;
        }
        if (countG > 0) {
            tabsButtons += `<button class="team-tab-btn" style="${btnStyle} background:${activeTab === 'graduated' ? warnaTimFix : '#eee'}; color:${activeTab === 'graduated' ? 'white' : '#333'};" onclick="bukaTabTim('tab-graduated', event, '${warnaTimFix}')">Graduated (${countG})</button>`;
            tabsContent += `<div id="tab-graduated" class="team-tab-content" style="display:${activeTab === 'graduated' ? 'block' : 'none'};">${graduatedHtml}</div>`;
        }

        membersTabberHtml = `<div>${tabsButtons}</div>${tabsContent}`;
    }

    let stagesHtml = '';
    
    if (teamSchedules && teamSchedules.length > 0) {
        let stagesMap = {};
        const now = new Date();

        teamSchedules.forEach(jadwal => {
            if (jadwal.tipe_jadwal && jadwal.tipe_jadwal.toLowerCase() === 'event') return;

            let judulBersih = jadwal.judul_show.replace(/ - Shonichi/i, '').replace(/ - Senshuraku/i, '').replace(/ \(.*\)/g, '').split(' | ')[0].trim();
            if (!stagesMap[judulBersih]) stagesMap[judulBersih] = { nama: judulBersih, shonichi: null, hasExplicitShonichi: false, senshuraku: null, totalPerformances: 0 };

            const tglJadwal = new Date(jadwal.tanggal_waktu);
            
            if (jadwal.is_shonichi) {
                stagesMap[judulBersih].shonichi = jadwal.tanggal_waktu; stagesMap[judulBersih].hasExplicitShonichi = true;
            } else if (!stagesMap[judulBersih].hasExplicitShonichi && (!stagesMap[judulBersih].shonichi || tglJadwal < new Date(stagesMap[judulBersih].shonichi))) {
                stagesMap[judulBersih].shonichi = jadwal.tanggal_waktu;
            }

            if (jadwal.is_senshuraku || jadwal.judul_show.toLowerCase().includes('senshuraku') || jadwal.judul_show.toLowerCase().includes('last show')) {
                if (!stagesMap[judulBersih].senshuraku || tglJadwal > new Date(stagesMap[judulBersih].senshuraku)) {
                    stagesMap[judulBersih].senshuraku = jadwal.tanggal_waktu;
                }
            }

            if (tglJadwal <= now) stagesMap[judulBersih].totalPerformances++;
        });

        let stagesArray = Object.values(stagesMap).sort((a, b) => new Date(a.shonichi) - new Date(b.shonichi));

        if (stagesArray.length > 0) {
            stagesHtml += `
            <div style="overflow-x: auto; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse; background: white; text-align: left;">
                    <thead>
                        <tr style="background-color: ${warnaTimFix}; color: white;">
                            <th style="padding: 12px; border-bottom: 2px solid #eee;">Stage Name</th>
                            <th style="padding: 12px; border-bottom: 2px solid #eee;">Date</th>
                            <th style="padding: 12px; border-bottom: 2px solid #eee; text-align:center;">Performances</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            function formatTanggalWiki(isoStr) {
                if (!isoStr) return ''; const d = new Date(isoStr);
                return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
            }

            stagesArray.forEach((stage) => {
                const isActive = !stage.senshuraku;
                const dateStr = isActive ? `${formatTanggalWiki(stage.shonichi)} - ` : `${formatTanggalWiki(stage.shonichi)} - ${formatTanggalWiki(stage.senshuraku)}`;
                const activeBadge = isActive ? `<span style="background-color:${warnaTimFix}; color:white; padding:2px 6px; font-size:0.7em; border-radius:4px; margin-left:8px;">ACTIVE</span>` : '';
                const trStyle = isActive ? `background-color: ${warnaTimFix}15; border-left: 4px solid ${warnaTimFix};` : `background-color: #fff;`;
                
                stagesHtml += `
                    <tr style="${trStyle} border-bottom:1px solid #eee; cursor:pointer;" onclick="muatDetailStage('${stage.nama}', '${team.nama}', '${warnaTimFix}')">
                        <td style="padding: 12px; font-weight: bold; color: ${warnaTimFix};">${stage.nama} ${activeBadge}</td>
                        <td style="padding: 12px; color: #666; font-weight: ${isActive ? 'bold' : 'normal'};">${dateStr}</td>
                        <td style="padding: 12px; text-align:center; font-weight: bold; color: #555;">${stage.totalPerformances || 'TBA'}</td>
                    </tr>
                `;
            });
            stagesHtml += `</tbody></table></div>`;
        }
    } 

    let statusBubar = isDisbanded ? `<span style="color:#d32f2f; font-weight:bold;">Dibubarkan (${formatTanggalIndo(team.tanggal_bubar)})</span>` : '<span style="color:#388e3c; font-weight:bold;">Masih Aktif</span>';
    const namaFormat = team.nama.toLowerCase().trim().replace(/\s+/g, '_'); 
    const lokalFotoSrc = `images/teams/${namaFormat}.jpg`;

    let engineHtml = '';
    if (team.jargon) {
        engineHtml = `
            <div style="background-color: #f8f9fa; padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${warnaTimFix}; margin: 20px auto; font-style: italic; text-align: center; color: ${warnaTimFix}; font-weight: bold; font-size: 1.1em; box-shadow: 0 2px 5px rgba(0,0,0,0.05); max-width: 600px;">
                "${team.jargon}"
            </div>
        `;
    }

    container.innerHTML = `
        <div style="text-align:center; padding-bottom: 25px; border-bottom: 1px solid #eee;">
            <img src="${lokalFotoSrc}" onerror="this.onerror=null; this.src='favicon.png';" style="width:200px; height:200px; object-fit:cover; border-radius:50%; margin-bottom:15px; border:4px solid ${warnaTimFix};">
            <h1 style="color:${warnaTimFix}; margin:0 0 10px 0; font-size:2.5em; text-transform:uppercase;">${team.nama}</h1>
            <p style="margin:5px 0;"><strong>Dibentuk:</strong> ${formatTanggalIndo(team.tanggal_dibentuk)}</p>
            <p style="margin:0;"><strong>Status:</strong> ${statusBubar}</p>
            ${engineHtml}
        </div>
        
        <h3 style="margin-top: 30px; color:${warnaTimFix}; border-bottom:2px solid ${warnaTimFix}; padding-bottom:5px;">&#128101; Members</h3>
        ${membersTabberHtml}

        <h3 style="margin-top: 30px; color:${warnaTimFix}; border-bottom:2px solid ${warnaTimFix}; padding-bottom:5px;">&#127894;&#65039; Captaincy</h3>
        ${captainHtml || '<p style="text-align:center; color:#888; font-style:italic;">Belum ada data riwayat captain.</p>'}
        
        <h3 style="margin-top: 30px; color:${warnaTimFix}; border-bottom:2px solid ${warnaTimFix}; padding-bottom:5px;">&#127908; Stages</h3>
        ${stagesHtml || '<p style="text-align:center; color:#888;">Belum ada data Stage.</p>'}
    `;
}

// ============================================================================
// HALAMAN DETAIL WIKI SETLIST
// ============================================================================
async function muatDetailStage(namaStage, namaTeam, warnaTema) {
    bukaHalaman('view-stage-detail');
    const container = document.getElementById('info-detail-stage');
    container.innerHTML = '<div id="loading-schedule" style="text-align:center;">Memuat data Setlist...</div>';
    window.scrollTo(0, 0);

    const { data: schedules, error } = await supabaseClient
        .from('theater_schedules')
        .select('id, judul_show, tanggal_waktu, is_shonichi, is_senshuraku')
        .eq('team', namaTeam)
        .ilike('judul_show', `%${namaStage}%`)
        .order('tanggal_waktu', { ascending: true });

    if (error || !schedules || schedules.length === 0) return container.innerHTML = `<p style="text-align:center; color:red;">Gagal memuat atau data belum tersedia.</p>`;

    let shonichi = null; let senshuraku = null; let totalPerformances = 0;
    let shonichiScheduleId = schedules[0].id; 
    const now = new Date();

    schedules.forEach(j => {
        const tglJadwal = new Date(j.tanggal_waktu);
        if (j.is_shonichi || !shonichi || tglJadwal < new Date(shonichi)) {
            shonichi = j.tanggal_waktu;
            if(j.is_shonichi) shonichiScheduleId = j.id; 
        }
        if (j.is_senshuraku || j.judul_show.toLowerCase().includes('senshuraku')) {
            if (!senshuraku || tglJadwal > new Date(senshuraku)) senshuraku = j.tanggal_waktu;
        }
        if (tglJadwal <= now) totalPerformances++;
    });

    const isActive = !senshuraku;
    function formatTgl(isoStr) {
        if (!isoStr) return ''; const d = new Date(isoStr);
        return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    }

    const tglShonichiStr = formatTgl(shonichi);
    const tglSenshurakuStr = isActive ? 'Sekarang (Active)' : formatTgl(senshuraku);
    const activeBadge = isActive ? `<span style="background-color:${warnaTema}; color:white; padding:3px 8px; font-size:0.4em; border-radius:5px; vertical-align:middle; margin-left:10px; position:relative; top:-5px;">ACTIVE</span>` : '';

    const { data: songsData } = await supabaseClient.from('schedule_songs').select('track_number, songs(judul_lagu, tipe_lagu)').eq('schedule_id', shonichiScheduleId).order('track_number', { ascending: true });

    const scheduleIds = schedules.map(s => s.id);
    const { data: membersData } = await supabaseClient.from('performing_members').select('members(id, nama, nama_panggilan, status, team)').in('schedule_id', scheduleIds);

    let uniqueMembers = []; let memberIdsSet = new Set();
    if (membersData) {
        membersData.forEach(item => {
            if (item.members && !memberIdsSet.has(item.members.id)) {
                memberIdsSet.add(item.members.id); uniqueMembers.push(item.members);
            }
        });
    }
    uniqueMembers.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    let html = `
        <div style="border-bottom: 3px solid ${warnaTema}; padding-bottom: 15px; margin-bottom: 25px;">
            <h1 style="color:${warnaTema}; margin:0 0 5px 0; font-size:2.2em;">${namaStage} ${activeBadge}</h1>
            <p style="margin:0; font-size:1.1em; color:#555; font-weight:bold;">Team: ${namaTeam}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 5px solid ${warnaTema}; margin-bottom: 30px;">
            <h3 style="margin-top:0; color:#333;">&#128203; General Information</h3>
            <ul style="list-style:none; padding:0; margin:0; line-height:1.8; color:#444;">
                <li><strong>Stage Name:</strong> ${namaStage}</li>
                <li><strong>Team:</strong> ${namaTeam}</li>
                <li><strong>Shonichi / Senshuraku:</strong> ${tglShonichiStr} - ${tglSenshurakuStr}</li>
                <li>
                    <strong>Total Performances:</strong> 
                    <a href="javascript:void(0)" onclick="muatDaftarPerformanceStage('${namaStage}', '${namaTeam}', '${warnaTema}')" style="color:${warnaTema}; text-decoration:none; border-bottom: 1px dashed ${warnaTema}; font-weight:bold; margin-left:5px;">
                        ${totalPerformances} Shows (Lihat Daftar Show &#10140;)
                    </a>
                </li>
            </ul>
        </div>
    `;

    html += `<h3 style="color:${warnaTema}; border-bottom: 1px solid #eee; padding-bottom:10px;">&#127925; Setlist</h3>`;
    if (songsData && songsData.length > 0) {
        html += `<ul style="list-style:none; padding:0; margin:0 0 30px 0;">`;
        songsData.forEach((item, idx) => {
            const lagu = item.songs; if(!lagu) return;
            const trackNo = item.track_number ? String(item.track_number).padStart(2, '0') : String(idx + 1).padStart(2, '0');
            const unitBadge = (lagu.tipe_lagu && lagu.tipe_lagu.toLowerCase() === 'unit') ? `<span style="background:#ff9800; color:white; font-size:0.7em; padding:2px 5px; border-radius:3px; margin-left:8px;">UNIT</span>` : '';
            html += `<li style="padding: 8px 0; border-bottom: 1px dashed #e2e8f0; color: #444;"><span style="font-family:monospace; color:#999; margin-right:10px;">M${trackNo}.</span> <strong>${lagu.judul_lagu}</strong> ${unitBadge}</li>`;
        });
        html += `</ul>`;
    } else {
        html += `<p style="color:#888; font-style:italic; margin-bottom: 30px;">Data tracklist belum diinput di database.</p>`;
    }

    html += `<h3 style="color:${warnaTema}; border-bottom: 1px solid #eee; padding-bottom:10px; margin-bottom: 20px;">&#128101; Participating Members (${uniqueMembers.length})</h3>`;
    if (uniqueMembers.length > 0) {
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 15px;">`;
        uniqueMembers.forEach(m => {
            const namaPendek = m.nama_panggilan || m.nama.split(' ')[0];
            const isGraduated = (m.status || '').toLowerCase().includes('graduated');
            
            let imgStyle = `width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 3px solid ${warnaTema}; box-shadow: 0 0 5px ${warnaTema}66;`;
            if(isGraduated) imgStyle += ` filter: grayscale(100%); opacity: 0.8; border-color: #94a3b8;`;
            
            const imgHtml = generateMemberImageHtml(m, null, null, null, imgStyle, '');
            
            html += `<div style="text-align:center; cursor:pointer;" onclick="muatDetailMemberById('${m.id}')"><div style="position:relative; width:80px; height:80px; margin:0 auto;">${imgHtml}</div><p style="color:${isGraduated ? '#64748b' : warnaTema}; margin: 5px 0 0 0; font-size:0.85em; font-weight:bold;">${namaPendek}</p></div>`;
        });
        html += `</div>`;
    } else {
        html += `<p style="color:#888; font-style:italic;">Belum ada member tercatat.</p>`;
    }

    container.innerHTML = html;
}

// ============================================================================
// FUNGSI BARU: HALAMAN DAFTAR PERFORMANCES (TABEL SHOWS)
// ============================================================================
async function muatDaftarPerformanceStage(namaStage, namaTeam, warnaTema) {
    bukaHalaman('view-stage-performances');
    
    // Atur aksi tombol "Kembali" untuk balik ke Wiki Setlist
    document.getElementById('btn-back-stage-performances').onclick = () => muatDetailStage(namaStage, namaTeam, warnaTema);
    
    const container = document.getElementById('info-stage-performances');
    container.innerHTML = '<div style="text-align:center; margin-top:50px;">Memuat daftar performance...</div>';
    window.scrollTo(0, 0);

    const { data: schedules, error } = await supabaseClient
        .from('theater_schedules')
        .select('id, judul_show, tanggal_waktu, is_shonichi, is_senshuraku, lokasi, tipe_jadwal, tipe_jadwal_sekunder, foto_event')
        .eq('team', namaTeam)
        .ilike('judul_show', `%${namaStage}%`)
        .order('tanggal_waktu', { ascending: true });

    if (error || !schedules || schedules.length === 0) return container.innerHTML = `<p style="text-align:center; color:red;">Gagal memuat data jadwal.</p>`;

    const scheduleIds = schedules.map(s => s.id);
    const { data: membersData } = await supabaseClient
        .from('performing_members')
        .select('schedule_id, is_center, is_birthday, is_graduation, is_shonichi, members(nama, nama_panggilan)')
        .in('schedule_id', scheduleIds);

    let showDetailsMap = {};
    schedules.forEach(s => {
        showDetailsMap[s.id] = { center: [], sts: [], grad: [], shonichi: [] };
    });

    if (membersData) {
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
            
            // Konversi teks untuk aman disisipkan ke fungsi klik
            const formatWaktuFull = `${formatHari}, ${formatTglLengkap} | Pukul ${formatJam} WIB`;
            const judulAman = j.judul_show.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const lokasiAman = (j.lokasi || '').replace(/'/g, "\\'");
            const tipeAman = (j.tipe_jadwal || 'Theater').replace(/'/g, "\\'");
            const sekunderAman = (j.tipe_jadwal_sekunder || '').replace(/'/g, "\\'");
            const fotoAman = (j.foto_event || '').replace(/'/g, "\\'");
            
            // Aksi klik memanggil halaman Jadwal dari schedule.js
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
}
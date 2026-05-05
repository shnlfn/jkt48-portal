// ============================================================================
// 4. HALAMAN DETAIL TEAM (DIPERBARUI)
// ============================================================================
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
    
    // PERBAIKAN: Tarik data dari server jika user bypass halaman daftar (cache kosong)
    if (dataSemuaTeam.length === 0) {
        const { data } = await supabaseClient.from('teams').select('*').order('tanggal_dibentuk', { ascending: true });
        if (data) dataSemuaTeam = data;
    }

    const team = dataSemuaTeam.find(t => String(t.id) === String(teamId));
    if(!team) return container.innerHTML = '<p style="text-align:center; color:red;">Gagal menemukan data tim.</p>';

    const warnaTimFix = getTeamColor(team.nama) || team.warna || '#d81b60';

    const { data: captains } = await supabaseClient.from('team_captains').select('*, members(id, nama, nama_panggilan, status, generasi)').eq('team_id', team.id).order('urutan', { ascending: true });
    let activeTeamCaptainIds = [];
    if (captains) activeTeamCaptainIds = captains.filter(c => !c.tanggal_selesai && c.member_id).map(c => c.member_id);
        
    const { data: teamMembers } = await supabaseClient.from('members').select('*').eq('team', team.nama).not('status', 'ilike', '%Graduated%').not('status', 'ilike', '%Resign%').not('status', 'ilike', '%Dismissed%').order('nama', { ascending: true });
    const { data: historyData } = await supabaseClient.from('member_team_history').select('status_keluar, tanggal_selesai, members(id, nama, nama_panggilan, status, generasi)').eq('team_id', team.id).order('tanggal_selesai', { ascending: false, nullsFirst: false });

    // ============================================================================
    // PERBAIKAN PENTING: MENGAMBIL SEMUA JADWAL TIM (TANPA LIMIT 1000)
    // ============================================================================
    let teamSchedules = [];
    let fetchMore = true;
    let offset = 0;
    const limitRow = 1000;

    while (fetchMore) {
        const { data } = await supabaseClient
            .from('theater_schedules')
            .select('id, judul_show, tanggal_waktu, is_shonichi, is_senshuraku, tipe_jadwal')
            .eq('team', team.nama)
            .order('tanggal_waktu', { ascending: true })
            .range(offset, offset + limitRow - 1);

        if (data && data.length > 0) {
            teamSchedules.push(...data);
            offset += limitRow;
            if (data.length < limitRow) fetchMore = false;
        } else {
            fetchMore = false;
        }
    }

    const { data: teamStagesMaster } = await supabaseClient.from('stages').select('id, nama_stage, tanggal_shonichi, tanggal_senshuraku').ilike('team', `%${team.nama}%`);

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
    
    // Modifikasi untuk mengambil SEMUA Stage dari jadwal
    if (teamSchedules && teamSchedules.length > 0) {
        let stagesMap = {};
        const now = new Date();

        teamSchedules.forEach(jadwal => {
            if (jadwal.tipe_jadwal && jadwal.tipe_jadwal.toLowerCase() === 'event') return;

            let judulBersih = jadwal.judul_show.replace(/ - Shonichi/i, '').replace(/ - Senshuraku/i, '').replace(/ \(.*\)/g, '').split(' | ')[0].trim();
            if (!stagesMap[judulBersih]) stagesMap[judulBersih] = { nama: judulBersih, shonichi: null, hasExplicitShonichi: false, senshuraku: null, totalPerformances: 0, idMaster: null };

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

        // Tetap memeriksa kecocokan di master, tapi tidak menghapus yang tidak cocok
        if (teamStagesMaster && teamStagesMaster.length > 0) {
            for (let judul in stagesMap) {
                const masterMatch = teamStagesMaster.find(sm => sm.nama_stage.toLowerCase().includes(judul.toLowerCase()) || judul.toLowerCase().includes(sm.nama_stage.toLowerCase()));
                if (masterMatch) {
                    stagesMap[judul].idMaster = masterMatch.id;
                    stagesMap[judul].nama = masterMatch.nama_stage; 
                    if (masterMatch.tanggal_shonichi) stagesMap[judul].shonichi = masterMatch.tanggal_shonichi;
                    if (masterMatch.tanggal_senshuraku) stagesMap[judul].senshuraku = masterMatch.tanggal_senshuraku;
                }
            }
        }

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
                
                const safeStageName = stage.nama.replace(/'/g, "\\'");
                const safeTeamName = team.nama.replace(/'/g, "\\'");

                stagesHtml += `
                    <tr style="${trStyle} border-bottom:1px solid #eee; cursor:pointer;" onclick="if(typeof muatDetailStage === 'function') muatDetailStage('${safeStageName}', '${safeTeamName}', '${warnaTimFix}', 'view-team-detail')">
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
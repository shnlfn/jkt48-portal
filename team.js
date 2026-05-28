// ============================================================================
// 4. HALAMAN DETAIL TEAM (DIPERBARUI - HYPER ROBUST)
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
        const { data, error } = await supabaseClient.from('teams').select('*').order('tanggal_dibentuk', { ascending: false });
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
        
        const warnaTimFix = (typeof getTeamColor === 'function' ? getTeamColor(team.nama) : null) || team.warna || '#ccc';
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
    window.scrollTo(0,0);
    
    try {
        if (dataSemuaTeam.length === 0) {
            const { data } = await supabaseClient.from('teams').select('*').order('tanggal_dibentuk', { ascending: false });
            if (data) dataSemuaTeam = data;
        }

        const team = dataSemuaTeam.find(t => String(t.id) === String(teamId));
        if(!team) return container.innerHTML = '<p style="text-align:center; color:red;">Gagal menemukan data tim.</p>';

        const warnaTimFix = (typeof getTeamColor === 'function' ? getTeamColor(team.nama) : null) || team.warna || '#d81b60';

        if (!window.mapWarnaTimCache) {
            try {
                const { data: dataTeams } = await supabaseClient.from('teams').select('nama, warna');
                window.mapWarnaTimCache = {};
                if (dataTeams) {
                    dataTeams.forEach(t => {
                        if (t.nama && t.warna) window.mapWarnaTimCache[t.nama.toLowerCase()] = t.warna;
                    });
                }
            } catch (e) { console.error('Cache warna gagal dimuat:', e); }
        }

        const { data: captains } = await supabaseClient.from('team_captains').select('*, members(id, nama, nama_panggilan, status, generasi)').eq('team_id', team.id).order('urutan', { ascending: true });
        let activeTeamCaptainIds = [];
        if (captains) activeTeamCaptainIds = captains.filter(c => !c.tanggal_selesai && c.member_id).map(c => c.member_id);
            
        const { data: teamMembers } = await supabaseClient.from('members').select('*').eq('team', team.nama).order('nama', { ascending: true });
        
        const { data: historyData } = await supabaseClient.from('member_team_history').select('status_keluar, tanggal_selesai, members(id, nama, nama_panggilan, status, generasi, team)').eq('team_id', team.id).order('tanggal_selesai', { ascending: false, nullsFirst: false });

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
            let innerCaptainHtml = '<div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">';
            captains.forEach((c, index) => {
                const styleImgCaptain = `width: 60px; height: 60px; object-fit: cover; border-radius: 50%; border: 2px solid ${warnaTimFix};`;
                const imgHtml = c.members ? generateMemberImageHtml(c.members, null, null, null, styleImgCaptain, '') : `<img src="favicon.png" style="width:60px; height:60px; object-fit:cover; border-radius:50%; background-color:${warnaTimFix};">`;
                
                const mulai = c.tanggal_mulai ? formatTanggalIndo(c.tanggal_mulai) : '?';
                const selesai = c.tanggal_selesai ? formatTanggalIndo(c.tanggal_selesai) : 'Sekarang';
                const aksiKlik = c.members?.id ? `onclick="if(typeof muatDetailMemberById === 'function') muatDetailMemberById('${c.members.id}')"` : '';
                const namaCaptain = c.members ? (c.members.nama_lengkap || c.members.nama) : c.nama_captain;

                innerCaptainHtml += `
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
            innerCaptainHtml += '</div>';

            captainHtml = `
                <h3 style="margin-top: 30px; color:${warnaTimFix}; border-bottom:2px solid ${warnaTimFix}; padding-bottom:5px;">&#127894;&#65039; Captaincy</h3>
                ${innerCaptainHtml}
            `;
        }

        let tabGroups = {};

        // Validasi Manual untuk ACTIVE MEMBERS di Team
        if (teamMembers && teamMembers.length > 0) {
            tabGroups['Active'] = [];
            teamMembers.forEach(m => {
                const sLower = (m.status || '').toLowerCase();
                const hasTanggalKeluar = m.tanggal_keluar && m.tanggal_keluar.trim() !== '';
                
                // Cek status "Active" berdasarkan rules: Anggota, Trainee, Announced Graduation, Hiatus, Suspended
                const isActiveRole = sLower.includes('anggota') || sLower.includes('trainee') || sLower.includes('announced graduation') || sLower.includes('hiatus') || sLower.includes('suspended') || sLower.includes('captain');
                
                // Kondisi TIDAK AKTIF mutlak (Keluar / Lulus / Batal)
                const isKeluar = hasTanggalKeluar || 
                                 sLower.includes('graduated') || sLower.includes('lulus') || 
                                 sLower.includes('resign') || sLower.includes('mengundurkan diri') || 
                                 sLower.includes('dismissed') || sLower.includes('dikeluarkan') ||
                                 sLower.includes('canceled');
                                 
                if (!isKeluar && isActiveRole) {
                    m.isTeamCaptain = activeTeamCaptainIds.includes(m.id) || sLower.includes('captain');
                    tabGroups['Active'].push(m);
                }
            });
        }

        if (historyData && historyData.length > 0) {
            historyData.forEach(h => {
                if(!h.members) return; 
                if(!h.status_keluar || !h.tanggal_selesai) return; 

                const m = h.members;
                let statusKeluarRaw = h.status_keluar.trim();
                
                if (!tabGroups[statusKeluarRaw]) tabGroups[statusKeluarRaw] = [];
                tabGroups[statusKeluarRaw].push(m);
            });
        }

        const renderMemberGridForTab = (groupName, membersArr) => {
            let gridHtml = `<div class="grid-members-mini" style="margin-top: 15px;">`;
            const isActiveGroup = groupName === 'Active';

            membersArr.forEach(m => {
                const namaPendek = m.nama_panggilan || m.nama.split(' ')[0];
                const statusMember = (m.status || '').toLowerCase();
                
                let crown = '';
                let extraStyle = '';
                let nameCss = `font-weight:bold;`;
                let tBadge = '';
                let borderColor = isActiveGroup ? warnaTimFix : '#ccc';

                const isHiatus = statusMember.includes('hiatus'); 
                const isSuspended = statusMember.includes('suspended');
                const isAnnouncedGrad = statusMember.includes('announced graduation');
                const isJkt48Captain = statusMember.includes('jkt48 captain') || statusMember.includes('kapten jkt48');

                if (isActiveGroup) {
                    if (m.isTeamCaptain) crown = `<div style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-size:1.2em; z-index:2; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">&#127894;&#65039;</div>`;
                    
                    if (isHiatus || isSuspended) {
                        extraStyle = 'filter: grayscale(100%); opacity: 0.7;';
                        nameCss += ` text-decoration: line-through; opacity: 0.6;`;
                    }
                    if (isAnnouncedGrad) {
                        nameCss += ` font-style:italic;`; 
                    }
                } else {
                    extraStyle = 'filter: grayscale(50%);';
                }

                let arrBadges = [];

                if (!isActiveGroup) {
                    let tColor = '#ccc';
                    let teamLower = (m.team || '').toLowerCase();
                    
                    if (window.mapWarnaTimCache && window.mapWarnaTimCache[teamLower]) {
                        tColor = window.mapWarnaTimCache[teamLower];
                    } else if (typeof getTeamColor === 'function' && m.team) {
                        tColor = getTeamColor(m.team) || '#ccc';
                    }

                    if (m.team) {
                        let fSize = teamLower.includes('academy class') ? '0.45em' : '0.55em';
                        arrBadges.push(`<div style="background:${tColor}; color:white; font-size:${fSize}; padding:3px 6px; border-radius:4px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.2); letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap; display:inline-block; line-height:1.1;">${m.team}</div>`);
                    }
                } else {
                    const baseBadgeStyle = "color:white; font-size:0.55em; padding:3px 6px; border-radius:4px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.2); letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap; display:inline-block; line-height:1.1;";
                    
                    if (isJkt48Captain) arrBadges.push(`<div style="background:#d4af37; color:#000; font-size:0.55em; padding:3px 6px; border-radius:4px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.2); letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap; display:inline-block; line-height:1.1;">JKT48 CAPTAIN</div>`);
                    if (isHiatus) arrBadges.push(`<div style="background:#555; ${baseBadgeStyle}">HIATUS</div>`);
                    if (isSuspended) arrBadges.push(`<div style="background:#555; ${baseBadgeStyle}">SUSPENDED</div>`);
                    if (isAnnouncedGrad) arrBadges.push(`<div style="background:#ad8a9e; ${baseBadgeStyle}">ANNOUNCED<br>GRADUATION</div>`);
                }

                if (arrBadges.length > 0) {
                    tBadge = `<div style="display:flex; flex-direction:column; align-items:center; gap:3px; margin-top:5px;">${arrBadges.join('')}</div>`;
                }

                let imgStyle = `width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 3px solid ${borderColor}; box-shadow: 0 0 10px ${isActiveGroup ? warnaTimFix+'99' : '#ccc'}; background: #fff; ${extraStyle}`;
                const imgHtml = typeof generateMemberImageHtml === 'function' ? generateMemberImageHtml(m, null, null, null, imgStyle, '') : `<img src="favicon.png" style="${imgStyle}">`;
                let txtColor = isActiveGroup ? warnaTimFix : '#666';

                gridHtml += `
                    <div style="text-align:center; cursor:pointer;" onclick="if(typeof muatDetailMemberById === 'function') muatDetailMemberById('${m.id}')">
                        <div style="position:relative; width:80px; height:80px; margin:0 auto;">${crown}${imgHtml}</div>
                        <p style="color:${txtColor}; font-size:0.85em; margin: 5px 0 0 0; ${nameCss}" title="${m.nama}">${namaPendek}</p>
                        ${tBadge}
                    </div>
                `;
            });
            gridHtml += `</div>`;
            return gridHtml;
        };

        let membersTabberHtml = '';
        let tabsButtons = ''; 
        let tabsContent = '';
        
        const orderPriority = ['Active', 'Promoted', 'Transferred', 'Graduated', 'Resigned', 'Canceled', 'Dismissed'];
        let allKeys = Object.keys(tabGroups);
        
        allKeys.sort((a, b) => {
            let idxA = orderPriority.indexOf(a);
            let idxB = orderPriority.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            if (idxA !== idxB) return idxA - idxB;
            return a.localeCompare(b);
        });

        if (allKeys.length > 0) {
            // LOGIKA TAB ACTIVE DEFAULT BERDASARKAN STATUS TIM (Reguler vs Academy/Trainee)
            let activeTabKey = allKeys[0];
            if (tabGroups['Active'] && tabGroups['Active'].length > 0) {
                activeTabKey = 'Active';
            } else {
                const teamNameLower = (team.nama || '').toLowerCase();
                if (teamNameLower.includes('academy class') || teamNameLower.includes('trainee')) {
                    if (tabGroups['Promoted']) activeTabKey = 'Promoted';
                    else if (tabGroups['Transferred']) activeTabKey = 'Transferred';
                } else {
                    if (tabGroups['Transferred']) activeTabKey = 'Transferred';
                    else if (tabGroups['Promoted']) activeTabKey = 'Promoted';
                }
            }

            const btnStyle = "padding:6px 12px; font-size:0.85em; border:none; border-radius:5px; font-weight:bold; cursor:pointer; margin-right:5px; margin-bottom:10px;";

            allKeys.forEach(key => {
                let membersArr = tabGroups[key];
                if(membersArr.length === 0) return;
                
                let safeKey = key.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                let isTabActive = (key === activeTabKey);
                
                tabsButtons += `<button class="team-tab-btn" style="${btnStyle} background:${isTabActive ? warnaTimFix : '#eee'}; color:${isTabActive ? 'white' : '#333'};" onclick="bukaTabTim('tab-${safeKey}', event, '${warnaTimFix}')">${key} (${membersArr.length})</button>`;
                
                tabsContent += `<div id="tab-${safeKey}" class="team-tab-content" style="display:${isTabActive ? 'block' : 'none'};">${renderMemberGridForTab(key, membersArr)}</div>`;
            });

            membersTabberHtml = `<div>${tabsButtons}</div>${tabsContent}`;
        }

        // ============================================================================
        // MENGELOLA STAGES & EVENT
        // ============================================================================
        let stagesHtml = '';
        let eventsHtml = '';
        
        if (teamSchedules && teamSchedules.length > 0) {
            let stagesMap = {};
            const now = new Date();

            teamSchedules.forEach(jadwal => {
                if (jadwal.tipe_jadwal && jadwal.tipe_jadwal.toLowerCase() === 'event') return;

                let judulBersih = jadwal.judul_show.replace(/ - Shonichi/i, '').replace(/ - Senshuraku/i, '').replace(/ \(.*\)/g, '').split(' | ')[0].trim();
                
                if (!stagesMap[judulBersih]) stagesMap[judulBersih] = { 
                    nama: judulBersih, 
                    shonichi: null, 
                    hasExplicitShonichi: false, 
                    senshuraku: null, 
                    latest_date: null, 
                    totalPerformances: 0, 
                    idMaster: null 
                };

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

                if (!stagesMap[judulBersih].latest_date || tglJadwal > new Date(stagesMap[judulBersih].latest_date)) {
                    stagesMap[judulBersih].latest_date = jadwal.tanggal_waktu;
                }

                if (tglJadwal <= now) stagesMap[judulBersih].totalPerformances++;
            });

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

            let stagesArray = [];
            let eventsArray = [];

            Object.values(stagesMap).forEach(item => {
                if (item.idMaster) {
                    stagesArray.push(item);
                } else {
                    eventsArray.push(item);
                }
            });

            stagesArray.sort((a, b) => new Date(a.shonichi) - new Date(b.shonichi));
            eventsArray.sort((a, b) => new Date(a.shonichi) - new Date(b.shonichi));

            function formatTanggalWiki(isoStr) {
                if (!isoStr) return ''; const d = new Date(isoStr);
                return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
            }

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
            
            if (eventsArray.length > 0) {
                eventsHtml += `
                <div style="overflow-x: auto; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse; background: white; text-align: left;">
                        <thead>
                            <tr style="background-color: ${warnaTimFix}; color: white;">
                                <th style="padding: 12px; border-bottom: 2px solid #eee;">Event Name</th>
                                <th style="padding: 12px; border-bottom: 2px solid #eee;">Date</th>
                                <th style="padding: 12px; border-bottom: 2px solid #eee; text-align:center;">Performances</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                eventsArray.forEach((evt) => {
                    const startStr = formatTanggalWiki(evt.shonichi);
                    const endStr = evt.senshuraku ? formatTanggalWiki(evt.senshuraku) : formatTanggalWiki(evt.latest_date);
                    const dateStr = (startStr === endStr) ? startStr : `${startStr} - ${endStr}`;
                    
                    const safeEventName = evt.nama.replace(/'/g, "\\'");
                    const safeTeamName = team.nama.replace(/'/g, "\\'");

                    eventsHtml += `
                        <tr style="background-color: #fff; border-bottom:1px solid #eee; cursor:pointer;" onclick="if(typeof muatDetailStage === 'function') muatDetailStage('${safeEventName}', '${safeTeamName}', '${warnaTimFix}', 'view-team-detail')">
                            <td style="padding: 12px; font-weight: bold; color: ${warnaTimFix};">${evt.nama}</td>
                            <td style="padding: 12px; color: #666;">${dateStr}</td>
                            <td style="padding: 12px; text-align:center; font-weight: bold; color: #555;">${evt.totalPerformances || 'TBA'}</td>
                        </tr>
                    `;
                });
                eventsHtml += `</tbody></table></div>`;
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

            ${captainHtml}
            
            <h3 style="margin-top: 30px; color:${warnaTimFix}; border-bottom:2px solid ${warnaTimFix}; padding-bottom:5px;">&#127908; Stages</h3>
            ${stagesHtml || '<p style="text-align:center; color:#888;">Belum ada data Stage resmi.</p>'}
            
            ${eventsHtml ? `
            <h3 style="margin-top: 30px; color:${warnaTimFix}; border-bottom:2px solid ${warnaTimFix}; padding-bottom:5px;">&#127881; Events</h3>
            ${eventsHtml}
            ` : ''}
        `;
    } catch (err) {
        console.error("Terjadi error saat merender detail tim:", err);
        container.innerHTML = `<p style="text-align:center; color:red; font-weight:bold;">Terjadi kesalahan tak terduga saat memuat data tim.</p>`;
    }
}
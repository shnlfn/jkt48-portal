// ============================================================================
// FILE KHUSUS: DAFTAR & DETAIL GENERASI JKT48
// ============================================================================

let dataSemuaGenerasi = [];

async function muatDaftarGenerasi() {
    const container = document.getElementById('list-generations');
    const loading = document.getElementById('loading-generations');

    if (dataSemuaGenerasi.length === 0) {
        loading.style.display = 'block';
        const { data, error } = await supabaseClient
            .from('generations')
            .select('*')
            .order('angka', { ascending: true });
        
        loading.style.display = 'none';

        if (error) return container.innerHTML = `<p style="color:red; text-align:center; width:100%;">Gagal memuat generasi: ${error.message}</p>`;
        if (!data || data.length === 0) return container.innerHTML = `<p style="color:#666; text-align:center; width:100%;">Belum ada data generasi.</p>`;

        dataSemuaGenerasi = data;
    }

    container.innerHTML = '';
    dataSemuaGenerasi.forEach(gen => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.textAlign = 'center';
        div.style.padding = '20px';
        div.style.cursor = 'pointer';
        div.style.flexDirection = 'column';

        let warnaGenFix = gen.warna || '#ccc';
        let warnaFontFix = gen.warna_font || '#ffffff';

        div.style.borderBottom = `5px solid ${warnaGenFix}`;
        div.onclick = () => muatDetailGenerasi(gen.angka);

        let txtAngka = gen.angka >= 90 ? '&#10024;' : gen.angka;

        div.innerHTML = `
            <div style="width:100px; height:100px; border-radius:50%; margin: 0 auto 10px auto; 
                        border: 4px solid ${warnaFontFix}; 
                        background-color: ${warnaGenFix}; 
                        display: flex; align-items: center; justify-content: center; 
                        font-size: 3em; font-weight: 900; font-family: 'Arial Black', Impact, sans-serif;
                        color: ${warnaFontFix}; 
                        box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: 0.2s;">
                ${txtAngka}
            </div>
            <h3 style="margin:0 0 5px 0; text-transform: uppercase; font-size: 1.5em; font-weight: 900; letter-spacing: 1px;
                       color: ${warnaGenFix}; 
                       -webkit-text-stroke: 1px ${warnaFontFix}; 
                       text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
                ${gen.nama}
            </h3>
        `;
        
        div.onmouseover = () => { div.style.transform = 'translateY(-3px)'; div.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)'; }
        div.onmouseout = () => { div.style.transform = 'none'; div.style.boxShadow = 'none'; }
        
        container.appendChild(div);
    });
}

async function muatDetailGenerasi(angkaGen) {
    bukaHalaman('view-generation-detail');
    const container = document.getElementById('info-detail-generation');
    container.innerHTML = '<p style="text-align:center; padding:40px 0;">Memuat data generasi...</p>';
    window.scrollTo(0,0);

    if (dataSemuaGenerasi.length === 0) {
        const { data } = await supabaseClient.from('generations').select('*').order('angka', { ascending: true });
        if (data) dataSemuaGenerasi = data;
    }

    const gen = dataSemuaGenerasi.find(g => String(g.angka) === String(angkaGen));
    if(!gen) return container.innerHTML = '<p style="text-align:center; color:red;">Gagal menemukan data generasi.</p>';

    let warnaGenFix = gen.warna || '#d81b60';
    let warnaFontFix = gen.warna_font || '#ffffff';

    const { data: allMembers, error: errMem } = await supabaseClient.from('members').select('*').order('nama', { ascending: true });

    if(errMem) return container.innerHTML = `<p style="text-align:center; color:red;">Gagal memuat member: ${errMem.message}</p>`;

    let totalMembersCount = 0;
    let memberGroups = {};

    if (allMembers) {
        allMembers.forEach(m => {
            let mGenRaw = m.generasi ? m.generasi.toString().toLowerCase() : null;
            let isMatch = false;

            if (mGenRaw) {
                let genNameLower = gen.nama.toLowerCase();
                if (genNameLower.includes('v') || genNameLower.includes('virtual')) {
                    if (mGenRaw.includes('v') || mGenRaw.includes('virtual')) isMatch = true;
                } else if (genNameLower.includes('kaigai') || genNameLower.includes('exchange')) {
                    if (mGenRaw.includes('kaigai') || mGenRaw.includes('exchange')) isMatch = true;
                } else {
                    let mNum = parseInt(mGenRaw.replace(/\D/g, ''));
                    if (!isNaN(mNum) && mNum === parseInt(gen.angka)) isMatch = true;
                }
            }
            
            if (isMatch) {
                totalMembersCount++;
                
                const sRaw = (m.status || '').trim();
                const sLower = sRaw.toLowerCase();
                const tRaw = (m.team || '').trim();
                const tLower = tRaw.toLowerCase();
                
                const hasTanggalKeluar = m.tanggal_keluar && m.tanggal_keluar.trim() !== '';

                let category = 'Active';
                let nameStyle = 'font-weight:bold;';

                const isKeluar = hasTanggalKeluar || sLower.includes('graduated') || sLower.includes('lulus') || sLower.includes('resign') || sLower.includes('dismiss') || sLower.includes('canceled');
                const isTraineeOrAcademy = tLower.includes('trainee') || tLower.includes('academy class');

                if (isKeluar && isTraineeOrAcademy) {
                    category = `Former ${tRaw}`; 
                } else if (sLower.includes('graduated') || sLower.includes('lulus')) {
                    category = 'Graduated';
                } else if (sLower.includes('resign')) {
                    category = 'Resigned';
                } else if (sLower.includes('dismiss')) {
                    category = 'Dismissed';
                } else if (hasTanggalKeluar || sLower.includes('canceled')) {
                    category = 'Graduated'; 
                } else if (sLower.includes('announced graduation')) {
                    category = 'Announced Graduation';
                    nameStyle = 'font-weight:bold; font-style:italic;';
                } else if (sLower.includes('former') || sLower.includes('ex-') || sLower.includes('kandidat')) {
                    category = sRaw;
                } else {
                    category = 'Active';
                    if (sLower.includes('hiatus') || sLower.includes('suspended')) {
                        nameStyle = 'text-decoration:line-through; opacity:0.6; font-weight:bold;';
                    }
                }

                m.customCategory = category;
                m.customStyle = nameStyle; 

                if (!memberGroups[category]) memberGroups[category] = [];
                memberGroups[category].push(m);
            }
        });
    }

    const renderMemberGrid = (membersArr, isActiveOrAnnounced) => {
        if (!membersArr || membersArr.length === 0) return '';
        let gridHtml = `<div style="display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 15px; margin-bottom: 25px;">`;
        
        membersArr.forEach(m => {
            const namaPendek = m.nama_panggilan || m.nama.split(' ')[0];
            const mStatusLower = (m.status || '').toLowerCase();
            const teamLower = (m.team || '').toLowerCase();
            const isFormerTraineeOrAcademy = m.customCategory && m.customCategory.toLowerCase().includes('former');
            
            let tColor = (typeof getTeamColor === 'function') ? (getTeamColor(m.team) || '#ccc') : '#ccc';
            let arrBadges = [];
            
            if (isFormerTraineeOrAcademy) {
                let formerStatus = 'RESIGNED';
                let formerColor = '#757575'; 
                if(mStatusLower.includes('graduated') || mStatusLower.includes('lulus')) { formerStatus = 'GRADUATED'; formerColor = '#888'; }
                else if(mStatusLower.includes('dismiss')) { formerStatus = 'DISMISSED'; formerColor = '#d32f2f'; }
                else if(mStatusLower.includes('resign')) { formerStatus = 'RESIGNED'; formerColor = '#757575'; }
                else if(mStatusLower.includes('canceled')) { formerStatus = 'CANCELED'; formerColor = '#888'; }
                else if(m.tanggal_keluar) { formerStatus = 'GRADUATED'; formerColor = '#888'; }
                else { formerStatus = (m.status || 'UNKNOWN').toUpperCase(); }

                arrBadges.push(`<div style="background:${formerColor}; color:white; font-size:0.52em; padding:3px 6px; border-radius:4px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.2); letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap; display:inline-block; line-height:1.1;">${formerStatus}</div>`);
            } else {
                if (m.team) {
                    let fSize = teamLower.includes('academy class') ? '0.42em' : '0.55em';
                    arrBadges.push(`<div style="background:${tColor}; color:white; font-size:${fSize}; padding:3px 6px; border-radius:4px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.2); letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap; display:inline-block; line-height:1.1;">${m.team}</div>`);
                }

                if (isActiveOrAnnounced) {
                    const isHiatus = mStatusLower.includes('hiatus');
                    const isSuspended = mStatusLower.includes('suspended');
                    const isJkt48Captain = mStatusLower.includes('jkt48 captain') || mStatusLower.includes('kapten jkt48');
                    const baseBadgeStyle = "color:white; font-size:0.55em; padding:3px 6px; border-radius:4px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.2); letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap; display:inline-block; line-height:1.1;";
                    
                    if (isJkt48Captain) arrBadges.push(`<div style="background:#d4af37; color:#000; font-size:0.55em; padding:3px 6px; border-radius:4px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.2); letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap; display:inline-block; line-height:1.1;">JKT48 CAPTAIN</div>`);
                    if (isHiatus) arrBadges.push(`<div style="background:#555; ${baseBadgeStyle}">HIATUS</div>`);
                    if (isSuspended) arrBadges.push(`<div style="background:#555; ${baseBadgeStyle}">SUSPENDED</div>`);
                }
            }

            let tBadge = '';
            if (arrBadges.length > 0) {
                tBadge = `<div style="display:flex; flex-direction:column; align-items:center; gap:3px; margin-top:5px;">${arrBadges.join('')}</div>`;
            }

            let imgStyle = `width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 3px solid ${warnaGenFix}; box-shadow: 0 0 10px ${warnaGenFix}66; background: #fff;`;
            
            if (isActiveOrAnnounced && (mStatusLower.includes('hiatus') || mStatusLower.includes('suspended'))) {
                imgStyle += ` filter: grayscale(100%); opacity: 0.8;`;
            }

            const imgHtml = generateMemberImageHtml(m, null, null, null, imgStyle, '');
            let txtColor = warnaGenFix; 

            gridHtml += `
                <div style="text-align:center; cursor:pointer; width: 85px;" onclick="if(typeof muatDetailMemberById === 'function') muatDetailMemberById('${m.id}')">
                    <div style="position:relative; width:80px; height:80px; margin:0 auto;">${imgHtml}</div>
                    <p style="color:${txtColor}; font-size:0.85em; margin: 5px 0 0 0; ${m.customStyle}" title="${m.nama}">${namaPendek}</p>
                    ${tBadge}
                </div>
            `;
        });
        gridHtml += `</div>`;
        return gridHtml;
    };

    let membersHtml = '';
    
    let activeMembers = memberGroups['Active'] || [];
    let announcedMembers = memberGroups['Announced Graduation'] || [];
    let totalActiveCount = activeMembers.length + announcedMembers.length;

    if (totalActiveCount > 0) {
        membersHtml += `<h4 style="margin:0 0 10px 0; color:#555; text-align:left;">&#9656; Active (${totalActiveCount})</h4>`;
        
        if (activeMembers.length > 0) {
            membersHtml += renderMemberGrid(activeMembers, true);
        }
        if (announcedMembers.length > 0) {
            membersHtml += `<h5 style="margin:-10px 0 10px 0; color:#888; text-align:left; font-style:italic; font-size: 0.95em;">Announced Graduation (${announcedMembers.length})</h5>`;
            membersHtml += renderMemberGrid(announcedMembers, true);
        }
    }
    
    delete memberGroups['Active'];
    delete memberGroups['Announced Graduation'];

    const orderPriority = ['Graduated', 'Resigned', 'Dismissed', 'Former Trainee', 'Former Academy Class A', 'Former Academy Class B'];
    
    orderPriority.forEach(cat => {
        if (memberGroups[cat]) {
            membersHtml += `<h4 style="margin:0 0 10px 0; color:#555; text-align:left;">&#9656; ${cat} (${memberGroups[cat].length})</h4>`;
            membersHtml += renderMemberGrid(memberGroups[cat], false);
            delete memberGroups[cat];
        }
    });
    
    Object.keys(memberGroups).sort().forEach(cat => {
        membersHtml += `<h4 style="margin:0 0 10px 0; color:#555; text-align:left;">&#9656; ${cat} (${memberGroups[cat].length})</h4>`;
        membersHtml += renderMemberGrid(memberGroups[cat], false);
    });

    if (totalMembersCount === 0) {
        membersHtml = '<p style="text-align:center; color:#888; font-style:italic;">Belum ada data member untuk generasi ini.</p>';
    }

    let announcedText = '-';
    if (gen.announced) {
        const d = new Date(gen.announced);
        if (!isNaN(d)) {
            announcedText = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        } else {
            announcedText = gen.announced; 
        }
    }

    let namaHeader = gen.nama;
    if (gen.angka < 90) namaHeader = `Generasi ${gen.angka}`; 
    
    const shirtColorText = gen.shirt_color ? gen.shirt_color : '-';

    container.innerHTML = `
        <div style="text-align:left;">
            <div style="border-bottom: 3px solid ${warnaGenFix}; padding-bottom: 15px; margin-bottom: 25px;">
                <h1 style="margin:0 0 2px 0; font-size:2.8em; text-transform:uppercase; font-weight:900; letter-spacing:1px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;
                           color:${warnaGenFix}; -webkit-text-stroke: 1.5px ${warnaFontFix}; text-shadow: 1px 1px 2px rgba(0,0,0,0.15);">
                    ${namaHeader}
                    <span style="font-size:0.35em; background:${warnaGenFix}; color:${warnaFontFix}; padding:6px 12px; border-radius:6px; border: 2px solid ${warnaFontFix}; -webkit-text-stroke:0; text-shadow:none; letter-spacing:1px; vertical-align:middle;">${shirtColorText}</span>
                </h1>
                <div style="color:#888; font-size:0.95em; font-style:italic;">Diumumkan pada ${announcedText}</div>
            </div>
            
            <h3 style="color:${warnaGenFix}; border-bottom: 1px solid #eee; padding-bottom:10px; margin-bottom: 15px; margin-top:10px;">
                &#128101; Members (${totalMembersCount})
            </h3>
            
            ${membersHtml}
        </div>
    `;
}
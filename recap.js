// ============================================================================
// FILE KHUSUS: RECAPS & STATISTIK JKT48 (recap.js)
// ============================================================================

window.mapIdTimCache = window.mapIdTimCache || null;

function kembaliKeDaftarRecap() {
    document.getElementById('recap-list-container').style.display = 'block';
    document.getElementById('recap-detail-container').style.display = 'none';
    document.getElementById('content-recaps').innerHTML = '';
}

async function bukaRecap(tipe) {
    // Sembunyikan List, Tampilkan Detail
    document.getElementById('recap-list-container').style.display = 'none';
    document.getElementById('recap-detail-container').style.display = 'block';
    document.getElementById('content-recaps').innerHTML = '';
    document.getElementById('loading-recaps').style.display = 'block';

    if (tipe === 'first_theater') {
        await renderRecapFirstTheater();
    }
}

async function renderRecapFirstTheater() {
    try {
        // 1. Tarik Data Database Generasi (Warna)
        const { data: genData } = await supabaseClient.from('generations').select('*');
        let genColorMap = {};
        if (genData) {
            genData.forEach(g => {
                genColorMap[g.angka] = g.warna;
            });
        }
        
        // Tarik Data Database Teams (Warna & ID untuk Link)
        if (!window.mapWarnaTimCache || !window.mapIdTimCache) {
            const { data: dataTeams } = await supabaseClient.from('teams').select('id, nama, warna');
            window.mapWarnaTimCache = {};
            window.mapIdTimCache = {};
            if (dataTeams) {
                dataTeams.forEach(t => {
                    if (t.nama) {
                        const tLower = t.nama.toLowerCase();
                        if (t.warna) window.mapWarnaTimCache[tLower] = t.warna;
                        window.mapIdTimCache[tLower] = t.id;
                    }
                });
            }
        }

        // 2. Ambil SEMUA data schedule tipe Theater (Ditambah kolom lokasi, dll untuk Link Jadwal)
        let allSchedules = [];
        let fetchMoreSched = true;
        let offsetSched = 0;
        const limitRow = 1000;
        
        while (fetchMoreSched) {
            const { data, error } = await supabaseClient
                .from('theater_schedules')
                .select('id, judul_show, tanggal_waktu, team, tipe_jadwal, lokasi, tipe_jadwal_sekunder, foto_event')
                .eq('tipe_jadwal', 'Theater')
                .order('tanggal_waktu', { ascending: true })
                .range(offsetSched, offsetSched + limitRow - 1);
                
            if (error) throw error;
            if (data && data.length > 0) {
                allSchedules.push(...data);
                offsetSched += limitRow;
                if (data.length < limitRow) fetchMoreSched = false;
            } else {
                fetchMoreSched = false;
            }
        }

        let schedMap = {};
        allSchedules.forEach(s => schedMap[s.id] = s);

        // 3. Ambil data members
        const { data: members, error: errMem } = await supabaseClient
            .from('members')
            .select('id, nama, nama_panggilan, generasi, team, status');
            
        if (errMem) throw errMem;
        
        let memberMap = {};
        members.forEach(m => {
            memberMap[m.id] = { ...m, first_show: null };
        });

        // 4. Ambil data performing members (is_shonichi = true)
        let allPM = [];
        let fetchMorePM = true;
        let offsetPM = 0;
        
        while (fetchMorePM) {
            const { data, error } = await supabaseClient
                .from('performing_members')
                .select('schedule_id, member_id')
                .eq('is_shonichi', true)
                .range(offsetPM, offsetPM + limitRow - 1);
                
            if (error) throw error;
            if (data && data.length > 0) {
                allPM.push(...data);
                offsetPM += limitRow;
                if (data.length < limitRow) fetchMorePM = false;
            } else {
                fetchMorePM = false;
            }
        }

        // 5. Proses pencarian debut setlist pertama (First Show)
        allPM.forEach(pm => {
            const sched = schedMap[pm.schedule_id];
            const mem = memberMap[pm.member_id];
            if (sched && mem) {
                if (!mem.first_show || new Date(sched.tanggal_waktu) < new Date(mem.first_show.tanggal_waktu)) {
                    mem.first_show = sched;
                }
            }
        });

        // 6. Kelompokkan member yang debut bersamaan (Khusus yang Masih Aktif/Announced Grad)
        let groups = {};
        Object.values(memberMap).forEach(m => {
            const memStatus = (m.status || '').toLowerCase();
            const isGraduatedOrOut = memStatus === 'graduated' || memStatus.includes('resign') || memStatus.includes('dismissed');
            
            if (!isGraduatedOrOut && m.first_show) {
                let genNum = m.generasi ? parseInt(m.generasi.toString().replace(/\D/g, '')) : 99;
                if(isNaN(genNum)) genNum = 99;
                
                let schedId = m.first_show.id;
                let key = `${genNum}_${schedId}`;
                
                if (!groups[key]) {
                    let setlistBersih = m.first_show.judul_show.replace(/ - Shonichi/i, '').replace(/ - Senshuraku/i, '').replace(/ \(.*\)/g, '').split(' | ')[0].trim();
                    groups[key] = {
                        genNum: genNum,
                        tanggal: m.first_show.tanggal_waktu,
                        setlist: setlistBersih,
                        team: m.first_show.team || 'JKT48',
                        schedule: m.first_show, // Simpan objek jadwal utuh untuk dikirim ke fungsi klik
                        members: []
                    };
                }
                
                // Simpan id dan nama member untuk dijadikan Link
                groups[key].members.push({ 
                    id: m.id, 
                    nama: m.nama_panggilan || m.nama.split(' ')[0] 
                });
            }
        });

        let groupArray = Object.values(groups);
        
        // Urutkan (Generasi terkecil/lama ke besar, lalu tanggal perdana)
        groupArray.sort((a, b) => {
            if (a.genNum !== b.genNum) return a.genNum - b.genNum;
            return new Date(a.tanggal) - new Date(b.tanggal);
        });

        // 7. Bangun HTML (Tabel Bersih, Header Elegan & Full Interaktif)
        let html = `
            <div style="max-width: 1000px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h2 style="color: #d81b60; margin-top: 0; margin-bottom: 25px; text-align:center; border-bottom: 2px solid #f8bbd0; padding-bottom: 10px;">Shonichi Setlist Theater Member JKT48</h2>
                
                <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #f48fb1;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9em; text-align: center; white-space: nowrap;">
                        <thead style="background: linear-gradient(90deg, #fce4ec 0%, #f8bbd0 100%); color: #880e4f; text-transform: uppercase; letter-spacing: 1px; font-size: 0.85em;">
                            <tr>
                                <th style="padding: 15px; border-bottom: 2px solid #f06292; border-right: 1px solid #f48fb1;">Generasi</th>
                                <th style="padding: 15px; border-bottom: 2px solid #f06292; border-right: 1px solid #f48fb1; text-align:left;">Nama Member</th>
                                <th style="padding: 15px; border-bottom: 2px solid #f06292; border-right: 1px solid #f48fb1;">Tanggal Sonichi</th>
                                <th style="padding: 15px; border-bottom: 2px solid #f06292; border-right: 1px solid #f48fb1;">Setlist Theater</th>
                                <th style="padding: 15px; border-bottom: 2px solid #f06292;">Team</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        groupArray.forEach(g => {
            // FORMAT TANGGAL & WAKTU UNTUK KLIK JADWAL
            const tglObj = new Date(g.tanggal);
            const tglStr = tglObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const formatHari = tglObj.toLocaleDateString('id-ID', { weekday: 'long' });
            const formatJam = tglObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }).replace('.', ':') + ' WIB';
            const formatWaktuFull = `${formatHari}, ${tglStr} | Pukul ${formatJam}`;
            
            // SIAPKAN LINK MEMBER (Dipisah koma)
            const mList = g.members
                .sort((a, b) => a.nama.localeCompare(b.nama))
                .map(m => `<a href="javascript:void(0)" onclick="if(typeof muatDetailMemberById === 'function') muatDetailMemberById('${m.id}')" style="color: #004080; text-decoration: none; border-bottom: 1px dashed #004080; transition: 0.2s;" onmouseover="this.style.color='#d81b60'; this.style.borderBottomColor='#d81b60'" onmouseout="this.style.color='#004080'; this.style.borderBottomColor='#004080'">${m.nama}</a>`)
                .join(', ');
            
            // Ambil Warna Generasi & Team
            const genColor = genColorMap[g.genNum] || '#e2e8f0';
            let genTextDisplay = g.genNum === 99 ? '?' : g.genNum;
            
            const tLower = (g.team || '').toLowerCase();
            let teamColor = '#90caf9'; 
            if (window.mapWarnaTimCache && window.mapWarnaTimCache[tLower]) {
                teamColor = window.mapWarnaTimCache[tLower];
            } else if (tLower.includes('team j') && !tLower.includes('jkt48')) teamColor = '#f48fb1';
            else if (tLower.includes('team k')) teamColor = '#ffe082';
            else if (tLower.includes('team t')) teamColor = '#f48fb1';
            else if (tLower === 'jkt48' || tLower.includes('new era')) teamColor = '#e2e8f0';

            // SIAPKAN LINK JADWAL
            const s = g.schedule;
            const judulAman = s.judul_show.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const lokasiAman = (s.lokasi || '').replace(/'/g, "\\'");
            const tipeAman = (s.tipe_jadwal || 'Theater').replace(/'/g, "\\'");
            const sekunderAman = (s.tipe_jadwal_sekunder || '').replace(/'/g, "\\'");
            const fotoAman = (s.foto_event || '').replace(/'/g, "\\'");
            
            const schedLink = `<a href="javascript:void(0)" onclick="if(typeof muatDetailJadwal === 'function') muatDetailJadwal('${s.id}', '${judulAman}', '${formatWaktuFull}', '${lokasiAman}', '${tipeAman}', '${fotoAman}', '${sekunderAman}')" style="color: #475569; text-decoration: none; font-weight: 700; transition: 0.2s;" onmouseover="this.style.color='#d81b60'" onmouseout="this.style.color='#475569'">${tglStr}</a>`;

            // SIAPKAN LINK STAGE
            const safeStageName = g.setlist.replace(/'/g, "\\'");
            const safeTeamName = g.team.replace(/'/g, "\\'");
            const stageLink = `<a href="javascript:void(0)" onclick="if(typeof muatDetailStage === 'function') muatDetailStage('${safeStageName}', '${safeTeamName}', '${teamColor}', 'view-recaps')" style="color: #475569; text-decoration: none; font-weight: 700; transition: 0.2s;" onmouseover="this.style.color='#d81b60'" onmouseout="this.style.color='#475569'">${g.setlist}</a>`;

            // SIAPKAN LINK TEAM (Mencari ID dari Map Cache)
            let teamIdStr = window.mapIdTimCache && window.mapIdTimCache[tLower] ? window.mapIdTimCache[tLower] : '';
            let teamLink = g.team;
            if (teamIdStr) {
                // Diubah warnanya menjadi gelap #333 agar kontras di atas warna kotak
                teamLink = `<a href="javascript:void(0)" onclick="if(typeof muatDetailTeam === 'function') muatDetailTeam('${teamIdStr}')" style="color: #333; text-decoration: none; font-weight: bold; transition: 0.2s;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${g.team}</a>`;
            } else {
                teamLink = `<span style="color: #333; font-weight: bold;">${g.team}</span>`;
            }

            // RENDER BARIS TABEL
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="background: ${genColor}; color: #333; font-weight: 900; width: 45px; padding: 12px; border-right: 1px solid #e2e8f0; text-shadow: 0px 1px 1px rgba(255,255,255,0.5);">${genTextDisplay}</td>
                    
                    <td style="padding: 12px 15px; color: #333; font-weight: 700; text-align: left; white-space: normal; line-height: 1.8; border-right: 1px solid #e2e8f0;">${mList}</td>
                    
                    <td style="padding: 12px 15px; border-right: 1px solid #e2e8f0;">${schedLink}</td>
                    
                    <td style="padding: 12px 15px; border-right: 1px solid #e2e8f0;">${stageLink}</td>
                    
                    <td style="background: ${teamColor}; padding: 12px 15px; font-size: 0.85em;">${teamLink}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('loading-recaps').style.display = 'none';
        document.getElementById('content-recaps').innerHTML = html;

    } catch (error) {
        console.error("Gagal memproses rekap:", error);
        document.getElementById('loading-recaps').style.display = 'none';
        document.getElementById('content-recaps').innerHTML = `<p style="color:red; text-align:center; font-weight:bold;">Terjadi kesalahan: ${error.message}</p>`;
    }
}
// ================= STATE & DATA =================
// Initial mock data if empty
const mockReports = [
    {
        id: 'GEO-000101',
        type: 'Deforestación',
        desc: 'Tala indiscriminada cerca del río.',
        date: '2026-09-10',
        lat: 8.7479,
        lng: -75.8814,
        address: 'Bosque Protector Sur',
        severity: 'Alto',
        status: 'En seguimiento',
        photo: 'https://images.unsplash.com/photo-1596328328220-418ebdf1972b?w=400&q=80'
    },
    {
        id: 'GEO-000102',
        type: 'Acumulación de basura',
        desc: 'Basura acumulada en la esquina del parque.',
        date: '2026-09-12',
        lat: 8.7500,
        lng: -75.8800,
        address: 'Parque Central',
        severity: 'Bajo',
        status: 'Solucionado',
        photo: null
    },
    {
        id: 'GEO-000103',
        type: 'Contaminación del agua',
        desc: 'Vertimiento de líquidos extraños al canal.',
        date: '2026-09-14',
        lat: 8.7450,
        lng: -75.8850,
        address: 'Canal Norte',
        severity: 'Crítico',
        status: 'Recibido',
        photo: null
    }
];

// Initialize LocalStorage
function getReports() {
    const data = localStorage.getItem('geoReports');
    if (!data) {
        localStorage.setItem('geoReports', JSON.stringify(mockReports));
        return mockReports;
    }
    return JSON.parse(data);
}

function saveReport(report) {
    const reports = getReports();
    reports.unshift(report);
    localStorage.setItem('geoReports', JSON.stringify(reports));
    updateAppStats();
    if(adminTableLoaded) loadAdminTable();
}

function updateReportStatus(id, newStatus) {
    const reports = getReports();
    const index = reports.findIndex(r => r.id === id);
    if (index !== -1) {
        reports[index].status = newStatus;
        localStorage.setItem('geoReports', JSON.stringify(reports));
        updateAppStats();
        loadAdminTable();
        
        // Notify backend of status change
        fetch(`/api/reports/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        }).catch(err => console.error("Error al actualizar estado en el backend:", err));
    }
}

function deleteReport(id) {
    let reports = getReports();
    reports = reports.filter(r => r.id !== id);
    localStorage.setItem('geoReports', JSON.stringify(reports));
    updateAppStats();
    loadAdminTable();
}

function generateId() {
    return 'GEO-' + Math.floor(100000 + Math.random() * 900000);
}

// ================= ROUTING (SPA) =================
const navLinks = document.querySelectorAll('.nav-item, .nav-btn, .logo, [data-target]');
const sections = document.querySelectorAll('.page-section');
const menuToggle = document.getElementById('menu-toggle');
const navLinksContainer = document.getElementById('nav-links');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const target = link.getAttribute('data-target');
        if (!target) return;
        
        e.preventDefault();
        
        // Hide all sections
        sections.forEach(sec => sec.classList.add('hidden'));
        
        // Show target
        document.getElementById(target).classList.remove('hidden');

        // Toggle footer
        const footer = document.getElementById('main-footer');
        if (footer) {
            if (target === 'home') {
                footer.classList.remove('hidden');
            } else {
                footer.classList.add('hidden');
            }
        }
        
        // Update active class on nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        if (link.classList.contains('nav-item')) {
            link.classList.add('active');
        }
        
        // Close mobile menu
        navLinksContainer.classList.remove('active');
        
        // Scroll to top
        window.scrollTo(0, 0);

        // Special handling per route
        if(target === 'map-view') initMainMap();
        if(target === 'report') initReportMap();
        if(target === 'admin') loadAdminTable();
    });
});

menuToggle.addEventListener('click', () => {
    navLinksContainer.classList.toggle('active');
});

// Smooth scroll for in-page links
document.querySelectorAll('.scroll-link').forEach(link => {
    link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if(href.startsWith('#')) {
            e.preventDefault();
            
            // Ensure home is visible first if we are linking to a home section
            const targetSection = document.querySelector(href);
            if(targetSection && targetSection.closest('#home')) {
                sections.forEach(sec => sec.classList.add('hidden'));
                document.getElementById('home').classList.remove('hidden');
            }

            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
            navLinksContainer.classList.remove('active');
        }
    });
});


// ================= CHARTS =================
let typeChartInstance = null;
let statusChartInstance = null;

function initCharts() {
    const reports = getReports();
    
    // Process Type Data
    const types = {};
    reports.forEach(r => { types[r.type] = (types[r.type] || 0) + 1; });
    
    // Process Status Data
    const statuses = {};
    reports.forEach(r => { statuses[r.status] = (statuses[r.status] || 0) + 1; });

    // Type Chart
    const ctxType = document.getElementById('typeChart');
    if(ctxType) {
        if(typeChartInstance) typeChartInstance.destroy();
        typeChartInstance = new Chart(ctxType, {
            type: 'doughnut',
            data: {
                labels: Object.keys(types),
                datasets: [{
                    data: Object.values(types),
                    backgroundColor: ['#1A4D2E', '#4F6F52', '#387ADF', '#F57C00', '#D32F2F', '#8e44ad', '#2c3e50']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Admin Type Chart
    const ctxAdminType = document.getElementById('adminTypeChart');
    if(ctxAdminType) {
        if(window.adminTypeChartInstance) window.adminTypeChartInstance.destroy();
        window.adminTypeChartInstance = new Chart(ctxAdminType, {
            type: 'doughnut',
            data: {
                labels: Object.keys(types),
                datasets: [{
                    data: Object.values(types),
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                }
            }
        });
    }

    // Status Chart
    const ctxStatus = document.getElementById('statusChart');
    if(ctxStatus) {
        if(statusChartInstance) statusChartInstance.destroy();
        statusChartInstance = new Chart(ctxStatus, {
            type: 'bar',
            data: {
                labels: Object.keys(statuses),
                datasets: [{
                    label: 'Reportes por Estado',
                    data: Object.values(statuses),
                    backgroundColor: ['#E0E0E0', '#FFCA28', '#29B6F6', '#66BB6A']
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // Admin Status Chart
    const ctxAdminStatus = document.getElementById('adminStatusChart');
    if(ctxAdminStatus) {
        if(window.adminStatusChartInstance) window.adminStatusChartInstance.destroy();
        window.adminStatusChartInstance = new Chart(ctxAdminStatus, {
            type: 'bar',
            data: {
                labels: Object.keys(statuses),
                datasets: [{
                    label: 'Reportes por Estado',
                    data: Object.values(statuses),
                    backgroundColor: ['#9ca3af', '#f59e0b', '#3b82f6', '#10b981'],
                    borderRadius: 4
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

function updateAppStats() {
    const reports = getReports();
    
    const total = reports.length;
    const solved = reports.filter(r => r.status === 'Solucionado').length;
    const tracking = reports.filter(r => r.status === 'En seguimiento').length;
    const review = reports.filter(r => r.status === 'En revisión').length;
    const received = reports.filter(r => r.status === 'Recibido').length;

    // Home Stats
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if(document.getElementById('stat-active')) document.getElementById('stat-active').innerText = tracking;
    if(document.getElementById('stat-solved')) document.getElementById('stat-solved').innerText = solved;

    // Admin Stats
    if(document.getElementById('admin-stat-total')) document.getElementById('admin-stat-total').innerText = total;
    if(document.getElementById('admin-stat-tracking')) document.getElementById('admin-stat-tracking').innerText = tracking;
    if(document.getElementById('admin-stat-solved')) document.getElementById('admin-stat-solved').innerText = solved;

    initCharts();
}


// ================= MAPS (LEAFLET) =================
let reportMap = null;
let reportMarker = null;
let mainMap = null;
let mainMarkers = [];

// Default coordinates (Montería, Colombia)
const defaultLat = 8.74798;
const defaultLng = -75.88143;

function initReportMap() {
    if (reportMap) {
        reportMap.invalidateSize();
        return;
    }
    
    reportMap = L.map('report-map').setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(reportMap);

    reportMap.on('click', function(e) {
        setReportMarker(e.latlng.lat, e.latlng.lng);
    });

    // Try to locate user automatically
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            setReportMarker(pos.coords.latitude, pos.coords.longitude);
            reportMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
        }, err => console.log("Geolocalización denegada."));
    }
}

function setReportMarker(lat, lng) {
    if (reportMarker) reportMap.removeLayer(reportMarker);
    reportMarker = L.marker([lat, lng]).addTo(reportMap);
    document.getElementById('inc-lat').value = lat;
    document.getElementById('inc-lng').value = lng;
    
    document.getElementById('location-status').innerText = "Ubicación seleccionada en el mapa.";
    document.getElementById('location-status').style.color = "var(--color-success)";
}

document.getElementById('btn-geolocation').addEventListener('click', () => {
    const status = document.getElementById('location-status');
    status.innerText = "Buscando ubicación...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            setReportMarker(pos.coords.latitude, pos.coords.longitude);
            reportMap.setView([pos.coords.latitude, pos.coords.longitude], 16);
            status.innerText = "Ubicación obtenida.";
        }, err => {
            status.innerText = "Error: Permiso denegado.";
            status.style.color = "var(--color-error)";
        });
    } else {
        status.innerText = "Geolocalización no soportada.";
    }
});

function initMainMap() {
    if (!mainMap) {
        mainMap = L.map('main-map').setView([defaultLat, defaultLng], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mainMap);
    } else {
        mainMap.invalidateSize();
    }
    
    loadMainMapMarkers();
}

function loadMainMapMarkers() {
    const filterType = document.getElementById('filter-type').value;
    const filterStatus = document.getElementById('filter-status').value;
    const reports = getReports();

    // Clear existing
    mainMarkers.forEach(m => mainMap.removeLayer(m));
    mainMarkers = [];

    reports.forEach(r => {
        if(filterType !== 'Todos' && r.type !== filterType) return;
        if(filterStatus !== 'Todos' && r.status !== filterStatus) return;

        let markerColor = r.status === 'Solucionado' ? 'green' : (r.severity === 'Crítico' ? 'red' : 'blue');
        
        // Leaflet default icons don't have colors easily, using standard marker with popup
        const marker = L.marker([r.lat, r.lng]).addTo(mainMap);
        
        let popupContent = `
            <strong>${r.type}</strong><br>
            <em>${r.date}</em><br>
            <p>${r.desc}</p>
            <b>Gravedad:</b> ${r.severity}<br>
            <b>Estado:</b> ${r.status}
        `;
        if(r.photo) {
            popupContent += `<br><img src="${r.photo}" style="width:100%;max-height:100px;border-radius:4px;margin-top:5px;">`;
        }

        marker.bindPopup(popupContent);
        mainMarkers.push(marker);
    });
}

document.getElementById('filter-type').addEventListener('change', loadMainMapMarkers);
document.getElementById('filter-status').addEventListener('change', loadMainMapMarkers);


// ================= PHOTO PREVIEW =================
let currentPhotoDataUrl = null;

document.getElementById('inc-photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentPhotoDataUrl = e.target.result;
            document.getElementById('photo-preview').src = currentPhotoDataUrl;
            document.getElementById('photo-preview-container').classList.remove('hidden');
            document.getElementById('file-upload-container').classList.add('hidden');
            document.getElementById('btn-start-camera').parentElement.classList.add('hidden');
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('remove-photo').addEventListener('click', () => {
    document.getElementById('inc-photo').value = "";
    currentPhotoDataUrl = null;
    document.getElementById('photo-preview-container').classList.add('hidden');
    document.getElementById('file-upload-container').classList.remove('hidden');
    document.getElementById('btn-start-camera').parentElement.classList.remove('hidden');
});

// ================= CAMERA LOGIC =================
let cameraStream = null;

document.getElementById('btn-start-camera').addEventListener('click', async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.getElementById('camera-video');
        video.srcObject = cameraStream;
        document.getElementById('camera-container').classList.remove('hidden');
        document.getElementById('file-upload-container').classList.add('hidden');
        document.getElementById('btn-start-camera').parentElement.classList.add('hidden');
    } catch (err) {
        alert("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.");
        console.error(err);
    }
});

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById('camera-container').classList.add('hidden');
}

document.getElementById('btn-stop-camera').addEventListener('click', () => {
    stopCamera();
    document.getElementById('file-upload-container').classList.remove('hidden');
    document.getElementById('btn-start-camera').parentElement.classList.remove('hidden');
});

document.getElementById('btn-capture-photo').addEventListener('click', () => {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    currentPhotoDataUrl = canvas.toDataURL('image/jpeg');
    document.getElementById('photo-preview').src = currentPhotoDataUrl;
    document.getElementById('photo-preview-container').classList.remove('hidden');
    
    stopCamera();
});



// ================= REPORT SUBMISSION =================
document.getElementById('report-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const lat = document.getElementById('inc-lat').value;
    const lng = document.getElementById('inc-lng').value;
    
    if(!lat || !lng) {
        alert("Por favor, selecciona la ubicación en el mapa.");
        return;
    }

    const notify = document.getElementById('inc-notify').checked;
    const email = document.getElementById('inc-email').value;

    if (notify && !email) {
        alert("Debes proporcionar un correo electrónico válido si deseas recibir notificaciones.");
        return;
    }

    const newReport = {
        id: generateId(),
        type: document.getElementById('inc-type').value,
        desc: document.getElementById('inc-desc').value,
        date: document.getElementById('inc-date').value,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: document.getElementById('inc-address').value,
        severity: document.querySelector('input[name="severity"]:checked').value,
        status: 'Recibido',
        photo: currentPhotoDataUrl,
        name: document.getElementById('inc-name').value,
        email: email,
        notify: notify
    };

    saveReport(newReport);

    // Send to backend for email notification and DB storage
    fetch('/api/reports', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newReport)
    }).catch(err => console.error("Error al notificar al backend:", err));

    document.getElementById('report-form').classList.add('hidden');
    document.getElementById('report-success').classList.remove('hidden');
    document.getElementById('generated-code').innerText = newReport.id;
    
    // Pre-fill track input
    document.getElementById('search-code').value = newReport.id;
});

function resetReportForm() {
    document.getElementById('report-form').reset();
    document.getElementById('report-form').classList.remove('hidden');
    document.getElementById('report-success').classList.add('hidden');
    document.getElementById('remove-photo').click();
    document.getElementById('location-status').innerText = "";
}

document.getElementById('btn-new-report').addEventListener('click', resetReportForm);
document.getElementById('btn-track-new-report').addEventListener('click', () => {
    document.querySelector('[data-target="track"]').click();
    document.getElementById('btn-search-report').click();
});


// ================= TRACK REPORT =================
document.getElementById('btn-search-report').addEventListener('click', () => {
    const code = document.getElementById('search-code').value.trim().toUpperCase();
    if(!code) return;

    const report = getReports().find(r => r.id === code);
    
    const errorEl = document.getElementById('search-error');
    const detailsEl = document.getElementById('report-details');

    if (report) {
        errorEl.classList.add('hidden');
        detailsEl.classList.remove('hidden');
        
        document.getElementById('det-code').innerText = report.id;
        document.getElementById('det-severity').innerText = `Gravedad ${report.severity}`;
        document.getElementById('det-type').innerText = report.type;
        document.getElementById('det-date').innerText = report.date;
        document.getElementById('det-address').innerText = report.address;
        document.getElementById('det-desc').innerText = report.desc;

        const photoContainer = document.getElementById('det-photo-container');
        if(report.photo) {
            photoContainer.classList.remove('hidden');
            document.getElementById('det-photo').src = report.photo;
        } else {
            photoContainer.classList.add('hidden');
        }

        // Timeline Update
        const steps = ['Recibido', 'En revisión', 'En seguimiento', 'Solucionado'];
        const stepElements = {
            'Recibido': document.getElementById('step-recibido'),
            'En revisión': document.getElementById('step-revision'),
            'En seguimiento': document.getElementById('step-seguimiento'),
            'Solucionado': document.getElementById('step-solucionado')
        };
        const lines = document.querySelectorAll('.timeline-line');

        // Reset
        Object.values(stepElements).forEach(el => {
            el.classList.remove('active', 'completed');
        });
        lines.forEach(l => l.classList.remove('completed'));

        const currentIndex = steps.indexOf(report.status);
        
        for(let i=0; i<=currentIndex; i++) {
            if(i === currentIndex) {
                stepElements[steps[i]].classList.add('active');
            } else {
                stepElements[steps[i]].classList.add('completed');
                if(i < lines.length) lines[i].classList.add('completed');
            }
        }
    } else {
        errorEl.classList.remove('hidden');
        detailsEl.classList.add('hidden');
    }
});


// ================= ADMIN DASHBOARD =================
let adminTableLoaded = false;
let currentEditId = null;

function loadAdminTable() {
    adminTableLoaded = true;
    const reports = getReports();
    const tbody = document.getElementById('admin-table-body');
    if(!tbody) return;
    
    const searchVal = document.getElementById('admin-search').value.toLowerCase();
    
    tbody.innerHTML = '';
    
    reports.forEach(r => {
        if(searchVal && !r.id.toLowerCase().includes(searchVal) && !r.type.toLowerCase().includes(searchVal)) {
            return;
        }

        const tr = document.createElement('tr');
        
        let statusClass = 'recibido';
        if(r.status === 'Recibido') statusClass = 'recibido';
        if(r.status === 'En revisión') statusClass = 'revision';
        if(r.status === 'En seguimiento') statusClass = 'seguimiento';
        if(r.status === 'Solucionado') statusClass = 'solucionado';

        tr.innerHTML = `
            <td><strong>${r.id}</strong></td>
            <td>${r.date}</td>
            <td>${r.type}</td>
            <td>${r.severity}</td>
            <td><span class="status-badge ${statusClass}">${r.status}</span></td>
            <td>
                <button class="btn-secondary btn-small" onclick="openAdminModal('${r.id}')">
                    <i class='bx bx-edit'></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('admin-search').addEventListener('input', loadAdminTable);

function openAdminModal(id) {
    const report = getReports().find(r => r.id === id);
    if(!report) return;

    currentEditId = id;
    document.getElementById('modal-code').innerText = id;
    
    // Fill details
    document.getElementById('modal-type').innerText = report.type;
    document.getElementById('modal-desc').innerText = report.desc;
    document.getElementById('modal-address').innerText = report.address || 'No especificada';
    
    const coordsContainer = document.getElementById('modal-coords-container');
    const coordsLink = document.getElementById('modal-coords');
    if (report.lat && report.lng) {
        coordsLink.innerText = `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)} (Ver mapa)`;
        coordsLink.href = `https://www.google.com/maps?q=${report.lat},${report.lng}`;
        coordsContainer.style.display = 'block';
    } else {
        coordsContainer.style.display = 'none';
    }

    document.getElementById('modal-contact').innerText = report.name ? `${report.name} (${report.email || ''})` : 'Anónimo';
    
    if (report.photo) {
        document.getElementById('modal-photo').src = report.photo;
        document.getElementById('modal-photo-container').classList.remove('hidden');
    } else {
        document.getElementById('modal-photo-container').classList.add('hidden');
    }

    document.getElementById('modal-status').value = report.status;
    document.getElementById('admin-modal').classList.remove('hidden');
}

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('admin-modal').classList.add('hidden');
});

document.getElementById('btn-save-status').addEventListener('click', () => {
    if(currentEditId) {
        const newStatus = document.getElementById('modal-status').value;
        updateReportStatus(currentEditId, newStatus);
        document.getElementById('admin-modal').classList.add('hidden');
        
        // Also update track view if it's the currently searched one
        if(document.getElementById('search-code').value.trim().toUpperCase() === currentEditId) {
            document.getElementById('btn-search-report').click();
        }
    }
});

document.getElementById('btn-delete-report').addEventListener('click', () => {
    if(currentEditId && confirm("¿Estás seguro de eliminar este reporte?")) {
        deleteReport(currentEditId);
        document.getElementById('admin-modal').classList.add('hidden');
    }
});

document.getElementById('admin-reset-data').addEventListener('click', () => {
    if(confirm("¿Estás seguro de limpiar todos los datos? Esto restaurará los datos de prueba.")) {
        localStorage.removeItem('geoReports');
        updateAppStats();
        loadAdminTable();
        loadMainMapMarkers();
    }
});

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    updateAppStats();
    
    // Automatically set date to today on form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inc-date').value = today;
});


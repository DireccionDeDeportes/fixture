import Papa from 'papaparse';

let matchesData = [];

  
 async function cargarJSON(url) {
            const respuesta = await fetch(url); // Realiza una solicitud HTTP para el archivo JSON
            const datos = await respuesta.json(); // Analiza la respuesta como JSON
            return datos;
        }   

document.addEventListener('DOMContentLoaded', () => {
     cargarJSON('output.json')
            .then(datos => {
                // Aquí puedes acceder a los datos del archivo JSON
               
                try {
                    const partidos = JSON.parse(JSON.stringify(datos));
                    loadJSONData(partidos);
                } catch (error) {
                    console.error('Error al importar datos:', error);
                    alert('Error al importar datos: ' + error.message);
                }
            })
            .catch(error => {
                console.error('Error cargando el JSON:', error);
            });
    
   // document.getElementById('csv-file').addEventListener('change', handleFileUpload);
});

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('file-name').textContent = `Archivo: ${file.name}`;
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    processCSVData(results.data);
                }
            },
            error: function(error) {
                console.error('Error al parsear el archivo CSV:', error);
                alert('Error al procesar el archivo. Por favor, verifica el formato.');
            }
        });
    }
}

// Modificar la función loadCSVFromText para manejar JSON
function loadJSONData(jsonData) {
    try {
        if (Array.isArray(jsonData)) {
            processCSVData(jsonData);
           // document.getElementById('file-name').textContent = 'Datos JSON cargados';
        } else {
            throw new Error('El formato JSON no es válido');
        }
    } catch (error) {
        console.error('Error al procesar el JSON:', error);
        alert('Error al procesar los datos. Por favor, verifica el formato.');
    }
}

function processCSVData(data) {
    const requiredColumns = ['Equipo', 'Celular', 'Fecha y hora', 'Cancha'];
    const headers = Object.keys(data[0]);
    
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
        alert(`El archivo no contiene las columnas requeridas: ${missingColumns.join(', ')}`);
        return;
    }
    
    const matchesByDate = {};
    const matchesWithoutDate = [];
    
    data.forEach(row => {
        const matchKey = `${row['Fecha y hora']}_${row['Cancha']}`;
        
        if (!row['Fecha y hora']) {
            const courtKey = row['Cancha'];
            if (!matchesWithoutDate[courtKey]) {
                matchesWithoutDate[courtKey] = [];
            }
            matchesWithoutDate[courtKey].push({
                equipo: row['Equipo'],
                fechaHora: null,
                cancha: row['Cancha']
            });
            return;
        }

        if (!matchesByDate[matchKey]) {
            matchesByDate[matchKey] = [];
        }
        
        matchesByDate[matchKey].push({
            equipo: row['Equipo'],
            fechaHora: row['Fecha y hora'],
            cancha: row['Cancha']
        });
    });
    
    matchesData = {
        withDate: Object.values(matchesByDate),
        withoutDate: Object.values(matchesWithoutDate)
    };
    
    localStorage.setItem('matchesData', JSON.stringify(matchesData));
    renderMatches(matchesData);
}

function renderMatches(matches) {
    const matchesList = document.getElementById('matches-list');
    matchesList.innerHTML = '';
    
    if (!matches.withDate?.length && !matches.withoutDate?.length) {
        matchesList.innerHTML = '<p class="no-matches">No hay partidos para mostrar. Carga un archivo CSV para comenzar.</p>';
        return;
    }

    const matchesByDate = {};
    matches.withDate.forEach(match => {
        const date = match[0].fechaHora.split(' ')[0];
        if (!matchesByDate[date]) {
            matchesByDate[date] = [];
        }
        matchesByDate[date].push(match);
    });

    // Sort dates in ascending order
    const sortedDates = Object.keys(matchesByDate).sort((a, b) => {
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateA - dateB;
    });

    sortedDates.forEach(date => {
        const dateMatches = matchesByDate[date];
        const dateSection = document.createElement('div');
        dateSection.className = 'date-section';
        dateSection.innerHTML = `<h3 class="date-header">${date}</h3>`;

        const courtMatches = {};
        dateMatches.forEach(match => {
            const court = match[0].cancha;
            if (!courtMatches[court]) {
                courtMatches[court] = [];
            }
            courtMatches[court].push(match);
        });

        // Sort matches within each court by time
        Object.entries(courtMatches).forEach(([court, matches]) => {
            const courtSection = document.createElement('div');
            courtSection.className = 'court-section';
            courtSection.innerHTML = `<h4 class="court-header">Cancha: ${court}</h4>`;

            // Sort matches by time
            matches.sort((a, b) => {
                const timeA = a[0].fechaHora.split(' ')[1];
                const timeB = b[0].fechaHora.split(' ')[1];
                return timeA.localeCompare(timeB);
            });

            matches.forEach(match => {
                const matchCard = createMatchCard(match);
                courtSection.appendChild(matchCard);
            });

            dateSection.appendChild(courtSection);
        });

        matchesList.appendChild(dateSection);
    });

    if (matches.withoutDate && matches.withoutDate.length > 0) {
        const undatedSection = document.createElement('div');
        undatedSection.className = 'undated-section';
        undatedSection.innerHTML = '<h3 class="undated-header">Equipos Sin Fecha Asignada</h3>';

        Object.entries(matches.withoutDate).forEach(([court, matches]) => {
            const courtSection = document.createElement('div');
            courtSection.className = 'court-section';
            courtSection.innerHTML = `<h4 class="court-header">Cancha: ${court}</h4>`;

            matches.forEach(match => {
                const teamDiv = document.createElement('div');
                teamDiv.className = 'team';
                teamDiv.innerHTML = `<div class="team-name">${match.equipo}</div>`;
                courtSection.appendChild(teamDiv);
            });

            undatedSection.appendChild(courtSection);
        });

        matchesList.appendChild(undatedSection);
    }
}

function createMatchCard(match) {
    const matchCard = document.createElement('div');
    matchCard.className = 'match-card';
    
    const time = match[0].fechaHora.split(' ')[1] || '';
    
    matchCard.innerHTML = `
        <div class="match-header">
            <div class="match-time">${time}</div>
        </div>
        <div class="match-teams">
            ${match.length === 2 ? `
                <div class="team">
                    <div class="team-name">${match[0].equipo}</div>
                </div>
                <div class="versus">VS</div>
                <div class="team">
                    <div class="team-name">${match[1].equipo}</div>
                </div>
            ` : match.map(team => `
                <div class="team">
                    <div class="team-name">${team.equipo}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    return matchCard;
}

function formatDate(dateString) {
    try {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', options);
    } catch (e) {
        return dateString;
    }
}
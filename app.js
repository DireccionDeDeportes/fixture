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

    const savedData = localStorage.getItem('matchesData');
    if (savedData) {
        matchesData = JSON.parse(savedData);
        renderMatches(matchesData);
    }
});


// New function to load JSON data
function loadJSONData(jsonData) {
    try {
        processJSONData(jsonData);
        //document.getElementById('file-name').textContent = 'Datos JSON cargados';
    } catch (error) {
        console.error('Error al procesar los datos JSON:', error);
        alert('Error al procesar los datos. Por favor, verifica el formato.');
    }
}

function processJSONData(data) {
    const requiredFields = ['Equipo', 'Celular', 'Fecha y hora', 'Cancha', 'categoria'];
    
    if (!Array.isArray(data)) {
        alert('Los datos deben estar en formato de array');
        return;
    }
    
    if (data.length === 0) {
        alert('No hay datos para procesar');
        return;
    }
    
    const missingFields = requiredFields.filter(field => !data[0].hasOwnProperty(field));
    if (missingFields.length > 0) {
        alert(`Los datos no contienen los campos requeridos: ${missingFields.join(', ')}`);
        return;
    }

    const matchesByDate = {};
    const matchesWithoutDate = [];
    
    data.forEach(row => {
        const matchKey = `${row['Fecha y hora']}_${row['Cancha']}_${row['categoria']}`;
        
        if (!row['Fecha y hora']) {
            const courtKey = row['Cancha'];
            if (!matchesWithoutDate[courtKey]) {
                matchesWithoutDate[courtKey] = [];
            }
            matchesWithoutDate[courtKey].push({
                equipo: row['Equipo'],
                fechaHora: null,
                cancha: row['Cancha'],
                categoria: row['categoria']
            });
            return;
        }

        if (!matchesByDate[matchKey]) {
            matchesByDate[matchKey] = [];
        }
        
        matchesByDate[matchKey].push({
            equipo: row['Equipo'],
            fechaHora: row['Fecha y hora'],
            cancha: row['Cancha'],
            categoria: row['categoria']
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
        matchesList.innerHTML = '<p class="no-matches">No hay partidos para mostrar.</p>';
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

        // Group matches by category first
        const categoryMatches = {};
        dateMatches.forEach(match => {
            const category = match[0].categoria;
            if (!categoryMatches[category]) {
                categoryMatches[category] = {};
            }
            const court = match[0].cancha;
            if (!categoryMatches[category][court]) {
                categoryMatches[category][court] = [];
            }
            categoryMatches[category][court].push(match);
        });

        // Sort categories alphabetically
        Object.keys(categoryMatches).sort().forEach(category => {
            const categorySection = document.createElement('div');
            categorySection.className = 'category-section';
            categorySection.innerHTML = `<h4 class="category-header">${category}</h4>`;

            Object.entries(categoryMatches[category]).forEach(([court, matches]) => {
                const courtSection = document.createElement('div');
                courtSection.className = 'court-section';
                courtSection.innerHTML = `<h5 class="court-header">${court}</h5>`;

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

                categorySection.appendChild(courtSection);
            });

            dateSection.appendChild(categorySection);
        });

        matchesList.appendChild(dateSection);
    });

    if (matches.withoutDate && matches.withoutDate.length > 0) {
        const undatedSection = document.createElement('div');
        undatedSection.className = 'undated-section';
        undatedSection.innerHTML = '<h3 class="undated-header">Partidos Sin Fecha Asignada</h3>';

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

// Example usage:
const exampleData = [
    {
        "Equipo": "11 REYNAS - B° KENNEDY (SUB-16 F)",
        "Celular": "2664023142",
        "Fecha y hora": "18/5/2025 10:20:00",
        "Cancha": "Cancha N° 5",
        "categoria": "SUB-16 F"
    },
    {
        "Equipo": "B° SOLIDARIDAD (SUB-16 F)",
        "Celular": "2664563981",
        "Fecha y hora": "18/5/2025 9:10:00",
        "Cancha": "Cancha N° 5",
        "categoria": "SUB-16 F"
    }
];

loadJSONData(exampleData);
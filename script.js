let chartInstance = null;
let activities = [];
let doughnutChart = null;

// Função para carregar o CSV e atualizar a tabela
function loadCSV() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Por favor, selecione um arquivo CSV.");
        return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            activities = results.data;
            populateTable(activities);
            updateCards();
        }
    });
}

// Função para preencher a tabela com os dados
function populateTable(data) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = 
            `<td>${row.Ordem || ''}</td>
            <td>${row['Tipo de ordem'] || ''}</td>
            <td>${row['Código ABC'] || ''}</td>
            <td>${row['Data-base iníc.'] || ''}</td>
            <td>${row['Loc.instalação'] || ''}</td>
            <td>${row['Denominação'] || ''}</td>
            <td>${row['Texto breve'] || ''}</td>
            <td>${row['Duração normal'] || ''}</td>
            <td>${row['Número'] || ''}</td>
            <td>${row['TOTAL HH'] || ''}</td>
            <td>${row['Status'] || ''}</td>`;
        tableBody.appendChild(tr);
    });
}

// Adiciona o evento de clique para o botão de importação
document.getElementById('load-button').addEventListener('click', function() {
    loadCSV();
});

// Adiciona o evento de clique para apagar a planilha
document.getElementById('delete-button').addEventListener('click', function() {
    activities = [];
    populateTable(activities);
    document.getElementById('csvFileInput').value = ''; // Limpar o input de arquivo
});

// Adiciona o evento de submit para atualizar o status
document.getElementById('update-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const ordem = document.getElementById('Ordem').value;
    updateStatus(ordem);
});

// Adiciona o evento de submit para retirar a conclusão
document.getElementById('uncomplete-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const ordem = document.getElementById('UncompleteOrdem').value;
    uncompleteStatus(ordem);
});

// Atualiza o status de uma ordem
function updateStatus(ordem) {
    activities.forEach(activity => {
        if (activity.Ordem === ordem) {
            activity.Status = 'Concluído'; // Atualiza para 'Concluído'
        }
    });
    populateTable(activities);
    generateChart(); // Atualiza a curva S após atualizar o status
}

// Remove a conclusão de uma ordem
function uncompleteStatus(ordem) {
    activities.forEach(activity => {
        if (activity.Ordem === ordem) {
            activity.Status = ''; // Retira o status de 'Concluído'
        }
    });
    populateTable(activities);
    generateChart(); // Atualiza a curva S após retirar a conclusão
}

// Adiciona o evento de clique para gerar o gráfico
document.getElementById('generate-chart-button').addEventListener('click', function() {
    generateChart();
});

// Adiciona o evento de clique para salvar o CSV
document.getElementById('save-csv-button').addEventListener('click', function() {
    saveCSV();
});

// Gera o gráfico Curva S
function generateChart() {
    const totalActivities = activities.length;
    if (totalActivities === 0) {
        alert("Por favor, carregue um arquivo CSV primeiro.");
        return;
    }

    const completedActivities = activities.filter(activity => activity.Status === 'Concluído').length;

    const labels = activities.map(activity => activity['Data-base iníc.']);
    const completedData = [];
    const plannedData = [];
    let cumulativeCompleted = 0;
    let cumulativePlanned = 0;

    const totalHHPlanned = activities.reduce((sum, activity) => sum + (parseFloat(activity['TOTAL HH']) || 0), 0);

    activities.forEach((activity) => {
        cumulativePlanned += parseFloat(activity['TOTAL HH']) || 0;
        plannedData.push((cumulativePlanned / totalHHPlanned) * 100);
        
        if (activity.Status === 'Concluído') {
            cumulativeCompleted += parseFloat(activity['TOTAL HH']) || 0;
        }
        completedData.push((cumulativeCompleted / totalHHPlanned) * 100);
    });

    const ctx = document.getElementById('curva-s-chart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Concluído',
                    data: completedData,
                    fill: false,
                    borderColor: '#007bff', // azul para concluído
                    tension: 0.1,
                    borderWidth: 2
                },
                {
                    label: 'Planejado',
                    data: plannedData,
                    fill: false,
                    borderColor: '#ff5733', // vermelho para planejado
                    tension: 0.1,
                    borderWidth: 2
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) { return value + '%' }
                    }
                }
            }
        }
    });

    updateCards();
}

// Atualiza os cartões com totais e percentuais
function updateCards() {
    const totalActivities = activities.length;
    const completedActivities = activities.filter(activity => activity.Status === 'Concluído').length;

    const totalHHPlanned = activities.reduce((sum, activity) => sum + (parseFloat(activity['TOTAL HH']) || 0), 0);
    const totalHHCompleted = activities
        .filter(activity => activity.Status === 'Concluído')
        .reduce((sum, activity) => sum + (parseFloat(activity['TOTAL HH']) || 0), 0);

    document.getElementById('totals-info').innerHTML = 
        `<div>Total de Ordens: ${totalActivities}</div>
         <div>Ordens Concluídas: ${completedActivities}</div>
         <div>Total HH Planejado: ${totalHHPlanned.toFixed(2)}</div>
         <div>Total HH Concluído: ${totalHHCompleted.toFixed(2)}</div>`;

    const percentageCompleted = (completedActivities / totalActivities) * 100 || 0;
    document.getElementById('percentage-info').innerHTML = 
        `Percentual Concluído: ${percentageCompleted.toFixed(2)}%`;

    if (doughnutChart) {
        doughnutChart.destroy();
    }

    const ctxDoughnut = document.getElementById('percentage-doughnut-chart').getContext('2d');
    doughnutChart = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Concluído', 'Planejado'],
            datasets: [{
                data: [completedActivities, totalActivities - completedActivities],
                backgroundColor: ['#007bff', '#e9ecef']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (context.parsed !== null) {
                                label += `: ${context.parsed} (${context.formattedValue})`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Função para salvar o CSV
function saveCSV() {
    if (activities.length === 0) {
        alert("Não há dados para salvar.");
        return;
    }

    // Convertendo os dados em CSV
    const csvRows = [];
    const headers = Object.keys(activities[0]);
    csvRows.push(headers.join(','));

    for (const activity of activities) {
        const values = headers.map(header => {
            const escaped = ('' + activity[header]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    // Criando o blob e o link para download
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PARADA.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Função de pesquisa na tabela
document.getElementById('search-input').addEventListener('input', function(event) {
    const searchTerm = event.target.value.toLowerCase();
    const rows = document.querySelectorAll('#table-body tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const found = Array.from(cells).some(cell => cell.textContent.toLowerCase().includes(searchTerm));
        row.style.display = found ? '' : 'none';
    });
});

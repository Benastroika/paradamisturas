let chartInstance = null;
let activities = [];

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
        }
    });
}

function populateTable(data) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.Ordem || ''}</td>
            <td>${row['Tipo de ordem'] || ''}</td>
            <td>${row['Código ABC'] || ''}</td>
            <td>${row['Data-base iníc.'] || ''}</td>
            <td>${row['Loc.instalação'] || ''}</td>
            <td>${row['Denominação'] || ''}</td>
            <td>${row['Texto breve'] || ''}</td>
            <td>${row['Duração normal'] || ''}</td>
            <td>${row['Número'] || ''}</td>
            <td>${row['TOTAL HH'] || ''}</td>
            <td>${row['Status'] || ''}</td>
        `;
        tableBody.appendChild(tr);
    });
}

document.getElementById('load-button').addEventListener('click', function() {
    loadCSV();
});

document.getElementById('update-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const ordem = document.getElementById('Ordem').value;
    updateStatus(ordem);
});

function updateStatus(ordem) {
    activities.forEach(activity => {
        if (activity.Ordem === ordem) {
            activity.Status = 'Concluído'; // Atualiza para 'Concluído'
        }
    });
    populateTable(activities);
}

document.getElementById('generate-chart-button').addEventListener('click', function() {
    generateCurvaS();
});

function generateCurvaS() {
    const totalActivities = activities.length;
    if (totalActivities === 0) {
        alert("Não há atividades para gerar o gráfico.");
        return;
    }

    // Dados para o gráfico
    const cumulativeData = activities.reduce((acc, activity) => {
        const date = new Date(activity['Data-base iníc.']);
        const status = (activity.Status === 'Concluído') ? 1 : 0;
        const last = acc.length ? acc[acc.length - 1].value : 0;
        acc.push({ date, value: last + status });
        return acc;
    }, []);

    cumulativeData.sort((a, b) => a.date - b.date);

    const labels = cumulativeData.map(item => {
        const date = item.date;
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    });

    const data = cumulativeData.map(item => (item.value / totalActivities) * 100);

    // Gerando a linha base proporcional
    const baselineData = [];
    const numPoints = labels.length;
    const step = 100 / (numPoints - 1);
    let expectedPercentage = 0;

    for (let i = 0; i < numPoints; i++) {
        expectedPercentage = step * i;
        baselineData.push(expectedPercentage);
    }

    // Adicionando pontos de mudança na linha base
    const changePoints = cumulativeData.map((item, index) => {
        if (index === 0 || index === cumulativeData.length - 1 || (index % Math.floor(cumulativeData.length / 3)) === 0) {
            return {
                x: index,
                y: (index / (cumulativeData.length - 1)) * 100
            };
        }
        return null;
    }).filter(point => point !== null);

    const chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Curva S',
                data: data,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                fill: true
            },
            {
                label: 'Linha Base Esperada',
                data: baselineData,
                borderColor: '#ff5733',
                backgroundColor: 'rgba(255, 87, 51, 0.2)',
                borderDash: [10, 5], // Linha pontilhada
                fill: false
            }
        ]
    };

    const ctx = document.getElementById('curva-s-chart').getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            scales: {
                x: {
                    type: 'category',
                    labels: labels,
                    title: {
                        display: true,
                        text: 'Data'
                    }
                },
                y: {
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Percentual'
                    }
                }
            },
            plugins: {
                annotation: {
                    annotations: changePoints.map(point => ({
                        type: 'line',
                        xMin: point.x,
                        xMax: point.x,
                        borderColor: 'rgba(255, 87, 51, 0.5)', // Cor mais clara
                        borderWidth: 1, // Largura da linha
                        borderDash: [5, 5], // Pontilhado
                        label: {
                            content: labels[point.x],
                            enabled: true,
                            position: 'top'
                        }
                    }))
                }
            }
        }
    });

    // Atualizar informações de porcentagem
    const executedActivities = activities.filter(activity => activity.Status === 'Concluído').length;
    const percentageExecuted = ((executedActivities / totalActivities) * 100).toFixed(2);
    const percentageExpected = (100).toFixed(2); // Porcentagem esperada é sempre 100%

    document.getElementById('percentage-info').textContent = `Percentual de Atividades Executadas: ${percentageExecuted}% | Percentual Esperado: ${percentageExpected}%`;
}

document.getElementById('delete-button').addEventListener('click', function() {
    activities = [];
    populateTable(activities);
    if (chartInstance) {
        chartInstance.destroy();
    }
    document.getElementById('percentage-info').textContent = '';
    alert("Planilha apagada com sucesso.");
});

document.getElementById('save-button').addEventListener('click', function() {
    saveCSV();
});

function saveCSV() {
    const csvData = Papa.unparse(activities, {
        header: true
    });

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'PARADA.csv');
    link.click();
}

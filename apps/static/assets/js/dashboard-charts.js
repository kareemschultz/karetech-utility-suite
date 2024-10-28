// static/assets/js/dashboard-charts.js

const DashboardCharts = {
    init() {
        this.initUsageMetricsChart();
    },

    initUsageMetricsChart() {
        const ctx = document.getElementById('usage-metrics-chart');
        if (!ctx) return;

        // Sample data - in production, this would come from your backend
        const data = {
            labels: ['Calculator', 'Network', 'Utilities'],
            datasets: [{
                label: 'Tool Usage',
                data: [65, 45, 35],
                backgroundColor: [
                    'rgba(94, 114, 228, 0.2)',
                    'rgba(45, 206, 137, 0.2)',
                    'rgba(251, 99, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(94, 114, 228, 1)',
                    'rgba(45, 206, 137, 1)',
                    'rgba(251, 99, 64, 1)'
                ],
                borderWidth: 2
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    gridLines: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        zeroLineColor: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    }
                }],
                xAxes: [{
                    gridLines: {
                        display: false
                    }
                }]
            },
            legend: {
                display: false
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        return data.datasets[tooltipItem.datasetIndex].label + ': ' + 
                               tooltipItem.yLabel + '%';
                    }
                }
            }
        };

        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: options
        });
    },

    // Add more chart initializations as needed
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    DashboardCharts.init();
});
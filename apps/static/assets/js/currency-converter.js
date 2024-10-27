// static/assets/js/currency-converter.js

const CurrencyConverter = {
    init() {
        this.form = document.getElementById('converter-form');
        this.results = document.getElementById('results');
        this.rateChart = null;
        this.rates = {};
        
        this.bindEvents();
        this.loadInitialRates();
        this.initializeChart();
    },

    bindEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performConversion();
            });

            // Quick conversion links
            document.querySelectorAll('[data-conversion]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const [from, to] = link.dataset.conversion.split('-');
                    this.setConversion(from, to);
                });
            });

            // Currency switch button
            const switchBtn = document.getElementById('switch-currencies');
            if (switchBtn) {
                switchBtn.addEventListener('click', () => this.switchCurrencies());
            }
        }
    },

    async loadInitialRates() {
        try {
            const response = await fetch('/get-exchange-rates');
            const data = await response.json();
            
            if (data.success) {
                this.rates = data.rates;
                this.updateLastUpdated();
                this.updateCommonRates();
                this.updateChart();
            }
        } catch (error) {
            console.error('Error loading rates:', error);
        }
    },

    initializeChart() {
        const ctx = document.getElementById('rateChart');
        if (!ctx) return;

        this.rateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Exchange Rate',
                    data: [],
                    borderColor: '#5e72e4',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    },

    async performConversion() {
        try {
            const submitBtn = this.form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
            submitBtn.disabled = true;

            const formData = new FormData(this.form);
            const response = await fetch('/convert-currency', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Conversion failed');
            }

            this.displayResults(data.result);
            this.updateChart(data.result.historical_rates);

        } catch (error) {
            console.error('Conversion error:', error);
            this.showError(error.message);
        } finally {
            const submitBtn = this.form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="ni ni-refresh-02 mr-2"></i>Convert';
            submitBtn.disabled = false;
        }
    },

    displayResults(result) {
        if (!this.results) return;

        document.getElementById('from-amount').textContent = 
            this.formatCurrency(result.amount, result.from_currency);
        document.getElementById('to-amount').textContent = 
            this.formatCurrency(result.converted_amount, result.to_currency);
        document.getElementById('exchange-rate').textContent = 
            `1 ${result.from_currency} = ${result.rate} ${result.to_currency}`;

        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth' });
    },

    updateChart(historicalRates) {
        if (!this.rateChart || !historicalRates) return;

        this.rateChart.data.labels = historicalRates.map(rate => rate.date);
        this.rateChart.data.datasets[0].data = historicalRates.map(rate => rate.rate);
        this.rateChart.update();
    },

    formatCurrency(amount, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    },

    switchCurrencies() {
        const fromSelect = document.getElementById('from_currency');
        const toSelect = document.getElementById('to_currency');
        [fromSelect.value, toSelect.value] = [toSelect.value, fromSelect.value];
    },

    setConversion(from, to) {
        document.getElementById('from_currency').value = from;
        document.getElementById('to_currency').value = to;
        this.form.requestSubmit();
    },

    showError(message) {
        const alertHtml = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <span class="alert-icon"><i class="ni ni-notification-70"></i></span>
                <span class="alert-text">${message}</span>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        
        if (this.results) {
            this.results.innerHTML = alertHtml;
            this.results.style.display = 'block';
            this.results.scrollIntoView({ behavior: 'smooth' });
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    CurrencyConverter.init();
});
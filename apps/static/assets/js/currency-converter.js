// static/assets/js/currency-converter.js

const CurrencyConverter = {
    init() {
        // Initialize properties
        this.form = document.getElementById('converter-form');
        this.results = document.getElementById('results');
        this.rateChart = null;
        this.currencies = {};
        this.rates = {};
        this.currentFilter = 'all';
        
        // Wait for DOM and Chart.js to be fully loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        this.bindEvents();
        this.loadInitialRates();
    },

    bindEvents() {
        if (this.form) {
            // Form submission
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performConversion();
            });

            // Currency switch button
            const switchBtn = document.getElementById('switch-currencies');
            if (switchBtn) {
                switchBtn.addEventListener('click', () => this.switchCurrencies());
            }

            // Quick convert buttons
            document.querySelectorAll('.quick-convert-buttons button').forEach(button => {
                button.addEventListener('click', () => {
                    const fromCurrency = button.dataset.from;
                    const toCurrency = button.dataset.to;
                    this.quickConvert(fromCurrency, toCurrency);
                });
            });

            // Region filter
            document.querySelectorAll('#region-filter .dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.filterByRegion(item.dataset.region);
                    
                    // Update active state
                    document.querySelectorAll('#region-filter .dropdown-item').forEach(el => 
                        el.classList.remove('active'));
                    item.classList.add('active');
                });
            });

            // Real-time conversion on amount change
            const amountInput = document.getElementById('amount');
            if (amountInput) {
                amountInput.addEventListener('input', () => {
                    if (this.form.checkValidity() && amountInput.value) {
                        this.performConversion();
                    }
                });
            }

            // Currency select changes
            ['from_currency', 'to_currency'].forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    select.addEventListener('change', () => {
                        if (this.form.checkValidity()) {
                            this.performConversion();
                        }
                    });
                }
            });
        }
    },

    async loadInitialRates() {
        try {
            const response = await fetch('/get-exchange-rates');
            const data = await response.json();
            
            if (data.success) {
                this.rates = data.rates;
                this.currencies = data.currencies_info;
                this.updateLastUpdated(data.last_updated);
                this.populateCurrencySelects();
                this.populateRatesTable();
                this.initializeChart();
            } else {
                throw new Error(data.error || 'Failed to load exchange rates');
            }
        } catch (error) {
            console.error('Error loading rates:', error);
            this.showError('Failed to load exchange rates. Please refresh the page.');
        }
    },

    populateCurrencySelects() {
        const selects = ['from_currency', 'to_currency'];
        const groups = {
            'Caribbean': [],
            'South America': [],
            'North America': [],
            'World': []
        };

        // Group currencies by region
        Object.entries(this.currencies).forEach(([code, info]) => {
            const option = new Option(
                `${info.flag} ${code} - ${info.name}`,
                code
            );
            groups[info.region] = groups[info.region] || [];
            groups[info.region].push(option);
        });

        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            // Clear existing options
            select.innerHTML = '';

            // Add grouped options
            Object.entries(groups).forEach(([region, options]) => {
                const group = document.createElement('optgroup');
                group.label = region;
                options.forEach(option => group.appendChild(option.cloneNode(true)));
                select.appendChild(group);
            });

            // Set default values
            if (id === 'from_currency') select.value = 'USD';
            if (id === 'to_currency') select.value = 'GYD';
        });
    },

    populateRatesTable(filter = 'all') {
        const tbody = document.getElementById('rates-table-body');
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        // Filter and sort currencies
        const filteredCurrencies = Object.entries(this.currencies)
            .filter(([_, info]) => filter === 'all' || info.region === filter)
            .sort((a, b) => a[0].localeCompare(b[0]));

        // Create table rows
        filteredCurrencies.forEach(([code, info]) => {
            const rate = this.rates[code];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <span class="mr-2">${info.flag}</span>
                        <span>${info.name}</span>
                    </div>
                </td>
                <td>${code}</td>
                <td><span class="badge badge-pill badge-${this.getRegionBadgeClass(info.region)}">${info.region}</span></td>
                <td>${this.formatRate(rate)} ${code}</td>
                <td>
                    <button class="btn btn-sm btn-primary convert-btn" 
                            data-from="USD" 
                            data-to="${code}">
                        Convert
                    </button>
                </td>
            `;

            // Add click handler for convert button
            const convertBtn = row.querySelector('.convert-btn');
            convertBtn.addEventListener('click', () => {
                this.quickConvert('USD', code);
            });

            tbody.appendChild(row);
        });
    },

    getRegionBadgeClass(region) {
        const classes = {
            'Caribbean': 'primary',
            'South America': 'success',
            'North America': 'info',
            'World': 'warning'
        };
        return classes[region] || 'secondary';
    },

    filterByRegion(region) {
        this.currentFilter = region;
        this.populateRatesTable(region);
    },

    quickConvert(fromCurrency, toCurrency) {
        // Set the currencies in the form
        document.getElementById('from_currency').value = fromCurrency;
        document.getElementById('to_currency').value = toCurrency;
        
        // If amount is empty, set it to 1
        const amountInput = document.getElementById('amount');
        if (!amountInput.value) {
            amountInput.value = '1';
        }

        // Perform conversion
        this.performConversion();

        // Scroll to results
        this.form.scrollIntoView({ behavior: 'smooth' });
    },

    initializeChart() {
        const ctx = document.getElementById('rateChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.rateChart) {
            this.rateChart.destroy();
        }

        this.rateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Exchange Rate',
                    data: [],
                    borderColor: '#5e72e4',
                    backgroundColor: 'rgba(94, 114, 228, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#5e72e4',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: false
                        }
                    }],
                    xAxes: [{
                        grid: {
                            display: false
                        }
                    }]
                },
                tooltips: {
                    callbacks: {
                        label: (tooltipItem) => {
                            return `Rate: ${this.formatRate(tooltipItem.value)}`;
                        }
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
            if (data.result.historical_rates) {
                this.updateChart(data.result.historical_rates);
            }

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

        const fromInfo = this.currencies[result.from_currency];
        const toInfo = this.currencies[result.to_currency];

        document.getElementById('from-amount').textContent = this.formatCurrency(result.amount, result.from_currency);
        document.getElementById('from-currency-code').textContent = `${fromInfo.flag} ${result.from_currency}`;
        
        document.getElementById('to-amount').textContent = this.formatCurrency(result.converted_amount, result.to_currency);
        document.getElementById('to-currency-code').textContent = `${toInfo.flag} ${result.to_currency}`;
        
        document.getElementById('exchange-rate').textContent = 
            `1 ${result.from_currency} = ${this.formatRate(result.rate)} ${result.to_currency}`;

        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth' });
    },

    updateChart(historicalRates) {
        if (!this.rateChart || !historicalRates) return;

        const data = historicalRates.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        this.rateChart.data.labels = data.map(rate => 
            new Date(rate.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            })
        );
        this.rateChart.data.datasets[0].data = data.map(rate => rate.rate);
        this.rateChart.update();
    },

    updateLastUpdated(timestamp) {
        const element = document.getElementById('last-update');
        if (element && timestamp) {
            element.textContent = new Date(timestamp).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
        }
    },

    formatCurrency(amount, currency) {
        const currencyInfo = this.currencies[currency];
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            currencyDisplay: 'symbol'
        }).format(amount);
    },

    formatRate(rate) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(rate);
    },

    switchCurrencies() {
        const fromSelect = document.getElementById('from_currency');
        const toSelect = document.getElementById('to_currency');
        if (!fromSelect || !toSelect) return;

        [fromSelect.value, toSelect.value] = [toSelect.value, fromSelect.value];
        
        if (this.form.checkValidity()) {
            this.performConversion();
        }
    },

    showError(message) {
        const alertHtml = `
            <div class="alert alert-danger alert-dismissible fade show mb-0" role="alert">
                <div class="d-flex">
                    <div class="alert-icon">
                        <i class="ni ni-notification-70"></i>
                    </div>
                    <div class="alert-text ml-2">${message}</div>
                </div>
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

// Initialize when DOM is loaded and Chart.js is available
document.addEventListener('DOMContentLoaded', () => {
    // Check if Chart.js is loaded
    const chartInterval = setInterval(() => {
        if (typeof Chart !== 'undefined') {
            clearInterval(chartInterval);
            CurrencyConverter.init();
        }
    }, 100);

    // Timeout after 5 seconds if Chart.js doesn't load
    setTimeout(() => {
        clearInterval(chartInterval);
        if (typeof Chart === 'undefined') {
            console.error('Chart.js failed to load');
        }
    }, 5000);
});
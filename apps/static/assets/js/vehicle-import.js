const VehicleImport = {
    init() {
        this.form = document.getElementById('vehicle-import-form');
        this.results = document.getElementById('results');
        this.currentCurrency = 'GYD';
        this.exchangeRate = 208.50;
        this.lastCalculation = null;

        // Cache DOM elements
        this.elements = {
            // Vehicle Details
            type: document.querySelector('[data-detail="type"]'),
            age: document.querySelector('[data-detail="age"]'),
            engine: document.querySelector('[data-detail="engine"]'),

            // Cost Elements
            baseCost: document.querySelector('[data-cost="base"]'),
            customsDuty: document.querySelector('[data-cost="customs"]'),
            environmentalTax: document.querySelector('[data-cost="environmental"]'),
            exciseTax: document.querySelector('[data-cost="excise"]'),
            vat: document.querySelector('[data-cost="vat"]'),
            totalCost: document.querySelector('[data-cost="total"]')
        };

        this.bindEvents();
    },

    bindEvents() {
        if (!this.form) {
            console.error('Vehicle import form not found');
            return;
        }

        // Form submission
        this.form.addEventListener('submit', (e) => this.calculateImport(e));

        // Currency switch buttons
        const gydBtn = document.querySelector('[data-currency="GYD"]');
        const usdBtn = document.querySelector('[data-currency="USD"]');
        
        if (gydBtn) gydBtn.addEventListener('click', () => this.switchCurrency('GYD'));
        if (usdBtn) usdBtn.addEventListener('click', () => this.switchCurrency('USD'));

        // Export button
        const exportBtn = document.querySelector('.btn-export');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportResults());
    },

    async calculateImport(e) {
        e.preventDefault();
        const submitBtn = this.form.querySelector('button[type="submit"]');
        
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            }

            const formData = new FormData(this.form);
            const response = await fetch('/calculate-import', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received data:', data); // Debug log

            if (!data.success) {
                throw new Error(data.error || 'Calculation failed');
            }

            this.lastCalculation = {
                formData: Object.fromEntries(formData),
                calculations: data.calculations
            };

            this.displayResults();

        } catch (error) {
            console.error('Calculation error:', error);
            this.showError(error.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Calculate Import Taxes';
            }
        }
    },

    displayResults() {
        if (!this.lastCalculation) return;

        const { formData, calculations } = this.lastCalculation;

        // Update vehicle details
        if (this.elements.type) {
            this.elements.type.textContent = this.formatVehicleType(formData.vehicle_type);
        }
        if (this.elements.age) {
            this.elements.age.textContent = formData.vehicle_age === 'new' ? 'Under 4 Years' : '4 Years & Older';
        }
        if (this.elements.engine) {
            this.elements.engine.textContent = formData.engine_cc;
        }

        // Store and display monetary values
        this.updateMonetaryValue('base', calculations.cif_gyd);
        this.updateMonetaryValue('customs', calculations.custom_duty);
        this.updateMonetaryValue('environmental', calculations.environmental_tax);
        this.updateMonetaryValue('excise', calculations.excise_tax);
        this.updateMonetaryValue('vat', calculations.vat);
        this.updateMonetaryValue('total', calculations.total_cost);

        // Show results
        if (this.results) {
            this.results.style.display = 'block';
            this.results.scrollIntoView({ behavior: 'smooth' });
        }
    },

    updateMonetaryValue(type, value) {
        const element = document.querySelector(`[data-cost="${type}"]`);
        if (!element) return;

        // Store the original GYD value
        element.dataset.value = value;

        // Display formatted value
        const displayValue = this.currentCurrency === 'USD' ? value / this.exchangeRate : value;
        element.textContent = this.formatCurrency(displayValue);
    },

    formatCurrency(amount) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: this.currentCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    switchCurrency(currency) {
        this.currentCurrency = currency;
        
        // Update button states
        document.querySelectorAll('[data-currency]').forEach(button => {
            button.classList.toggle('active', button.dataset.currency === currency);
        });

        // Refresh all monetary values
        document.querySelectorAll('[data-cost]').forEach(element => {
            const originalValue = parseFloat(element.dataset.value || '0');
            const displayValue = currency === 'USD' ? originalValue / this.exchangeRate : originalValue;
            element.textContent = this.formatCurrency(displayValue);
        });
    },

    formatVehicleType(type) {
        const types = {
            'car': 'Car',
            'suv': 'SUV',
            'van': 'Van',
            'motorcycle': 'Motorcycle',
            'single_cab': 'Single Cab Pickup',
            'double_cab': 'Double Cab Pickup'
        };
        return types[type] || type || 'N/A';
    },

    exportResults() {
        if (!this.lastCalculation) return;
        
        const { formData, calculations } = this.lastCalculation;
        const date = new Date().toLocaleDateString();
        
        // Create CSV content
        let csv = 'Vehicle Import Tax Calculation\n';
        csv += `Date: ${date}\n\n`;
        
        // Vehicle Details
        csv += 'Vehicle Details\n';
        csv += `Type,${this.formatVehicleType(formData.vehicle_type)}\n`;
        csv += `Age,${formData.vehicle_age === 'new' ? 'Under 4 Years' : '4 Years & Older'}\n`;
        csv += `Engine Size,${formData.engine_cc}\n`;
        csv += `Propulsion,${formData.propulsion}\n`;
        csv += `Plate Type,${formData.plate_type === 'P' ? 'Private' : 'Hire'}\n\n`;
        
        // Cost Breakdown in GYD
        csv += 'Cost Breakdown (GYD)\n';
        csv += `Car Cost (CIF),${calculations.cif_gyd.toFixed(2)}\n`;
        csv += `Import Duty,${calculations.custom_duty.toFixed(2)}\n`;
        csv += `Environmental Tax,${calculations.environmental_tax.toFixed(2)}\n`;
        csv += `Excise Tax,${calculations.excise_tax.toFixed(2)}\n`;
        csv += `VAT,${calculations.vat.toFixed(2)}\n`;
        csv += `Total Cost,${calculations.total_cost.toFixed(2)}\n\n`;
        
        // Cost Breakdown in USD
        csv += 'Cost Breakdown (USD)\n';
        csv += `Car Cost (CIF),${(calculations.cif_gyd / this.exchangeRate).toFixed(2)}\n`;
        csv += `Import Duty,${(calculations.custom_duty / this.exchangeRate).toFixed(2)}\n`;
        csv += `Environmental Tax,${(calculations.environmental_tax / this.exchangeRate).toFixed(2)}\n`;
        csv += `Excise Tax,${(calculations.excise_tax / this.exchangeRate).toFixed(2)}\n`;
        csv += `VAT,${(calculations.vat / this.exchangeRate).toFixed(2)}\n`;
        csv += `Total Cost,${(calculations.total_cost / this.exchangeRate).toFixed(2)}\n`;

        // Create and trigger download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vehicle-import-calculation-${date.replace(/\//g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    showError(message) {
        if (!this.results) return;
        
        this.results.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <span class="alert-icon"><i class="fas fa-exclamation-triangle"></i></span>
                <span class="alert-text">${message}</span>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        
        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth' });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => VehicleImport.init());
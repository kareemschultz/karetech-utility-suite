// static/assets/js/vehicle-import.js

const VehicleImport = {
    init() {
        this.form = document.getElementById('vehicle-import-form');
        this.results = document.getElementById('results');
        this.bindEvents();
        this.initializeFields();
    },

    bindEvents() {
        if (this.form) {
            // Form submission
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.calculateImport();
            });

            // Vehicle age changes
            const ageSelect = this.form.querySelector('[name="vehicle_age"]');
            if (ageSelect) {
                ageSelect.addEventListener('change', () => this.updateFieldsBasedOnAge());
            }

            // Propulsion type changes
            const propulsionSelect = this.form.querySelector('[name="propulsion"]');
            if (propulsionSelect) {
                propulsionSelect.addEventListener('change', () => this.handlePropulsionChange());
            }
        }
    },

    initializeFields() {
        // Set default exchange rate
        const exchangeRate = this.form.querySelector('[name="exchange_rate"]');
        if (exchangeRate && !exchangeRate.value) {
            exchangeRate.value = '208.50';
        }
    },

    updateFieldsBasedOnAge() {
        const age = this.form.querySelector('[name="vehicle_age"]').value;
        const engineSelect = this.form.querySelector('[name="engine_cc"]');
        const plateSelect = this.form.querySelector('[name="plate_type"]');

        if (age === 'old') {
            // Update fields for vehicles 4 years and older
            plateSelect.value = 'P';  // Default to private
            plateSelect.disabled = true;
        } else {
            // Reset fields for vehicles under 4 years
            plateSelect.disabled = false;
        }
    },

    handlePropulsionChange() {
        const propulsion = this.form.querySelector('[name="propulsion"]').value;
        const engineSelect = this.form.querySelector('[name="engine_cc"]');
        
        if (propulsion === 'electric') {
            // Disable irrelevant fields for electric vehicles
            engineSelect.value = '';
            engineSelect.disabled = true;
        } else {
            engineSelect.disabled = false;
        }
    },

    async calculateImport() {
        try {
            const submitBtn = this.form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            submitBtn.disabled = true;

            const formData = new FormData(this.form);
            const response = await fetch('/calculate-import', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Calculation failed');
            }

            this.displayResults(data.calculations);

        } catch (error) {
            console.error('Import calculation error:', error);
            this.showError(error.message);
        } finally {
            // Restore button state
            const submitBtn = this.form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="ni ni-calculator mr-2"></i>Calculate Import Taxes';
            submitBtn.disabled = false;
        }
    },

    displayResults(calculations) {
        if (!this.results) return;

        // Format numbers for display
        const formatted = {};
        Object.keys(calculations).forEach(key => {
            formatted[key] = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'GYD',
                minimumFractionDigits: 2
            }).format(calculations[key]);
        });

        // Update all result fields
        Object.keys(formatted).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = formatted[key];
            }
        });

        // Show results section
        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth' });
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
    VehicleImport.init();
});
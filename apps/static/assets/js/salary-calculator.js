// Path: apps/static/js/salary-calculator.js

const SalaryCalculator = {
    init() {
        console.log('Initializing SalaryCalculator...');
        this.form = document.getElementById('salary-form');
        this.results = document.getElementById('results');
        this.taxableInput = document.getElementById('num_taxable');
        this.nonTaxableInput = document.getElementById('num_non_taxable');
        
        if (!this.form) console.error('Form not found!');
        if (!this.taxableInput) console.error('Taxable input not found!');
        if (!this.nonTaxableInput) console.error('Non-taxable input not found!');
        
        this.initializeEventListeners();
        this.updateTaxThreshold();
        
        console.log('Initialization complete');
    },

    initializeEventListeners() {
        console.log('Setting up event listeners...');
        
        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Form submitted');
                this.calculateSalary();
            });
        }

        // Taxable allowances
        if (this.taxableInput) {
            ['change', 'input'].forEach(event => {
                this.taxableInput.addEventListener(event, () => {
                    console.log('Taxable allowances changed:', this.taxableInput.value);
                    this.generateAllowanceFields('taxable');
                });
            });
        }

        // Non-taxable allowances
        if (this.nonTaxableInput) {
            ['change', 'input'].forEach(event => {
                this.nonTaxableInput.addEventListener(event, () => {
                    console.log('Non-taxable allowances changed:', this.nonTaxableInput.value);
                    this.generateAllowanceFields('non_taxable');
                });
            });
        }

        // Insurance type handling
        const insuranceRadios = document.querySelectorAll('input[name="insurance_type"]');
        insuranceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                console.log('Insurance type changed:', radio.value);
                this.toggleInsuranceInput(radio.value === "5");
            });
        });

        // Children number handling
        const childrenInput = document.querySelector('input[name="num_children"]');
        if (childrenInput) {
            childrenInput.addEventListener('change', () => {
                console.log('Number of children changed:', childrenInput.value);
                this.updateTaxThreshold();
            });
        }
        
        console.log('Event listeners setup complete');
    },

    generateAllowanceFields(type) {
        console.log(`Generating ${type} allowance fields...`);
        
        const containerId = `${type}_allowances_container`;
        const container = document.getElementById(containerId);
        const input = type === 'taxable' ? this.taxableInput : this.nonTaxableInput;
        
        if (!container || !input) {
            console.error(`Missing container or input for ${type} allowances`);
            console.error('Container:', container);
            console.error('Input:', input);
            return;
        }
        
        const count = parseInt(input.value) || 0;
        console.log(`Creating ${count} ${type} allowance fields`);
        
        // Clear existing fields
        container.innerHTML = '';
        
        // Generate new fields
        for (let i = 0; i < count; i++) {
            const fieldHtml = `
                <div class="form-group mt-3">
                    <label class="form-control-label">${type === 'taxable' ? 'Taxable' : 'Non-Taxable'} Allowance ${i + 1}</label>
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text">$</span>
                        </div>
                        <input type="number" 
                               class="form-control" 
                               name="${type}_allowance_${i}"
                               placeholder="Enter amount"
                               required 
                               min="0"
                               value="0">
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', fieldHtml);
            console.log(`Added field ${i + 1} for ${type} allowance`);
        }
    },

    toggleInsuranceInput(show) {
        console.log('Toggling insurance input:', show);
        const container = document.getElementById('custom_insurance_container');
        if (container) {
            container.style.display = show ? 'block' : 'none';
            const input = container.querySelector('input[name="insurance_premium"]');
            if (input) {
                input.value = show ? input.value || '' : '0';
                input.required = show;
            }
        } else {
            console.error('Insurance container not found');
        }
    },

    updateTaxThreshold() {
        console.log('Updating tax threshold...');
        const numChildren = parseInt(document.querySelector('input[name="num_children"]')?.value) || 0;
        const baseThreshold = 100000;
        const childDeduction = 10000;
        const totalThreshold = baseThreshold + (numChildren * childDeduction);
        
        console.log('Children:', numChildren);
        console.log('Total threshold:', totalThreshold);
        
        const thresholdElement = document.getElementById('current_threshold');
        if (thresholdElement) {
            thresholdElement.textContent = totalThreshold.toLocaleString();
        } else {
            console.error('Threshold element not found');
        }
    },

    async calculateSalary() {
        console.log('Calculating salary...');
        try {
            const submitBtn = this.form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            submitBtn.disabled = true;

            // Log form data for debugging
            const formData = new FormData(this.form);
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            const response = await fetch('/calculate-salary', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('Calculation response:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Calculation failed');
            }

            this.displayResults(data.data);
            this.showResults();

        } catch (error) {
            console.error('Calculation error:', error);
            this.showError('An error occurred while calculating: ' + error.message);
        } finally {
            const submitBtn = this.form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="ni ni-chart-bar-32 mr-2"></i>Calculate Salary';
            submitBtn.disabled = false;
        }
    },

    displayResults(data) {
        console.log('Displaying results:', data);
        if (!this.results) {
            console.error('Results container not found');
            return;
        }

        const fields = [
            'gross_pay',
            'net_pay',
            'total_deductions',
            'nis_contribution',
            'paye_tax',
            'insurance_deduction',
            'chargeable_income',
            'personal_allowance',
            'monthly_gratuity',
            'semi_annual_gratuity',
            'annual_gratuity'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && data[field] !== undefined) {
                element.textContent = Number(data[field]).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                console.log(`Updated ${field}:`, data[field]);
            } else {
                console.error(`Field not found or no data: ${field}`);
            }
        });
    },

    showResults() {
        if (this.results) {
            this.results.style.display = 'block';
            this.results.scrollIntoView({ behavior: 'smooth' });
            console.log('Results displayed and scrolled into view');
        } else {
            console.error('Results container not found');
        }
    },

    showError(message) {
        console.error('Showing error:', message);
        const existingAlerts = this.form.querySelectorAll('.alert-danger');
        existingAlerts.forEach(alert => alert.remove());

        const alertHtml = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <span class="alert-icon"><i class="ni ni-notification-70"></i></span>
                <span class="alert-text">${message}</span>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        
        const container = this.form.closest('.card-body');
        if (container) {
            container.insertAdjacentHTML('afterbegin', alertHtml);
        } else {
            console.error('Form container not found');
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing calculator...');
    SalaryCalculator.init();
});
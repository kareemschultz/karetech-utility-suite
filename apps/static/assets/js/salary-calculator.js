const SalaryCalculator = {
    currentSalary: null,
    form: null,
    results: null,
    taxableInput: null,
    nonTaxableInput: null,

    init() {
        console.log('Initializing SalaryCalculator...');
        this.initializeElements();
        this.initializeEventListeners();
        this.updateTaxThreshold();
        console.log('Initialization complete');
    },

    initializeElements() {
        this.form = document.getElementById('salary-form');
        this.results = document.getElementById('results');
        this.taxableInput = document.getElementById('num_taxable');
        this.nonTaxableInput = document.getElementById('num_non_taxable');
        this.increaseForm = document.getElementById('increase-form');
        this.increaseCalculator = document.getElementById('increase_calculator');
        this.increaseResults = document.getElementById('increase_results');

        // Validate essential elements
        const requiredElements = {
            'Form': this.form,
            'Results container': this.results,
            'Taxable input': this.taxableInput,
            'Non-taxable input': this.nonTaxableInput,
            'Increase form': this.increaseForm,
            'Increase calculator': this.increaseCalculator,
            'Increase results': this.increaseResults
        };

        for (const [name, element] of Object.entries(requiredElements)) {
            if (!element) {
                console.error(`${name} not found in DOM`);
                this.showError(`Critical initialization error: ${name} not found. Please refresh the page or contact support.`);
            }
        }
    },

    initializeEventListeners() {
        console.log('Setting up event listeners...');

        try {
            // Main salary form
            if (this.form) {
                this.form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.calculateSalary();
                });
            }

            // Allowance inputs
            this.setupAllowanceListeners();

            // Insurance type radios
            this.setupInsuranceListeners();

            // Children input for tax threshold
            this.setupChildrenListener();

            // Increase calculator
            this.setupIncreaseCalculatorListeners();

            console.log('Event listeners setup complete');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            this.showError('Failed to initialize calculator functionality. Please refresh the page.');
        }
    },

    setupAllowanceListeners() {
        const setupAllowanceInput = (input, type) => {
            if (input) {
                ['change', 'input'].forEach(event => {
                    input.addEventListener(event, () => {
                        console.log(`${type} allowances changed:`, input.value);
                        this.generateAllowanceFields(type);
                    });
                });
            }
        };

        setupAllowanceInput(this.taxableInput, 'taxable');
        setupAllowanceInput(this.nonTaxableInput, 'non_taxable');
    },

    setupInsuranceListeners() {
        const insuranceRadios = document.querySelectorAll('input[name="insurance_type"]');
        insuranceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                console.log('Insurance type changed:', radio.value);
                this.toggleInsuranceInput(radio.value === "5");
            });
        });
    },

    setupChildrenListener() {
        const childrenInput = document.querySelector('input[name="num_children"]');
        if (childrenInput) {
            childrenInput.addEventListener('change', () => {
                console.log('Number of children changed:', childrenInput.value);
                this.updateTaxThreshold();
            });
        }
    },

    setupIncreaseCalculatorListeners() {
        // Increase form submission
        if (this.increaseForm) {
            this.increaseForm.addEventListener('submit', (e) => this.calculateSalaryIncrease(e));
        }

        // Toggle button
        const toggleButton = document.querySelector('#toggle-increase-calculator');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => this.toggleIncreaseCalculator());
        }
    },

    generateAllowanceFields(type) {
        console.log(`Generating ${type} allowance fields...`);

        const containerId = `${type}_allowances_container`;
        const container = document.getElementById(containerId);
        const input = type === 'taxable' ? this.taxableInput : this.nonTaxableInput;

        if (!container || !input) {
            console.error(`Missing container or input for ${type} allowances`);
            return;
        }

        try {
            const count = parseInt(input.value) || 0;
            console.log(`Creating ${count} ${type} allowance fields`);

            container.innerHTML = '';
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
                                   value="0"
                                   step="0.01">
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', fieldHtml);
            }
        } catch (error) {
            console.error(`Error generating allowance fields:`, error);
            this.showError('Failed to generate allowance fields. Please try again.');
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
        }
    },

    updateTaxThreshold() {
        console.log('Updating tax threshold...');
        try {
            const numChildren = parseInt(document.querySelector('input[name="num_children"]')?.value) || 0;
            const baseThreshold = 100000;
            const childDeduction = 10000;
            const totalThreshold = baseThreshold + (numChildren * childDeduction);

            console.log('Children:', numChildren, 'Total threshold:', totalThreshold);

            const thresholdElement = document.getElementById('current_threshold');
            if (thresholdElement) {
                thresholdElement.textContent = totalThreshold.toLocaleString();
            }
        } catch (error) {
            console.error('Error updating tax threshold:', error);
        }
    },

    async calculateSalary() {
        console.log('Calculating salary...');
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            this.startCalculation(submitBtn);
            const formData = new FormData(this.form);
            
            // Log form data for debugging
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            const response = await this.sendCalculationRequest(formData);
            const data = await this.handleCalculationResponse(response);

            this.currentSalary = data.data.gross_pay;
            this.displayResults(data.data);
            this.showResults();

        } catch (error) {
            console.error('Calculation error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.finishCalculation(submitBtn, originalText);
        }
    },

    async sendCalculationRequest(formData) {
        const response = await fetch('/calculate-salary', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        return response;
    },

    async handleCalculationResponse(response) {
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Calculation failed');
        }

        return data;
    },

    startCalculation(button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
        button.disabled = true;
    },

    finishCalculation(button, originalText) {
        button.innerHTML = originalText;
        button.disabled = false;
    },

    displayResults(data) {
        console.log('Displaying results:', data);
        if (!this.results) return;

        const fields = [
            'gross_pay', 'net_pay', 'total_deductions', 'nis_contribution',
            'paye_tax', 'insurance_deduction', 'chargeable_income',
            'personal_allowance', 'monthly_gratuity', 'semi_annual_gratuity',
            'annual_gratuity'
        ];

        fields.forEach(field => {
            this.updateResultField(field, data[field]);
        });
    },

    updateResultField(fieldId, value) {
        const element = document.getElementById(fieldId);
        if (element && value !== undefined) {
            element.textContent = this.formatCurrency(value);
        } else {
            console.warn(`Field not found or no data: ${fieldId}`);
        }
    },

    formatCurrency(value) {
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    showResults() {
        if (this.results) {
            this.results.style.display = 'block';
            this.results.scrollIntoView({ behavior: 'smooth' });
        }
    },

    async calculateSalaryIncrease(event) {
        event.preventDefault();
        console.log('Calculating salary increase...');

        if (!this.currentSalary) {
            this.showError('Please calculate your current salary first');
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            this.startCalculation(submitBtn);
            
            const formData = new FormData();
            formData.append('current_salary', this.currentSalary);
            formData.append('increase_percentage', document.getElementById('increase_percentage').value);
            formData.append('is_increase_taxable', document.querySelector('input[name="increase_taxable"]:checked').value);

            const response = await this.sendIncreaseCalculationRequest(formData);
            const data = await this.handleIncreaseCalculationResponse(response);

            this.displayIncreaseResults(data.data);

        } catch (error) {
            console.error('Salary increase calculation error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.finishCalculation(submitBtn, originalText);
        }
    },

    async sendIncreaseCalculationRequest(formData) {
        const response = await fetch('/calculate-salary-increase', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        return response;
    },

    async handleIncreaseCalculationResponse(response) {
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Increase calculation failed');
        }

        return data;
    },

    displayIncreaseResults(data) {
        console.log('Displaying salary increase results:', data);
        if (!this.increaseResults) return;

        this.increaseResults.style.display = 'block';

        const fields = [
            'new_gross_pay', 'new_net_pay', 'new_nis',
            'new_paye', 'new_deductions', 'new_total_compensation'
        ];

        fields.forEach(field => {
            this.updateResultField(field, data[field]);
        });

        this.increaseResults.scrollIntoView({ behavior: 'smooth' });
    },

    toggleIncreaseCalculator() {
        if (this.increaseCalculator) {
            const isHidden = this.increaseCalculator.style.display === 'none';
            this.increaseCalculator.style.display = isHidden ? 'block' : 'none';
            
            if (!isHidden) {
                // Reset when hiding
                if (this.increaseForm) this.increaseForm.reset();
                if (this.increaseResults) this.increaseResults.style.display = 'none';
            }
        }
    },

    showError(message) {
        console.error('Showing error:', message);
        
        // Remove any existing error alerts
        const existingAlerts = document.querySelectorAll('.alert-danger');
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

        // Insert the alert at the top of the form
        const container = this.form.closest('.card-body');
        if (container) {
            container.insertAdjacentHTML('afterbegin', alertHtml);
        }
    },

    getErrorMessage(error) {
        if (error.message.includes('Server returned')) {
            return 'Server error occurred. Please try again later.';
        }
        return error.message || 'An unexpected error occurred. Please try again.';
    }
};

// Initialize the SalaryCalculator when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    SalaryCalculator.init();
});
const SalaryCalculator = {
    // Configuration
    config: {
        tax: {
            threshold: 130000,
            rate: 0.25,
            childAllowance: 10000,
            overtimeExemption: 50000,
            secondJobExemption: 50000
        },
        nis: {
            rate: 0.056,
            cap: 15680
        },
        insurance: {
            rates: {
                none: 0,
                employeeOnly: 1469,
                employeeAndOne: 3182,
                employeeAndFamily: 4970
            },
            maxPercentage: 0.10,
            maxAmount: 50000
        }
    },

    // State
    state: {
        currentSalary: null,
        form: null,
        results: null,
        taxableInput: null,
        nonTaxableInput: null
    },

    init() {
        console.log('Initializing SalaryCalculator...');
        this.initializeElements();
        this.initializeEventListeners();
        this.updateTaxThreshold();
        console.log('Initialization complete');
    },

    initializeElements() {
        this.state.form = document.getElementById('salary-form');
        this.state.results = document.getElementById('results');
        this.state.taxableInput = document.getElementById('num_taxable');
        this.state.nonTaxableInput = document.getElementById('num_non_taxable');

        const requiredElements = {
            'Form': this.state.form,
            'Results container': this.state.results,
            'Taxable input': this.state.taxableInput,
            'Non-taxable input': this.state.nonTaxableInput
        };

        for (const [name, element] of Object.entries(requiredElements)) {
            if (!element) {
                console.error(`${name} not found in DOM`);
                this.showError(`Critical initialization error: ${name} not found. Please refresh the page or contact support.`);
            }
        }
    },

    initializeEventListeners() {
        try {
            // Main form submission
            if (this.state.form) {
                this.state.form.addEventListener('submit', (e) => {
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

            // Overtime and Second Job inputs
            this.setupExemptionListeners();

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
                        this.generateAllowanceFields(type);
                        this.updatePreview();
                    });
                });
            }
        };

        setupAllowanceInput(this.state.taxableInput, 'taxable');
        setupAllowanceInput(this.state.nonTaxableInput, 'non_taxable');
    },

    setupInsuranceListeners() {
        const insuranceRadios = document.querySelectorAll('input[name="insurance_type"]');
        insuranceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleInsuranceInput(radio.value === "5");
                this.updatePreview();
            });
        });
    },

    setupChildrenListener() {
        const childrenInput = document.querySelector('input[name="num_children"]');
        if (childrenInput) {
            childrenInput.addEventListener('change', () => {
                this.updateTaxThreshold();
                this.updatePreview();
            });
        }
    },

    setupExemptionListeners() {
        ['overtime_amount', 'second_job_income'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateExemptionPreviews();
                    this.updatePreview();
                });
            }
        });
    },

    updateExemptionPreviews() {
        const overtimeAmount = parseFloat(document.getElementById('overtime_amount')?.value) || 0;
        const secondJobAmount = parseFloat(document.getElementById('second_job_income')?.value) || 0;

        const overtimeTaxFree = Math.min(overtimeAmount, this.config.tax.overtimeExemption);
        const overtimeTaxable = Math.max(0, overtimeAmount - overtimeTaxFree);
        
        const secondJobTaxFree = Math.min(secondJobAmount, this.config.tax.secondJobExemption);
        const secondJobTaxable = Math.max(0, secondJobAmount - secondJobTaxFree);

        this.updateElementValue('overtime_tax_free', overtimeTaxFree);
        this.updateElementValue('overtime_taxable', overtimeTaxable);
        this.updateElementValue('second_job_tax_free', secondJobTaxFree);
        this.updateElementValue('second_job_taxable', secondJobTaxable);
    },

    generateAllowanceFields(type) {
        const containerId = `${type}_allowances_container`;
        const container = document.getElementById(containerId);
        const input = type === 'taxable' ? this.state.taxableInput : this.state.nonTaxableInput;

        if (!container || !input) return;

        try {
            const count = parseInt(input.value) || 0;
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
                                   onchange="SalaryCalculator.updatePreview()">
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', fieldHtml);
            }
        } catch (error) {
            console.error('Error generating allowance fields:', error);
            this.showError('Failed to generate allowance fields. Please try again.');
        }
    },

    toggleInsuranceInput(show) {
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
        const numChildren = parseInt(document.querySelector('input[name="num_children"]')?.value) || 0;
        const totalThreshold = this.config.tax.threshold + (numChildren * this.config.tax.childAllowance);
        
        this.updateElementValue('current_threshold', totalThreshold);
        this.updateElementValue('child_allowance_total', numChildren * this.config.tax.childAllowance);
    },

    async calculateSalary() {
        console.log('Calculating salary...');
        const submitBtn = this.state.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            submitBtn.disabled = true;

            const formData = new FormData(this.state.form);
            const response = await fetch('/calculate-salary', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Calculation failed');
            }

            this.state.currentSalary = data.data.gross_pay;
            this.displayResults(data.data);
            this.showResults();

        } catch (error) {
            console.error('Calculation error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    },

    displayResults(data) {
        if (!this.state.results) return;

        const fields = [
            'gross_pay', 'net_pay', 'total_deductions', 'nis_contribution',
            'paye_tax', 'insurance_deduction', 'chargeable_income',
            'personal_allowance', 'monthly_gratuity', 'semi_annual_gratuity',
            'annual_gratuity', 'overtime_tax_free', 'second_job_tax_free'
        ];

        fields.forEach(field => {
            this.updateElementValue(field, data[field]);
        });
    },

    updateElementValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== undefined) {
            element.textContent = this.formatCurrency(value);
        }
    },

    formatCurrency(value) {
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    showResults() {
        if (this.state.results) {
            this.state.results.style.display = 'block';
            this.state.results.scrollIntoView({ behavior: 'smooth' });
        }
    },

    showError(message) {
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

        const container = this.state.form.closest('.card-body');
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

// Initialize the calculator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    SalaryCalculator.init();
});
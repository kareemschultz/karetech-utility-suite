const SalaryIncreaseCalculator = {
    init() {
        console.log('Initializing SalaryIncreaseCalculator...');
        this.initializeElements();
        this.initializeEventListeners();
        this.setupPresetIncreases();
        console.log('Initialization complete');
    },

    initializeElements() {
        this.elements = {
            form: document.getElementById('increase-form'),
            calculator: document.getElementById('increase_calculator'),
            results: document.getElementById('increase_results'),
            percentageInput: document.getElementById('increase_percentage')
        };
    },

    initializeEventListeners() {
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => this.calculateSalaryIncrease(e));
        }

        const toggleButton = document.querySelector('#toggle-increase-calculator');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => this.toggleIncreaseCalculator());
        }

        // Real-time updates for percentage input
        if (this.elements.percentageInput) {
            this.elements.percentageInput.addEventListener('input', () => this.updatePreview());
        }
    },

    setupPresetIncreases() {
        const presets = [
            { value: '', label: 'Select an increase...' },
            { value: '8', label: '8% - Public Service 2025' },
            { value: '5', label: '5% - Standard' },
            { value: '10', label: '10% - Performance' },
            { value: '15', label: '15% - Promotion' }
        ];

        const presetSelect = document.getElementById('preset_increase');
        if (presetSelect) {
            presets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset.value;
                option.textContent = preset.label;
                presetSelect.appendChild(option);
            });

            presetSelect.addEventListener('change', (e) => {
                if (this.elements.percentageInput) {
                    this.elements.percentageInput.value = e.target.value;
                    this.updatePreview();
                }
            });
        }
    },

    async calculateSalaryIncrease(event) {
        event.preventDefault();

        if (!SalaryCalculator.state.currentSalary) {
            this.showError('Please calculate your current salary first');
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            submitBtn.disabled = true;

            const formData = new FormData();
            formData.append('current_salary', SalaryCalculator.state.currentSalary);
            formData.append('increase_percentage', this.elements.percentageInput.value);
            formData.append('is_increase_taxable', document.querySelector('input[name="increase_taxable"]:checked').value);
            formData.append('num_children', document.querySelector('input[name="num_children"]')?.value || '0');

            const response = await fetch('/calculate-salary-increase', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to calculate salary increase');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Calculation failed');
            }

            this.displayResults(data.data);
            this.showResults();

        } catch (error) {
            console.error('Salary increase calculation error:', error);
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    },

    displayResults(data) {
        // Basic salary information
        this.updateElements([
            'new_gross_pay', 'new_net_pay', 'new_nis',
            'new_paye', 'new_deductions'
        ], data);

        // Gratuity information
        this.updateElements([
            'new_monthly_gratuity', 'new_semi_annual_gratuity',
            'new_annual_gratuity', 'new_vacation_allowance'
        ], data);

        // Net pay periods
        this.updateElements([
            'new_monthly_net', 'new_semi_annual_net', 'new_annual_net'
        ], data);

        // Combined compensations
        this.updateElements([
            'new_net_plus_monthly', 'new_net_plus_semi',
            'new_net_plus_annual', 'new_total_annual_package'
        ], data);

        // Increase details
        this.updateElements([
            'increase_percentage', 'increase_amount',
            'monthly_difference', 'annual_difference'
        ], data);

        // Update color indicators
        this.updateIncreaseIndicators(data);
    },

    updateElements(elements, data) {
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element && data[id] !== undefined) {
                element.textContent = this.formatCurrency(data[id]);
            }
        });
    },

    updateIncreaseIndicators(data) {
        const indicators = document.querySelectorAll('.increase-indicator');
        indicators.forEach(indicator => {
            const value = parseFloat(indicator.textContent.replace(/[^0-9.-]+/g, ''));
            indicator.classList.toggle('text-success', value > 0);
            indicator.classList.toggle('text-danger', value < 0);
        });
    },

    updatePreview() {
        if (!SalaryCalculator.state.currentSalary || !this.elements.percentageInput) return;

        const percentage = parseFloat(this.elements.percentageInput.value) || 0;
        const increase = SalaryCalculator.state.currentSalary * (percentage / 100);

        // Update preview elements if they exist
        this.updatePreviewElement('increase_preview', increase);
        this.updatePreviewElement('percentage_preview', percentage);
    },

    updatePreviewElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = this.formatCurrency(value);
        }
    },

    showResults() {
        if (this.elements.results) {
            this.elements.results.style.display = 'block';
            this.elements.results.scrollIntoView({ behavior: 'smooth' });
        }
    },

    toggleIncreaseCalculator() {
        if (this.elements.calculator) {
            const isHidden = this.elements.calculator.style.display === 'none';
            this.elements.calculator.style.display = isHidden ? 'block' : 'none';
            
            if (!isHidden) {
                if (this.elements.form) this.elements.form.reset();
                if (this.elements.results) this.elements.results.style.display = 'none';
            }
        }
    },

    formatCurrency(value) {
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
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

        const container = this.elements.form?.closest('.card-body');
        if (container) {
            container.insertAdjacentHTML('afterbegin', alertHtml);
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    SalaryIncreaseCalculator.init();
});
const SalaryIncreaseCalculator = {
    currentSalary: 0,

    init() {
        console.log('Initializing SalaryIncreaseCalculator...');
        
        const increaseForm = document.getElementById('increase-form');
        if (increaseForm) {
            increaseForm.addEventListener('submit', this.calculateSalaryIncrease.bind(this));
        }

        const increaseButton = document.querySelector('#toggle-increase-calculator');
        if (increaseButton) {
            increaseButton.addEventListener('click', this.toggleIncreaseCalculator.bind(this));
        }

        console.log('Initialization complete');
    },

    toggleIncreaseCalculator() {
        const increaseCalculator = document.getElementById('increase_calculator');
        increaseCalculator.style.display = increaseCalculator.style.display === 'none' ? 'block' : 'none';
    },

    async calculateSalaryIncrease(event) {
        event.preventDefault();
    
        const increasePercentage = document.getElementById('increase_percentage').value;
        const isTaxable = document.querySelector('input[name="increase_taxable"]:checked').value === 'yes';
    
        try {
            const response = await fetch('/calculate-salary-increase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_salary: this.currentSalary, increase_percentage: increasePercentage, is_increase_taxable: isTaxable })
            });
    
            if (!response.ok) throw new Error('Failed to calculate salary increase');

            const data = await response.json();
            console.log('Salary increase response:', data);

            if (!data.success) throw new Error(data.error || 'Salary increase calculation failed');

            this.displayIncreaseResults(data.data);
        } catch (error) {
            console.error('Error calculating salary increase:', error);
            this.showError('An error occurred while calculating salary increase: ' + error.message);
        }
    },

    displayIncreaseResults(data) {
        console.log('Displaying salary increase results:', data);
        const increaseResult = document.getElementById('increase_result');
        if (!increaseResult) {
            console.error('Increase result container not found');
            return;
        }

        const increaseFields = [
            'new_gross_pay', 'new_net_pay', 'new_total_deductions'
        ];

        increaseFields.forEach(field => {
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

        increaseResult.style.display = 'block';
        console.log('Increase results displayed');
    },

    showError(message) {
        console.error('Showing error:', message);
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

        const container = document.getElementById('increase-form').closest('.card-body');
        if (container) {
            container.insertAdjacentHTML('afterbegin', alertHtml);
        } else {
            console.error('Form container not found');
        }
    }
};

// Initialize the SalaryIncreaseCalculator when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    SalaryIncreaseCalculator.init();
});

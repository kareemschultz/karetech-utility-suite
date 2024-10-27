// QR Code Generator
const QRGenerator = {
    init() {
        console.log('Initializing QR Generator...');
        this.form = document.getElementById('qr-form');
        this.input = document.getElementById('qr-input');
        this.size = document.getElementById('qr-size');
        this.result = document.getElementById('qr-result');
        this.qrImage = document.getElementById('qr-image');
        this.downloadBtn = document.getElementById('download-qr');

        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateQR();
            });
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadQR());
        }
    },

    async generateQR() {
        console.log('Generating QR code...');
        const text = this.input.value.trim();
        const size = this.size.value;

        if (!text) {
            this.showError('Please enter text or URL');
            return;
        }

        try {
            // Show loading state
            const submitBtn = this.form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            submitBtn.disabled = true;

            const formData = new FormData();
            formData.append('text', text);
            formData.append('size', size);

            console.log('Sending request with:', { text, size });

            const response = await fetch('/generate-qr', {
                method: 'POST',
                body: formData
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate QR code');
            }

            if (!data.success) {
                throw new Error(data.error || 'QR generation failed');
            }

            // Display QR code
            this.qrImage.src = `data:image/png;base64,${data.qr_code}`;
            this.result.style.display = 'block';
            this.result.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('QR Generation error:', error);
            this.showError(error.message || 'Failed to generate QR code');
        } finally {
            // Reset button state
            const submitBtn = this.form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="ni ni-camera-compact mr-2"></i>Generate QR Code';
            submitBtn.disabled = false;
        }
    },

    downloadQR() {
        if (!this.qrImage.src) {
            this.showError('No QR code to download');
            return;
        }

        try {
            const link = document.createElement('a');
            link.download = 'qr-code.png';
            link.href = this.qrImage.src;
            link.click();
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Failed to download QR code');
        }
    },

    showError(message) {
        console.error('QR Generator Error:', message);
        
        // Remove any existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            <span class="alert-icon"><i class="ni ni-notification-70"></i></span>
            <span class="alert-text">${message}</span>
            <button type="button" class="close" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
            </button>
        `;

        // Insert alert before form
        this.form.parentNode.insertBefore(alert, this.form);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
};
// Hash Calculator
const HashCalculator = {
    init() {
        this.form = document.getElementById('hash-form');
        this.input = document.getElementById('hash-input');
        this.algorithm = document.getElementById('hash-algorithm');
        this.results = document.getElementById('hash-results');
        this.output = document.getElementById('hash-output');
        this.copyBtn = document.getElementById('copy-hash');

        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateHash();
            });
        }

        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => this.copyHash());
        }
    },

    async generateHash() {
        const text = this.input.value.trim();
        const algorithm = this.algorithm.value;

        if (!text) {
            this.showError('Please enter text to hash');
            return;
        }

        try {
            const response = await fetch('/generate-hash', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    text: text,
                    algorithm: algorithm
                })
            });

            if (!response.ok) throw new Error('Failed to generate hash');

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            // Display hash
            this.output.value = data.hash;
            this.results.style.display = 'block';

        } catch (error) {
            this.showError(error.message);
        }
    },

    async copyHash() {
        try {
            await navigator.clipboard.writeText(this.output.value);
            this.showSuccess('Hash copied to clipboard!');
        } catch (error) {
            this.showError('Failed to copy hash');
        }
    },

    showError(message) {
        this.showAlert(message, 'danger');
    },

    showSuccess(message) {
        this.showAlert(message, 'success');
    },

    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            <span class="alert-icon"><i class="ni ni-${type === 'danger' ? 'notification-70' : 'check-bold'}"></i></span>
            <span class="alert-text">${message}</span>
            <button type="button" class="close" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
            </button>
        `;

        this.form.parentNode.insertBefore(alert, this.form);
        setTimeout(() => alert.remove(), 3000);
    }
};

// JSON Formatter
const JSONFormatter = {
    init() {
        this.input = document.getElementById('json-input');
        this.output = document.getElementById('json-output');
        this.formatBtn = document.getElementById('format-json');
        this.minifyBtn = document.getElementById('minify-json');
        this.clearBtn = document.getElementById('clear-json');
        this.copyInputBtn = document.getElementById('copy-input');
        this.copyOutputBtn = document.getElementById('copy-output');
        this.autoFormat = document.getElementById('auto-format');
        this.errorDiv = document.getElementById('json-error');
        this.errorMessage = document.getElementById('error-message');

        this.setupEventListeners();
    },

    setupEventListeners() {
        if (this.formatBtn) {
            this.formatBtn.addEventListener('click', () => this.formatJSON());
        }

        if (this.minifyBtn) {
            this.minifyBtn.addEventListener('click', () => this.minifyJSON());
        }

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearAll());
        }

        if (this.copyInputBtn) {
            this.copyInputBtn.addEventListener('click', () => this.copyText(this.input));
        }

        if (this.copyOutputBtn) {
            this.copyOutputBtn.addEventListener('click', () => this.copyText(this.output));
        }

        if (this.input) {
            this.input.addEventListener('input', () => {
                if (this.autoFormat && this.autoFormat.checked) {
                    this.formatJSON();
                }
            });
        }
    },

    formatJSON() {
        try {
            const json = JSON.parse(this.input.value);
            this.output.value = JSON.stringify(json, null, 2);
            this.hideError();
        } catch (error) {
            this.showError(error.message);
        }
    },

    minifyJSON() {
        try {
            const json = JSON.parse(this.input.value);
            this.output.value = JSON.stringify(json);
            this.hideError();
        } catch (error) {
            this.showError(error.message);
        }
    },

    clearAll() {
        this.input.value = '';
        this.output.value = '';
        this.hideError();
    },

    async copyText(element) {
        try {
            await navigator.clipboard.writeText(element.value);
            this.showSuccess('Copied to clipboard!');
        } catch (error) {
            this.showError('Failed to copy text');
        }
    },

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorDiv.style.display = 'block';
    },

    hideError() {
        this.errorDiv.style.display = 'none';
    },

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            <span class="alert-icon"><i class="ni ni-check-bold"></i></span>
            <span class="alert-text">${message}</span>
            <button type="button" class="close" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
            </button>
        `;

        const container = this.input.closest('.card-body');
        container.insertBefore(alert, container.firstChild);
        setTimeout(() => alert.remove(), 3000);
    }
};

// Initialize all utilities when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    QRGenerator.init();
    HashCalculator.init();
    JSONFormatter.init();
});
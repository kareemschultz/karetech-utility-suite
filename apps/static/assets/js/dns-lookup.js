// static/assets/js/dns-lookup.js

const DNSLookup = {
    init() {
        this.form = document.getElementById('dns-lookup-form');
        this.results = document.getElementById('dns-results');
        this.bindEvents();
        console.log('DNS Lookup Tool initialized');
    },

    bindEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performLookup();
            });
            console.log('Form event listener bound');
        } else {
            console.error('DNS lookup form not found');
        }
    },

    async performLookup() {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Looking up...';
            submitBtn.disabled = true;

            const formData = new FormData(this.form);
            const domain = formData.get('domain');

            // Domain validation
            if (!this.validateDomain(domain)) {
                throw new Error('Please enter a valid domain name');
            }

            const response = await fetch('/lookup-dns', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Lookup failed');
            }

            this.displayResults(data.results, domain);

        } catch (error) {
            console.error('Lookup error:', error);
            this.showError(error.message);
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    },

    validateDomain(domain) {
        const pattern = /^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.)+[a-zA-Z]{2,}$/;
        return pattern.test(domain);
    },

    displayResults(results, domain) {
        if (!this.results) return;

        let html = `
            <div class="card">
                <div class="card-header bg-transparent">
                    <h3 class="mb-0">DNS Records for ${this.escapeHtml(domain)}</h3>
                </div>
                <div class="card-body">
                    <div class="row">
        `;

        // Display each record type in a card
        for (const [type, data] of Object.entries(results)) {
            if (type === 'WHOIS') continue;

            html += `
                <div class="col-md-6 mb-4">
                    <div class="card shadow-sm result-card">
                        <div class="card-header bg-gradient-primary">
                            <h5 class="mb-0 text-white">
                                <i class="fas fa-database mr-2"></i>${type} Records
                            </h5>
                        </div>
                        <div class="card-body">
            `;

            if (data.records && data.records.length > 0) {
                html += '<div class="table-responsive">';
                html += '<table class="table align-items-center table-flush">';
                html += '<thead class="thead-light"><tr><th>Value</th><th>TTL</th></tr></thead><tbody>';
                
                data.records.forEach(record => {
                    html += `
                        <tr>
                            <td><code>${this.escapeHtml(record)}</code></td>
                            <td>${data.ttl || 'N/A'}</td>
                        </tr>
                    `;
                });
                
                html += '</tbody></table></div>';
            } else {
                html += `
                    <div class="alert alert-secondary mb-0">
                        <i class="fas fa-info-circle mr-2"></i>
                        No ${type} records found
                    </div>
                `;
            }

            html += '</div></div></div>';
        }

        html += '</div></div></div>';

        this.results.innerHTML = html;
        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth' });
    },

    showError(message) {
        const alertHtml = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <span class="alert-icon"><i class="fas fa-exclamation-circle"></i></span>
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
    },

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Initialize when the document is ready
$(document).ready(function() {
    DNSLookup.init();
});
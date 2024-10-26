// static/assets/js/public-ip.js

const PublicIPTool = {
    init() {
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.ipDetails = document.getElementById('ip-details');
        this.map = null;
        this.fetchIPInfo();
    },

    async fetchIPInfo() {
        try {
            this.showLoading();
            const response = await fetch('/get-ip-info');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.displayIPInfo(data);
            this.initializeMap(data.latitude, data.longitude);
            this.hideLoading();
        } catch (error) {
            this.showError('Failed to fetch IP information: ' + error.message);
        }
    },

    displayIPInfo(data) {
        // Update all information fields
        const fields = {
            'ip-address': data.ip,
            'country': data.country_name,
            'region': data.region,
            'city': data.city,
            'postal': data.postal,
            'timezone': data.timezone,
            'isp': data.org,
            'org': data.org,
            'asn': data.asn,
            'hostname': data.hostname || 'N/A',
            'latitude': data.latitude,
            'longitude': data.longitude
        };

        Object.keys(fields).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = fields[id] || 'N/A';
            }
        });

        // Show the details container
        if (this.ipDetails) {
            this.ipDetails.style.display = 'block';
        }
    },

    initializeMap(lat, lng) {
        if (!lat || !lng) return;
        
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Clear any existing map
        mapContainer.innerHTML = '';
        
        // Initialize the map (using your preferred map library)
        // This is a placeholder - implement with your chosen map library
        console.log('Map would be initialized with:', lat, lng);
    },

    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
        }
        if (this.ipDetails) {
            this.ipDetails.style.display = 'none';
        }
    },

    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    },

    showError(message) {
        this.hideLoading();
        const alertHtml = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <span class="alert-icon"><i class="ni ni-notification-70"></i></span>
                <span class="alert-text">${message}</span>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        
        const container = document.querySelector('.card-body');
        if (container) {
            container.insertAdjacentHTML('afterbegin', alertHtml);
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    PublicIPTool.init();
});

// Function to refresh IP information
function refreshIPInfo() {
    PublicIPTool.fetchIPInfo();
}
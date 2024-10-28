// static/assets/js/dashboard-main.js

const Dashboard = {
    init() {
        this.initSystemInfo();
        this.initClock();
        this.initNetworkStatus();
        this.initSessionTimer();
        this.loadToolsData();
        this.initNotifications();
        this.bindEvents();
    },

    // System Information
    initSystemInfo() {
        const ua = navigator.userAgent;
        const browserInfo = this.getBrowserInfo(ua);
        const osInfo = this.getOSInfo(ua);

        document.getElementById('browser-info').textContent = `${browserInfo.name} ${browserInfo.version}`;
        document.getElementById('os-info').textContent = osInfo;
    },

    getBrowserInfo(ua) {
        const browsers = {
            'Chrome': /Chrome\/(\d+)/,
            'Firefox': /Firefox\/(\d+)/,
            'Safari': /Safari\/(\d+)/,
            'Edge': /Edge\/(\d+)/,
            'Opera': /Opera\/(\d+)/
        };

        for (const [name, regex] of Object.entries(browsers)) {
            const match = ua.match(regex);
            if (match) {
                return { name, version: match[1] };
            }
        }
        return { name: 'Unknown', version: '0' };
    },

    getOSInfo(ua) {
        const os = {
            'Windows': /Windows NT (\d+\.\d+)/,
            'Mac': /Mac OS X/,
            'Linux': /Linux/,
            'Android': /Android/,
            'iOS': /iPhone|iPad|iPod/
        };

        for (const [name, regex] of Object.entries(os)) {
            if (regex.test(ua)) return name;
        }
        return 'Unknown OS';
    },

    // Live Clock
    initClock() {
        const updateClock = () => {
            const now = new Date();
            document.getElementById('live-clock').textContent = 
                now.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                });
            document.getElementById('live-date').textContent = 
                now.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
        };

        updateClock();
        setInterval(updateClock, 1000);
    },

    // Network Status
    initNetworkStatus() {
        const updateNetworkStatus = () => {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const online = navigator.onLine;
            
            document.getElementById('connection-status').textContent = online ? 'Online' : 'Offline';
            document.getElementById('connection-status').className = online ? 'text-success' : 'text-danger';

            if (connection) {
                document.getElementById('connection-type').textContent = 
                    `${connection.effectiveType || 'Unknown'} - ${connection.downlink}Mbps`;
            }

            // Fetch IP information
            if (online) {
                fetch('/get-ip-info')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('ip-address').textContent = data.ip || 'N/A';
                    })
                    .catch(error => console.error('Error fetching IP:', error));
            }
        };

        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        setInterval(updateNetworkStatus, 30000); // Update every 30 seconds
    },

    // Session Timer
    initSessionTimer() {
        const startTime = new Date();
        
        const updateSessionTime = () => {
            const now = new Date();
            const diff = now - startTime;
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            document.getElementById('session-duration').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        setInterval(updateSessionTime, 1000);
    },

    // Tools Data
    loadToolsData() {
        // Calculators
        const calculators = [
            { name: 'Salary Calculator', icon: 'ni ni-money-coins', url: '/salary-calculator' },
            { name: 'Vehicle Import', icon: 'ni ni-delivery-fast', url: '/vehicle-import' },
            { name: 'Currency Converter', icon: 'ni ni-chart-bar-32', url: '/currency-converter' }
        ];

        // Network Tools
        const networkTools = [
            { name: 'Speed Test', icon: 'ni ni-speedometer', url: '/speedtest' },
            { name: 'Public IP', icon: 'ni ni-world', url: '/public-ip' },
            { name: 'DNS Lookup', icon: 'ni ni-world-2', url: '/dns-lookup' }
        ];

        // Utilities
        const utilities = [
            { name: 'QR Generator', icon: 'ni ni-camera-compact', url: '/qr-generator' },
            { name: 'Hash Calculator', icon: 'ni ni-key-25', url: '/hash-calculator' },
            { name: 'JSON Formatter', icon: 'ni ni-align-left-2', url: '/json-formatter' }
        ];

        this.populateToolsList('calculators-list', calculators);
        this.populateToolsList('network-tools-list', networkTools);
        this.populateToolsList('utilities-list', utilities);
        this.populatePopularTools([...calculators, ...networkTools, ...utilities]);
    },

    populateToolsList(containerId, tools) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = tools.map(tool => `
            <a href="${tool.url}" class="list-group-item list-group-item-action">
                <div class="row align-items-center">
                    <div class="col-auto">
                        <i class="${tool.icon} text-primary"></i>
                    </div>
                    <div class="col ml--2">
                        <h4 class="mb-0">${tool.name}</h4>
                    </div>
                    <div class="col-auto">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </a>
        `).join('');
    },

    populatePopularTools(tools) {
        const container = document.getElementById('popular-tools-grid');
        if (!container) return;

        // Show top 6 tools
        const popularTools = tools.slice(0, 6);
        container.innerHTML = popularTools.map(tool => `
            <div class="col-md-4 mb-4">
                <a href="${tool.url}" class="text-decoration-none">
                    <div class="card card-stats mb-4 mb-xl-0">
                        <div class="card-body">
                            <div class="row">
                                <div class="col">
                                    <h5 class="card-title text-uppercase text-muted mb-0">${tool.name}</h5>
                                </div>
                                <div class="col-auto">
                                    <div class="icon icon-shape bg-primary text-white rounded-circle shadow">
                                        <i class="${tool.icon}"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        `).join('');
    },

    // System Notifications
    initNotifications() {
        const notifications = [
            {
                title: 'System Update',
                message: 'All tools are up to date and running smoothly.',
                type: 'success',
                time: '1 min ago'
            },
            {
                title: 'Network Status',
                message: 'Connection is stable and performing optimally.',
                type: 'info',
                time: '5 mins ago'
            }
            // Add more notifications as needed
        ];

        const container = document.getElementById('system-notifications');
        if (!container) return;

        container.innerHTML = notifications.map(notif => `
            <div class="alert alert-${notif.type} alert-dismissible fade show" role="alert">
                <span class="alert-inner--icon"><i class="ni ni-notification-70"></i></span>
                <span class="alert-inner--text">
                    <strong>${notif.title}:</strong> ${notif.message}
                </span>
                <small class="text-muted ml-2">${notif.time}</small>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `).join('');
    },

    // Event Bindings
    bindEvents() {
        // Add any global event listeners here
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.initNetworkStatus();
                this.initNotifications();
            }
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
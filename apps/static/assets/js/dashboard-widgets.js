// static/assets/js/dashboard-widgets.js

const DashboardWidgets = {
    init() {
        this.initQuickActions();
        this.initToolsUsageWidget();
        this.initSystemMonitor();
        this.initNetworkMonitor();
        this.initRecentActivity();
        this.bindWidgetEvents();
    },

    initQuickActions() {
        const quickActionsContainer = document.querySelector('.quick-actions-grid');
        if (!quickActionsContainer) return;

        const quickActions = [
            {
                name: 'Quick Convert',
                icon: 'ni ni-money-coins',
                action: () => this.showQuickConvertModal()
            },
            {
                name: 'Speed Test',
                icon: 'ni ni-speedometer',
                action: () => window.location.href = '/speedtest'
            },
            {
                name: 'Generate QR',
                icon: 'ni ni-camera-compact',
                action: () => window.location.href = '/qr-generator'
            },
            {
                name: 'Check IP',
                icon: 'ni ni-world',
                action: () => this.checkPublicIP()
            }
        ];

        quickActionsContainer.innerHTML = quickActions.map(action => `
            <button class="btn btn-primary btn-lg btn-icon mb-3" onclick="DashboardWidgets.handleQuickAction('${action.name}')">
                <span class="btn-inner--icon"><i class="${action.icon}"></i></span>
                <span class="btn-inner--text">${action.name}</span>
            </button>
        `).join('');
    },

    handleQuickAction(actionName) {
        switch(actionName) {
            case 'Quick Convert':
                this.showQuickConvertModal();
                break;
            case 'Check IP':
                this.checkPublicIP();
                break;
            // Add more cases as needed
        }
    },

    showQuickConvertModal() {
        // Create modal HTML
        const modalHtml = `
            <div class="modal fade" id="quickConvertModal" tabindex="-1" role="dialog">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Quick Currency Convert</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="quickConvertForm">
                                <div class="form-group">
                                    <label>Amount</label>
                                    <input type="number" class="form-control" id="quickAmount" required>
                                </div>
                                <div class="row">
                                    <div class="col">
                                        <div class="form-group">
                                            <label>From</label>
                                            <select class="form-control" id="quickFromCurrency">
                                                <option value="USD">USD</option>
                                                <option value="GYD">GYD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <div class="form-group">
                                            <label>To</label>
                                            <select class="form-control" id="quickToCurrency">
                                                <option value="GYD">GYD</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div id="quickConvertResult" class="alert alert-success" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="DashboardWidgets.performQuickConvert()">Convert</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body if it doesn't exist
        if (!document.getElementById('quickConvertModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Show modal
        $('#quickConvertModal').modal('show');
    },

    async performQuickConvert() {
        const amount = document.getElementById('quickAmount').value;
        const fromCurrency = document.getElementById('quickFromCurrency').value;
        const toCurrency = document.getElementById('quickToCurrency').value;
        const resultDiv = document.getElementById('quickConvertResult');

        try {
            const response = await fetch('/convert-currency', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `amount=${amount}&from_currency=${fromCurrency}&to_currency=${toCurrency}`
            });

            const data = await response.json();

            if (data.success) {
                resultDiv.innerHTML = `
                    ${amount} ${fromCurrency} = 
                    ${data.result.converted_amount.toFixed(2)} ${toCurrency}
                `;
                resultDiv.style.display = 'block';
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            resultDiv.className = 'alert alert-danger';
            resultDiv.textContent = error.message || 'Conversion failed';
            resultDiv.style.display = 'block';
        }
    },

    async checkPublicIP() {
        try {
            const response = await fetch('/get-ip-info');
            const data = await response.json();

            // Create alert for IP info
            const alertHtml = `
                <div class="alert alert-info alert-dismissible fade show" role="alert">
                    <h4 class="alert-heading">Your IP Information</h4>
                    <p>IP: ${data.ip}</p>
                    <p>Location: ${data.city}, ${data.region}, ${data.country_name}</p>
                    <p>ISP: ${data.org}</p>
                    <button type="button" class="close" data-dismiss="alert">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            `;

            // Add alert to notifications area
            const notifications = document.getElementById('system-notifications');
            if (notifications) {
                notifications.insertAdjacentHTML('afterbegin', alertHtml);
            }
        } catch (error) {
            console.error('Error fetching IP:', error);
        }
    },

    initToolsUsageWidget() {
        // Simulate real-time tool usage updates
        setInterval(() => {
            const tools = ['Calculator', 'Speed Test', 'Currency Converter', 'QR Generator'];
            const randomTool = tools[Math.floor(Math.random() * tools.length)];
            this.updateRecentActivity(`New activity: ${randomTool} was used`);
        }, 30000); // Update every 30 seconds
    },

    initSystemMonitor() {
        const updateSystemStats = () => {
            // Memory usage simulation
            const memoryUsage = Math.floor(Math.random() * 30) + 70; // 70-100%
            const cpuUsage = Math.floor(Math.random() * 40) + 30; // 30-70%

            // Update system stats display
            this.updateSystemStats({
                memory: memoryUsage,
                cpu: cpuUsage,
                status: memoryUsage > 90 ? 'High Load' : 'Normal'
            });
        };

        updateSystemStats();
        setInterval(updateSystemStats, 5000);
    },

    initNetworkMonitor() {
        const updateNetworkStats = () => {
            const latency = Math.floor(Math.random() * 100);
            const status = latency < 50 ? 'Good' : latency < 100 ? 'Fair' : 'Poor';

            // Update network stats display
            this.updateNetworkStats({
                latency: latency,
                status: status
            });
        };

        updateNetworkStats();
        setInterval(updateNetworkStats, 10000);
    },

    updateSystemStats(stats) {
        const statusElement = document.getElementById('system-status');
        if (statusElement) {
            statusElement.textContent = stats.status;
            statusElement.className = `badge badge-${stats.memory > 90 ? 'danger' : 'success'}`;
        }
    },

    updateNetworkStats(stats) {
        const statusElement = document.getElementById('network-status');
        if (statusElement) {
            statusElement.textContent = `${stats.status} (${stats.latency}ms)`;
            statusElement.className = `badge badge-${
                stats.latency < 50 ? 'success' : stats.latency < 100 ? 'warning' : 'danger'
            }`;
        }
    },

    initRecentActivity() {
        const activities = [
            'Currency conversion performed',
            'Speed test completed',
            'QR code generated',
            'DNS lookup executed'
        ];

        // Add initial activities
        activities.forEach(activity => {
            this.updateRecentActivity(activity);
        });
    },

    updateRecentActivity(activity) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        const activityHtml = `
            <div class="timeline-item">
                <i class="ni ni-bell-55 text-primary"></i>
                <span class="float-right text-sm text-muted">
                    ${new Date().toLocaleTimeString()}
                </span>
                <p class="text-sm">${activity}</p>
            </div>
        `;

        container.insertAdjacentHTML('afterbegin', activityHtml);

        // Keep only last 5 activities
        const items = container.getElementsByClassName('timeline-item');
        while (items.length > 5) {
            items[items.length - 1].remove();
        }
    },

    bindWidgetEvents() {
        // Network status updates
        window.addEventListener('online', () => {
            this.updateNetworkStats({ latency: 0, status: 'Connected' });
        });

        window.addEventListener('offline', () => {
            this.updateNetworkStats({ latency: 999, status: 'Disconnected' });
        });

        // Tool usage tracking
        document.querySelectorAll('a[href^="/"]').forEach(link => {
            link.addEventListener('click', () => {
                const tool = link.textContent.trim();
                this.updateRecentActivity(`Tool accessed: ${tool}`);
            });
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    DashboardWidgets.init();
});
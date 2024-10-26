<script>
    // Fetch public IP address
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            document.getElementById('public-ip').textContent = data.ip;
        })
        .catch(error => {
            document.getElementById('public-ip').textContent = 'Unable to retrieve IP address';
        });

    // Fetch additional IP information
    document.getElementById('fetch-ip-info').addEventListener('click', function() {
        fetch('/get-ip-info') // Call the Flask route to get IP information
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    // Handle error response from the Flask route
                    document.getElementById('ip-info').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
                } else {
                    displayIpInfo(data); // Display the retrieved IP information
                }
            })
            .catch(error => {
                // Handle errors from the fetch call
                document.getElementById('ip-info').innerHTML = `<div class="alert alert-danger">${error}</div>`;
            });
    });

    // Function to display the additional IP information
    function displayIpInfo(data) {
        const ipInfoContainer = document.getElementById('ip-info');
        ipInfoContainer.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">IP Address: ${data.ip}</h5>
                    <p>City: ${data.city}</p>
                    <p>Region: ${data.region}</p>
                    <p>Country: ${data.country}</p>
                    <p>ISP: ${data.org}</p>
                    <p>Connection Type: ${data.connection || 'N/A'}</p>
                    <p>Network: ${data.network || 'N/A'}</p>
                </div>
            </div>
        `;
    }
</script>

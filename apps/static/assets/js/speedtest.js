document.addEventListener('DOMContentLoaded', () => {
    const runTestButton = document.getElementById('run-test');
    const loadingMessage = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const downloadDisplay = document.getElementById('download');
    const uploadDisplay = document.getElementById('upload');
    const pingDisplay = document.getElementById('ping');
    const errorMessageDisplay = document.getElementById('error-message');

    // Hide elements initially
    resultDiv.classList.add('hidden');
    loadingMessage.classList.add('hidden');
    errorMessageDisplay.classList.add('hidden');

    // Handle the button click event
    runTestButton.addEventListener('click', () => {
        loadingMessage.classList.remove('hidden');
        errorMessageDisplay.classList.add('hidden');
        resultDiv.classList.add('hidden');

        fetch('/run-speedtest', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            loadingMessage.classList.add('hidden');

            if (data.success) {
                downloadDisplay.textContent = data.results.download;
                uploadDisplay.textContent = data.results.upload;
                pingDisplay.textContent = data.results.ping;
                resultDiv.classList.remove('hidden');
            } else {
                showError(data.error);
            }
        })
        .catch(error => {
            loadingMessage.classList.add('hidden');
            showError('An error occurred while running the speed test: ' + error.message);
        });
    });

    // Function to display error messages
    function showError(message) {
        errorMessageDisplay.textContent = message;
        errorMessageDisplay.classList.remove('hidden');
    }
});

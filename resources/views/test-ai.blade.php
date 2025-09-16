<!DOCTYPE html>
<html>
<head>
    <title>AI Model Test</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body>
    <h1>AI Model Connection Test</h1>
    
    <div id="results"></div>
    
    <h2>Test OpenAI Model (ID: 1)</h2>
    <button onclick="testAiModel(1)">Test OpenAI</button>
    
    <h2>Test Perplexity Model (ID: 3)</h2>
    <button onclick="testAiModel(3)">Test Perplexity</button>
    
    <h2>Test Gemini Model (ID: 2) - Should Fail (No API Key)</h2>
    <button onclick="testAiModel(2)">Test Gemini</button>
    
    <h2>Test CSRF Only</h2>
    <button onclick="testCsrf()">Test CSRF</button>

    <script>
        function testAiModel(modelId) {
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            console.log('Testing AI Model:', modelId);
            console.log('CSRF Token:', csrfToken);
            
            fetch(`/admin/ai-models/${modelId}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({})
            })
            .then(response => {
                console.log('Response status:', response.status);
                console.log('Response headers:', [...response.headers.entries()]);
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                document.getElementById('results').innerHTML += `<div>Model ${modelId}: ${JSON.stringify(data)}</div>`;
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('results').innerHTML += `<div>Model ${modelId} Error: ${error.message}</div>`;
            });
        }
        
        function testCsrf() {
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            console.log('Testing CSRF Token:', csrfToken);
            
            fetch('/test-csrf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                console.log('CSRF Test Response:', data);
                document.getElementById('results').innerHTML += `<div>CSRF Test: ${JSON.stringify(data)}</div>`;
            })
            .catch(error => {
                console.error('CSRF Error:', error);
                document.getElementById('results').innerHTML += `<div>CSRF Test Error: ${error.message}</div>`;
            });
        }
    </script>
</body>
</html>

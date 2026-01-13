<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Model Health Check Alert</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #ef4444;
            margin-bottom: 10px;
        }
        h1 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .alert-box {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-title {
            color: #991b1b;
            font-weight: 600;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .content {
            color: #4b5563;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .models-list {
            background-color: #f9fafb;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .model-item {
            padding: 12px;
            margin: 8px 0;
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            display: flex;
            align-items: center;
        }
        .model-status {
            display: inline-block;
            width: 10px;
            height: 10px;
            background-color: #ef4444;
            border-radius: 50%;
            margin-right: 12px;
        }
        .model-name {
            font-weight: 600;
            color: #1f2937;
        }
        .model-provider {
            color: #6b7280;
            font-size: 14px;
            margin-left: 8px;
        }
        .action-box {
            background-color: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .action-title {
            color: #1e40af;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .action-content {
            color: #4b5563;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .timestamp {
            color: #9ca3af;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">⚠️ Alert</div>
            <h1>AI Model Health Check Failed</h1>
        </div>

        <div class="alert-box">
            <div class="alert-title">{{ count($failedModels) }} {{ count($failedModels) === 1 ? 'Model Has' : 'Models Have' }} Been Disabled</div>
            <div class="content">
                During the scheduled health check, the following AI {{ count($failedModels) === 1 ? 'model' : 'models' }} failed to respond correctly and {{ count($failedModels) === 1 ? 'has' : 'have' }} been automatically disabled to prevent service disruptions.
            </div>
        </div>

        <div class="models-list">
            <h3 style="margin-top: 0; color: #1f2937;">Failed Models:</h3>
            @foreach($failedModels as $model)
                <div class="model-item">
                    <span class="model-status"></span>
                    <div>
                        <span class="model-name">{{ $model->display_name }}</span>
                        <span class="model-provider">({{ $model->name }})</span>
                    </div>
                </div>
            @endforeach
        </div>

        <div class="action-box">
            <div class="action-title">Required Actions:</div>
            <div class="action-content">
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Verify API keys and credentials for the affected models</li>
                    <li>Check API provider status and service availability</li>
                    <li>Review any rate limits or quota restrictions</li>
                    <li>Test the models manually before re-enabling them</li>
                    <li>Re-enable models in the admin panel once issues are resolved</li>
                </ul>
            </div>
        </div>

        <div class="content">
            <strong>Note:</strong> Disabled models will not be used for prompt generation until they are manually re-enabled in the admin panel.
        </div>

        <div class="footer">
            <p>This is an automated notification from the AI Model Health Check system.</p>
            <p class="timestamp">Sent on {{ now()->format('F j, Y \a\t g:i A') }}</p>
        </div>
    </div>
</body>
</html>

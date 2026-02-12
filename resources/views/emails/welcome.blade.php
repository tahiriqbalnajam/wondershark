<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to WonderShark</title>
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
            color: #2563eb;
            margin-bottom: 10px;
        }
        h1 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .content {
            color: #4b5563;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg width="40" height="30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 334.75 256.9" style="display: inline-block; vertical-align: middle; margin-right: 10px;">
                    <path d="M334.23,193c-3.6-33.1-24.8-68.2-45.4-90.1-11.5-12.2-24.7-22.4-37-33.7-16.4-15.2-28-33.3-34-54.9-1.3-4.5-2.5-9-4-14.3-9.3,11.3-17.9,22-20.7,36.1-.5,2.5-1.1,3.3-3.8,2.5-15.9-4.8-32.3-7.3-48.9-8.1-44.1-2-85,7.9-122.1,32.3-6.4,4.2-13,8.4-18.3,14.2,0,.4-.1.9.1,1.1,8,8.5,16.1,16.9,24.1,25.4.9.9,1.7,1,2.7.1,6.7-6.4,15.1-9.5,23.9-11.3,6-1.3,12.1-2.8,19.5-2.1-1.6.8-2.2,1.2-2.9,1.4-10.4,3.8-19.5,9.6-28.2,16.2-3.7,2.8-3.7,3.9-.3,6.9,1.2,1,2.5,1.9,3.9,2.7,6.6,3.9,13.8,6.3,21.1,8.5,16,4.7,32.4,7.7,48.8,10.3,2.5.4,3,1.1,2.2,3.5-2.4,7.7-3,15.7-2.8,23.7.4,15.7,3.9,30.9,8.9,45.8,1.9,5.8,3.9,11.5,7.1,16.9-.1-7.7,1.6-14.8,4.4-21.8,9.4-24.1,24.1-45,39.4-65.6,1.2-1.6,2.7-1.7,4.5-1.8,50.2-3.1,101.2,19.5,132.3,58.9,14.7,18.6,15.4,41.8-2.1,61.1,23.4-16.3,30.2-39.6,27.6-63.9ZM67.23,65.1c-2.3,0-3.9-1.5-3.9-3.9.1-2.3,1.6-3.6,3.8-3.6s3.5,1.5,3.7,3.8c-.3,2.1-1.4,3.7-3.6,3.7Z" fill="#2563eb"/>
                </svg>
                WonderShark
            </div>
        </div>

        <h1>Welcome to WonderShark!</h1>

        <div class="content">
            <p>Hi {{ $user->name }},</p>
            
            <p>Welcome to WonderShark! We're thrilled to have you on board.</p>

            <p>WonderShark helps you track your brand's visibility and competitive landscape with powerful AI insights.</p>
            
            <p>You can now access your dashboard to start setting up your brands and competitors.</p>

            <div style="text-align: center;">
                <a href="{{ route('dashboard') }}" class="button">Go to Dashboard</a>
            </div>
        </div>

        <div class="footer">
            <p>&copy; {{ date('Y') }} WonderShark. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

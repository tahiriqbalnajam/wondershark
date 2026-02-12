<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agency Invitation</title>
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
        .info-box {
            background-color: #f3f4f6;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .expires {
            color: #ef4444;
            font-size: 14px;
            margin-top: 10px;
        }
        .alt-link {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9fafb;
            border-radius: 4px;
            word-break: break-all;
            font-size: 12px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
         <div class="header">
            <div class="logo">
                <img src="{{ asset('android-chrome-192x192.png') }}" alt="WonderShark Logo" style="width: 40px; height: 30px; display: inline-block; vertical-align: middle; margin-right: 10px;">
                WonderShark
            </div>
        </div>

        <h1>You've been invited!</h1>

        <div class="content">
            <p>Hi {{ $invitation->name }},</p>
            
            <p><strong>{{ $invitation->agency->name }}</strong> has invited you to join their team on WonderShark.</p>

            <div class="info-box">
                <strong>What is WonderShark?</strong><br>
                WonderShark is a brand visibility and competitive analysis platform that helps agencies and brands track their online presence and performance.
            </div>

            <p>Click the button below to accept your invitation and create your account:</p>

            <div style="text-align: center;">
                <a href="{{ $invitationUrl }}" class="button">Accept Invitation</a>
            </div>

            <p class="expires">⏰ This invitation will expire in 48 hours ({{ $invitation->expires_at->format('M d, Y g:i A') }}).</p>
        </div>

        <div class="alt-link">
            <strong>If the button doesn't work, copy and paste this link into your browser:</strong><br>
            {{ $invitationUrl }}
        </div>

        <div class="footer">
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p>&copy; {{ date('Y') }} WonderShark. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

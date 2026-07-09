<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Complimentary Account Deactivation Request</title>
</head>
<body>
    <p>Hello,</p>

    <p>The user below has requested deactivation of their complimentary Wondershark.ai account.</p>

    <ul>
        <li><strong>Name:</strong> {{ $user->name }}</li>
        <li><strong>Email:</strong> {{ $user->email }}</li>
        <li><strong>User ID:</strong> {{ $user->id }}</li>
    </ul>

    <p>Please deactivate the account and stop sending weekly report emails. We will not contact them again.</p>

    <p>— Wondershark.ai System</p>
</body>
</html>

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WebsiteUrl;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WebsiteUrlController extends Controller
{
    public function index()
    {
        $websiteUrls = WebsiteUrl::ordered()->get();

        return Inertia::render('admin/website-urls/index', [
            'websiteUrls' => $websiteUrls,
            'googleSheetsConnected' => $this->isGoogleSheetsConnected(),
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/website-urls/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'url' => 'required|url|max:2048',
            'description' => 'nullable|string|max:1000',
            'is_enabled' => 'boolean',
            'order' => 'required|integer|min:0|max:100',
        ]);

        WebsiteUrl::create($validated);

        return redirect()->route('admin.website-urls.index')
            ->with('success', 'Website URL created successfully.');
    }

    public function edit(WebsiteUrl $websiteUrl)
    {
        return Inertia::render('admin/website-urls/edit', [
            'websiteUrl' => $websiteUrl,
        ]);
    }

    public function update(Request $request, WebsiteUrl $websiteUrl)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'url' => 'required|url|max:2048',
            'description' => 'nullable|string|max:1000',
            'is_enabled' => 'boolean',
            'order' => 'required|integer|min:0|max:100',
        ]);

        $websiteUrl->update($validated);

        return redirect()->route('admin.website-urls.index')
            ->with('success', 'Website URL updated successfully.');
    }

    public function destroy(WebsiteUrl $websiteUrl)
    {
        $websiteUrl->delete();

        return redirect()->route('admin.website-urls.index')
            ->with('success', 'Website URL deleted successfully.');
    }

    public function toggle(WebsiteUrl $websiteUrl)
    {
        $websiteUrl->update([
            'is_enabled' => ! $websiteUrl->is_enabled,
        ]);

        return back()->with('success', 'Website URL status updated successfully.');
    }

    public function redirectToGoogle()
    {
        $clientId = config('services.google_sheets.client_id');
        $clientSecret = config('services.google_sheets.client_secret');
        $redirectUri = $this->getRedirectUri();

        if (! $clientId || ! $clientSecret) {
            return back()->with('error', 'Google Sheets OAuth is not configured. Set GOOGLE_SHEET_CLIENT_ID and GOOGLE_SHEET_CLIENT_SECRET in .env');
        }

        $client = new \Google_Client();
        $client->setClientId($clientId);
        $client->setClientSecret($clientSecret);
        $client->setRedirectUri($redirectUri);
        $client->addScope(\Google_Service_Sheets::SPREADSHEETS_READONLY);
        $client->setAccessType('offline');
        $client->setPrompt('consent');

        return redirect()->away($client->createAuthUrl());
    }

    public function handleGoogleCallback(Request $request)
    {
        $clientId = config('services.google_sheets.client_id');
        $clientSecret = config('services.google_sheets.client_secret');
        $redirectUri = $this->getRedirectUri();

        if (! $request->has('code')) {
            return redirect()->route('admin.website-urls.index')
                ->with('error', 'Authorization failed: no authorization code received.');
        }

        $client = new \Google_Client();
        $client->setClientId($clientId);
        $client->setClientSecret($clientSecret);
        $client->setRedirectUri($redirectUri);
        $client->addScope(\Google_Service_Sheets::SPREADSHEETS_READONLY);

        try {
            $token = $client->fetchAccessTokenWithAuthCode($request->input('code'));

            if (isset($token['error'])) {
                return redirect()->route('admin.website-urls.index')
                    ->with('error', 'Authorization failed: ' . $token['error_description'] ?? $token['error']);
            }

            SystemSetting::set('google_sheets_tokens', $token, 'json', 'Google Sheets OAuth tokens');

            return redirect()->route('admin.website-urls.index')
                ->with('success', 'Google Sheets connected successfully. You can now sync URLs.');
        } catch (\Exception $e) {
            return redirect()->route('admin.website-urls.index')
                ->with('error', 'Google authorization failed: ' . $e->getMessage());
        }
    }

    public function disconnectGoogle()
    {
        SystemSetting::set('google_sheets_tokens', null, 'json', 'Google Sheets OAuth tokens');

        return back()->with('success', 'Google Sheets disconnected.');
    }

    public function syncFromGoogleSheet()
    {
        $sheetId = config('services.google_sheets.sheet_id');

        if (! $sheetId) {
            return back()->with('error', 'Google Sheets is not configured. Set GOOGLE_SHEET_ID in .env');
        }

        $client = $this->getAuthenticatedGoogleClient();

        if (! $client) {
            return redirect()->route('admin.website-urls.auth.redirect');
        }

        try {
            $service = new \Google_Service_Sheets($client);
            $response = $service->spreadsheets_values->get($sheetId, 'Sheet1');
            $rows = $response->getValues();

            if (empty($rows)) {
                return back()->with('error', 'No data found in the Google Sheet.');
            }

            $headers = array_map('strtolower', array_map('trim', $rows[0]));
            $created = 0;
            $updated = 0;

            foreach (array_slice($rows, 1) as $row) {
                $data = [];
                foreach ($headers as $i => $header) {
                    $data[$header] = $row[$i] ?? '';
                }

                if (empty($data['url'])) {
                    continue;
                }

                $fields = [
                    'title' => $data['title'] ?? '',
                    'url' => $data['url'],
                    'description' => $data['description'] ?? null,
                    'is_enabled' => filter_var($data['is_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN),
                    'order' => is_numeric($data['order'] ?? 0) ? (int) $data['order'] : 0,
                ];

                $existing = WebsiteUrl::where('url', $fields['url'])->first();

                if ($existing) {
                    $existing->update($fields);
                    $updated++;
                } else {
                    WebsiteUrl::create($fields);
                    $created++;
                }
            }

            return back()->with('success', "Sync complete: {$created} created, {$updated} updated.");
        } catch (\Exception $e) {
            return back()->with('error', 'Google Sheets sync failed: ' . $e->getMessage());
        }
    }

    private function isGoogleSheetsConnected(): bool
    {
        $tokens = SystemSetting::getJson('google_sheets_tokens');

        if (empty($tokens) || empty($tokens['access_token'])) {
            return false;
        }

        if (! empty($tokens['expires_in']) && ! empty($tokens['created'])) {
            $expiresAt = $tokens['created'] + $tokens['expires_in'];
            if (time() >= $expiresAt && empty($tokens['refresh_token'])) {
                return false;
            }
        }

        return true;
    }

    private function getRedirectUri(): string
    {
        $configuredUri = config('services.google_sheets.redirect_uri');

        if ($configuredUri && str_starts_with($configuredUri, 'http')) {
            return $configuredUri;
        }

        return \Illuminate\Support\Facades\URL::route('admin.website-urls.auth.callback');
    }

    private function getAuthenticatedGoogleClient(): ?\Google_Client
    {
        $clientId = config('services.google_sheets.client_id');
        $clientSecret = config('services.google_sheets.client_secret');
        $redirectUri = $this->getRedirectUri();

        if (! $clientId || ! $clientSecret) {
            return null;
        }

        $tokens = SystemSetting::getJson('google_sheets_tokens');

        if (empty($tokens) || empty($tokens['access_token'])) {
            return null;
        }

        $client = new \Google_Client();
        $client->setClientId($clientId);
        $client->setClientSecret($clientSecret);
        $client->setRedirectUri($redirectUri);
        $client->addScope(\Google_Service_Sheets::SPREADSHEETS_READONLY);
        $client->setAccessToken($tokens);

        if ($client->isAccessTokenExpired()) {
            if (! empty($tokens['refresh_token'])) {
                $newToken = $client->fetchAccessTokenWithRefreshToken($tokens['refresh_token']);

                if (! isset($newToken['error'])) {
                    if (! isset($newToken['refresh_token'])) {
                        $newToken['refresh_token'] = $tokens['refresh_token'];
                    }
                    SystemSetting::set('google_sheets_tokens', $newToken, 'json', 'Google Sheets OAuth tokens');

                    return $client;
                }
            }

            return null;
        }

        return $client;
    }
}

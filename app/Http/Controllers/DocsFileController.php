<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\Folder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class DocsFileController extends Controller
{
    /**
     * Display the docs and files page.
     */
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $brandId = $request->get('brand_id');
        $folder = $request->get('folder');
        $isAdmin = $user->hasRole('admin');

        $files = File::query()
            ->when(!$isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->when($brandId, fn($q) => $q->where('brand_id', $brandId))
            ->when($folder, fn($q) => $q->where('folder', $folder))
            ->when(!$folder, fn($q) => $q->whereNull('folder'))
            ->with(['user', 'brand'])
            ->orderBy('created_at', 'desc')
            ->get();

        $folders = Folder::query()
            ->when(!$isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->when($brandId, fn($q) => $q->where('brand_id', $brandId))
            ->when($folder, fn($q) => $q->where('parent', $folder))
            ->when(!$folder, fn($q) => $q->whereNull('parent'))
            ->with(['user', 'brand'])
            ->get();

        $allFolders = Folder::query()
            ->when(!$isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->when($brandId, fn($q) => $q->where('brand_id', $brandId))
            ->get();
        $allFiles = File::query()
            ->when(!$isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->when($brandId, fn($q) => $q->where('brand_id', $brandId))
            ->get();

        $brands = auth()->user()->getAccessibleBrands();

        return Inertia::render('docs-files/index', [
            'title' => 'Docs & Files',
            'files' => $files,
            'folders' => $folders,
            'allFiles' => $allFiles,
            'allFolders' => $allFolders,
            'brands' => $brands,
            'currentBrand' => $brandId,
            'currentFolder' => $folder,
            'userPreferences' => [
                'viewMode' => $user->docs_view_mode ?? 'grid',
                'sortBy' => $user->docs_sort_by ?? 'date',
            ],
        ]);
    }

    /**
     * Store a newly uploaded file.
     */
    

    public function store(Request $request)
    {
        $validated = $request->validate([
            'file'     => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif,mp4,avi,mov',
            'brand_id' => 'nullable|exists:brands,id',
            'folder'   => 'nullable|string|max:255',
        ]);

        if (! $request->hasFile('file')) {
            abort(422, 'File upload failed.');
        }

        if ($request->brand_id) {
            $hasAccess = auth()->user()
                ->getAccessibleBrands()
                ->contains('id', $request->brand_id);

            abort_unless($hasAccess, 403);
        }

        $uploadedFile = $request->file('file');

        // Get file details before moving (to avoid temp file issues on Windows)
        $originalName = $uploadedFile->getClientOriginalName();
        $mimeType = $uploadedFile->getClientMimeType();
        $size = $uploadedFile->getSize();

        // Optional: organize by folder if provided
        $directory = 'files';
        if (! empty($validated['folder'])) {
            $directory .= '/' . trim($validated['folder'], '/');
        }

        // Generate unique filename
        $filename = uniqid('file_') . '.' . $uploadedFile->getClientOriginalExtension();

        // Ensure target directory exists
        $fullDirectory = public_path('storage/' . $directory);
        if (!file_exists($fullDirectory)) {
            mkdir($fullDirectory, 0755, true);
        }

        // Move file to the directory
        $uploadedFile->move($fullDirectory, $filename);

        // Save relative path
        $path = $directory . '/' . $filename;

        $file = File::create([
            'name'          => $filename,
            'original_name' => $originalName,
            'path'          => $path,
            'mime_type'     => $mimeType,
            'size'          => $size,
            'folder'        => $validated['folder'] ?? null,
            'user_id'       => auth()->id(),
            'brand_id'      => $validated['brand_id'] ?? null,
        ]);

        return redirect()->back()->with('success', 'File uploaded successfully.');
    }



    /**
     * Get all folders for selection.
     */
    public function getFolders(Request $request)
    {
        $brandId = $request->get('brand_id');

        $folders = Folder::query()
            ->when($brandId, fn($q) => $q->where('brand_id', $brandId))
            ->get();

        return response()->json(['folders' => $folders]);
    }

    /**
     * Store a newly created folder.
     */
    public function storeFolder(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent' => 'nullable|string',
            'brand_id' => 'nullable|exists:brands,id',
        ]);

        if ($request->brand_id) {
            $hasAccess = auth()->user()
                ->getAccessibleBrands()
                ->contains('id', $request->brand_id);

            abort_unless($hasAccess, 403);
        }

        Folder::create([
            'name' => $validated['name'],
            'parent' => $validated['parent'],
            'user_id' => auth()->id(),
            // 'brand_id' => $validated['brand_id'],
        ]);

        return redirect()->back();
    }

    /**
     * Move a file to a different folder.
     */
    public function move(File $file, Request $request)
    {
        if ($file->user_id !== auth()->id()) {
            return redirect()->back()
                ->withErrors(['permission' => 'You are not allowed to modify this file.']);
        }

        $validated = $request->validate([
            'folder' => 'nullable|string',
        ]);

        $file->update(['folder' => $validated['folder']]);

        return redirect()->back()->with('success', 'File moved successfully.');
    }
    public function copy(File $file, Request $request)
    {
        if ($file->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'folder' => 'nullable|string',
        ]);

        // Get the original file path
        $originalPath = public_path('storage/' . $file->path);

        // Generate new filename
        $newFilename = uniqid('file_') . '.' . pathinfo($file->name, PATHINFO_EXTENSION);

        // Determine directory
        $directory = 'files';
        if (!empty($validated['folder'])) {
            $directory .= '/' . trim($validated['folder'], '/');
        }

        // Ensure target directory exists
        $fullDirectory = public_path('storage/' . $directory);
        if (!file_exists($fullDirectory)) {
            mkdir($fullDirectory, 0755, true);
        }

        // Copy the file
        $newPath = $directory . '/' . $newFilename;
        $fullNewPath = public_path('storage/' . $newPath);
        copy($originalPath, $fullNewPath);

        // Create new file record
        File::create([
            'name' => $newFilename,
            'original_name' => 'Copy of ' . $file->original_name,
            'path' => $newPath,
            'mime_type' => $file->mime_type,
            'size' => $file->size,
            'folder' => $validated['folder'] ?? null,
            'user_id' => auth()->id(),
            'brand_id' => $file->brand_id,
        ]);

        return redirect()->back()->with('success', 'File copied successfully.');
    }

    /**
     * Update a folder (rename).
     */
    public function updateFolder(Folder $folder, Request $request)
    {
        if ($folder->user_id !== auth()->id()) {
            return redirect()->back()
                ->withErrors(['permission' => 'You are not allowed to modify this folder.']);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $oldName = $folder->name;
        $newName = $validated['name'];
        
        // Get old folder path
        $oldFolderPath = $folder->parent ? $folder->parent . '/' . $oldName : $oldName;
        
        // Update the folder name
        $folder->update(['name' => $newName]);
        
        // Get new folder path
        $newFolderPath = $folder->parent ? $folder->parent . '/' . $newName : $newName;
        
        // Update all subfolders' parent paths
        $this->updateSubfolderPathsOnRename($oldFolderPath, $newFolderPath);
        
        // Update all files' folder paths
        $this->updateFilePathsOnRename($oldFolderPath, $newFolderPath);

        return redirect()->back()->with('success', 'Folder renamed successfully.');
    }

    /**
     * Recursively update all subfolders' parent paths when a folder is renamed.
     */
    private function updateSubfolderPathsOnRename($oldPath, $newPath)
    {
        $subfolders = Folder::where('parent', $oldPath)->get();
        
        foreach ($subfolders as $subfolder) {
            $oldSubfolderPath = $oldPath . '/' . $subfolder->name;
            $newSubfolderPath = $newPath . '/' . $subfolder->name;
            
            // Update this subfolder's parent
            $subfolder->update(['parent' => $newPath]);
            
            // Recursively update its children
            $this->updateSubfolderPathsOnRename($oldSubfolderPath, $newSubfolderPath);
        }
    }

    /**
     * Recursively update all files' folder paths when a folder is renamed.
     */
    private function updateFilePathsOnRename($oldPath, $newPath)
    {
        // Get all files that are in this folder or any of its subfolders
        $files = File::where('folder', $oldPath)
            ->orWhere('folder', 'LIKE', $oldPath . '/%')
            ->get();
        
        foreach ($files as $file) {
            if ($file->folder === $oldPath) {
                // Direct file in the renamed folder
                $file->update(['folder' => $newPath]);
            } else {
                // File in a subfolder - replace the old path prefix with the new path
                $newFolderPath = str_replace($oldPath . '/', $newPath . '/', $file->folder);
                $file->update(['folder' => $newFolderPath]);
            }
        }
    }

    /**
     * Move a folder to a different parent.
     */
    public function moveFolder(Folder $folder, Request $request)
    {
        if ($folder->user_id !== auth()->id()) {
            return redirect()->back()
                ->withErrors(['permission' => 'You are not allowed to modify this folder.']);
        }

        $validated = $request->validate([
            'parent' => 'nullable|string',
        ]);

        // Validate that moving the folder won't create a circular structure
        if (!$folder->canMoveTo($validated['parent'])) {
            return redirect()->back()->withErrors([
                'folder' => 'Cannot move a folder to itself or to one of its subfolders.',
            ])->with('error', 'Cannot move folder to this location.');
        }

        // Get old folder path
        $oldFolderPath = $folder->parent ? $folder->parent . '/' . $folder->name : $folder->name;
        
        // Update the folder's parent
        $folder->update(['parent' => $validated['parent']]);
        
        // Get new folder path
        $newFolderPath = $validated['parent'] ? $validated['parent'] . '/' . $folder->name : $folder->name;
        
        // Update all subfolders' parent paths
        $this->updateSubfolderPaths($oldFolderPath, $newFolderPath);
        
        // Update all files' folder paths
        $this->updateFilePaths($oldFolderPath, $newFolderPath);

        return redirect()->back()->with('success', 'Folder moved successfully.');
    }

    /**
     * Recursively update all subfolders' parent paths when a folder is moved.
     */
    private function updateSubfolderPaths($oldPath, $newPath)
    {
        $subfolders = Folder::where('parent', $oldPath)->get();
        
        foreach ($subfolders as $subfolder) {
            $oldSubfolderPath = $oldPath . '/' . $subfolder->name;
            $newSubfolderPath = $newPath . '/' . $subfolder->name;
            
            // Update this subfolder
            $subfolder->update(['parent' => $newPath]);
            
            // Recursively update its children
            $this->updateSubfolderPaths($oldSubfolderPath, $newSubfolderPath);
        }
    }

    /**
     * Recursively update all files' folder paths when a folder is moved.
     */
    private function updateFilePaths($oldPath, $newPath)
    {
        // Get all files that are in this folder or any of its subfolders
        // by finding files where folder matches the old path pattern
        $files = File::where('folder', $oldPath)
            ->orWhere('folder', 'LIKE', $oldPath . '/%')
            ->get();
        
        foreach ($files as $file) {
            if ($file->folder === $oldPath) {
                // Direct file in the moved folder
                $file->update(['folder' => $newPath]);
            } else {
                // File in a subfolder - replace the old path prefix with the new path
                $newFolderPath = str_replace($oldPath . '/', $newPath . '/', $file->folder);
                $file->update(['folder' => $newFolderPath]);
            }
        }
    }

    /**
     * Copy a folder to a different parent.
     */
    public function copyFolder(Folder $folder, Request $request)
    {
        if ($folder->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'parent' => 'nullable|string',
        ]);

        // Create new folder
        $newFolder = Folder::create([
            'name' => 'Copy of ' . $folder->name,
            'parent' => $validated['parent'],
            'user_id' => auth()->id(),
            'brand_id' => $folder->brand_id,
        ]);

        // Optionally copy subfolders and files, but for simplicity, just the folder
        // TODO: Implement recursive copy if needed

        return redirect()->back()->with('success', 'Folder copied successfully.');
    }

    /**
     * Delete a folder.
     */
    public function destroyFolder(Folder $folder)
    {
        if ($folder->user_id !== auth()->id()) {
            abort(403);
        }

        // Delete all files in the folder and subfolders
        $this->deleteFolderContents($folder);

        $folder->delete();

        return redirect()->back()->with('success', 'Folder deleted successfully.');
    }

    /**
     * Download a folder as zip.
     */
    public function downloadFolder(Folder $folder)
    {
        if ($folder->user_id !== auth()->id()) {
            abort(403);
        }

        // Check if ZipArchive extension is available
        if (!extension_loaded('zip')) {
            return redirect()->back()->with('error', 'ZIP extension is not enabled on this server. Please contact your administrator.');
        }

        $folderPath = $folder->parent ? $folder->parent . '/' . $folder->name : $folder->name;

        $zipFileName = $folder->name . '_' . time() . '.zip';
        
        // Create zip in public storage temp directory
        $tempDir = public_path('storage/temp');
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        
        $zipPath = $tempDir . '/' . $zipFileName;

        try {
            // Clean up old temp files (older than 1 hour)
            $this->cleanupOldTempFiles($tempDir, 3600);
            
            $zip = new \ZipArchive();
            $openResult = $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
            
            if ($openResult !== true) {
                return redirect()->back()->with('error', 'Could not create zip file.');
            }

            // Add files recursively
            $this->addFolderToZip($zip, $folderPath, '');

            $zip->close();

            // Check if file was created
            if (!file_exists($zipPath)) {
                return redirect()->back()->with('error', 'Failed to create zip file.');
            }

            // Download the file
            return response()->download($zipPath, $folder->name . '.zip', [
                'Content-Type' => 'application/zip',
                'Content-Disposition' => 'attachment; filename="' . $folder->name . '.zip"',
            ])->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            \Log::error('Download folder error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to create zip file: ' . $e->getMessage());
        }
    }
    public function download(File $file)
        {
            return response()->download(
                storage_path('app/' . $file->path),
                $file->original_name
            );
        }
    
    /**
     * Clean up old temporary files
     */
    private function cleanupOldTempFiles(string $directory, int $maxAge = 3600): void
    {
        try {
            if (!is_dir($directory)) {
                return;
            }
            
            $files = glob($directory . '/*.zip');
            $now = time();
            
            foreach ($files as $file) {
                if (is_file($file) && ($now - filemtime($file)) > $maxAge) {
                    @unlink($file);
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to cleanup temp files: ' . $e->getMessage());
        }
    }

    private function deleteFolderContents(Folder $folder)
    {
        $folderPath = $folder->parent ? $folder->parent . '/' . $folder->name : $folder->name;

        // Delete subfolders recursively
        $subfolders = Folder::where('parent', $folderPath)->get();
        foreach ($subfolders as $subfolder) {
            $this->deleteFolderContents($subfolder);
            $subfolder->delete();
        }

        // Delete files in this folder
        $files = File::where('folder', $folderPath)->get();
        foreach ($files as $file) {
            if (file_exists(public_path('storage/' . $file->path))) {
                unlink(public_path('storage/' . $file->path));
            }
            $file->delete();
        }
    }

    private function addFolderToZip(\ZipArchive $zip, string $folderPath, string $zipPrefix)
    {
        // Add files in this folder
        $files = File::where('folder', $folderPath)->get();
        foreach ($files as $file) {
            $filePath = public_path('storage/' . $file->path);
            if (file_exists($filePath)) {
                $zip->addFile($filePath, $zipPrefix . $file->original_name);
            }
        }

        // Add subfolders
        $subfolders = Folder::where('parent', $folderPath)->get();
        foreach ($subfolders as $subfolder) {
            $subPath = $folderPath . '/' . $subfolder->name;
            $this->addFolderToZip($zip, $subPath, $zipPrefix . $subfolder->name . '/');
        }
    }

    /**
     * Save user preferences for docs & files page
     */
    public function savePreferences(Request $request)
    {
        $validated = $request->validate([
            'view_mode' => 'required|in:grid,list',
            'sort_by' => 'required|in:name,date,size',
        ]);

        $user = auth()->user();
        $user->update([
            'docs_view_mode' => $validated['view_mode'],
            'docs_sort_by' => $validated['sort_by'],
        ]);

        return redirect()->back()->with('success', 'Preferences saved successfully.');
        // return response()->json(['success' => true]);
    }

    public function updateFolderColor(Folder $folder, Request $request)
    {
        if ($folder->user_id !== auth()->id()) {
            return redirect()->back()->with('error', 'Unauthorized');
        }

        $validated = $request->validate([
            'color' => 'required|string|in:gray,red,orange,yellow,green,blue,purple',
        ]);

        $folder->update(['color' => $validated['color']]);

        return redirect()->back()->with('success', 'color updated successfully.');
    }

    public function updateFileColor(File $file, Request $request)
    {
        if ($file->user_id !== auth()->id()) {
            return redirect()->back()->with('error', 'Unauthorized');
        }

        $validated = $request->validate([
            'color' => 'required|string|in:gray,red,orange,yellow,green,blue,purple',
        ]);

        $file->update(['color' => $validated['color']]);

        return redirect()->back()->with('success', 'color updated successfully.');
    }
}

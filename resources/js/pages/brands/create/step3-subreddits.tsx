import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import InputError from '@/components/input-error';
import { Plus, Trash2 } from 'lucide-react';
import { Step3Props } from './types';

export default function Step3Subreddits({
    data,
    errors,
    newSubreddit,
    setNewSubreddit,
    addSubreddit,
    removeSubreddit
}: Step3Props) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Target Subreddits ({data.subreddits.length}/20)</h3>
                <Button
                    type="button"
                    onClick={addSubreddit}
                    disabled={!newSubreddit.trim() || data.subreddits.length >= 20}
                    size="sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subreddit
                </Button>
            </div>

            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="new-subreddit">Add New Subreddit</Label>
                    <div className="flex gap-2">
                        <Input
                            id="new-subreddit"
                            value={newSubreddit}
                            onChange={(e) => setNewSubreddit(e.target.value)}
                            placeholder="e.g., technology, marketing, startups"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Enter subreddit names without the "r/" prefix
                    </p>
                </div>

                {data.subreddits.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-medium">Selected Subreddits</h4>
                        <div className="grid gap-2 max-h-64 overflow-y-auto">
                            {data.subreddits.map((subreddit, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">r/{subreddit}</Badge>
                                        <span className="text-sm text-green-600">Approved</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSubreddit(index)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <InputError message={errors.subreddits} />
            </div>
        </div>
    );
}

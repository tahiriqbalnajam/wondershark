import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CountrySelector } from '@/components/ui/country-selector';
import { router } from '@inertiajs/react';

interface AddPromptDialogProps {
  brandId?: number;
  className?: string;
  onPromptAdd?: (prompt: string, countryCode: string) => void;
}

export function AddPromptDialog({ brandId, className, onPromptAdd }: AddPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || !countryCode) return;

    // If we have a brandId, save to database
    if (brandId) {
      setLoading(true);
      
      try {
        router.post('/api/brand-prompts', {
          brand_id: brandId,
          prompt: prompt.trim(),
          country_code: countryCode,
        }, {
          preserveState: true,
          onSuccess: () => {
            setPrompt('');
            setCountryCode('');
            setOpen(false);
          },
          onFinish: () => setLoading(false),
        });
      } catch (error) {
        console.error('Error adding prompt:', error);
        setLoading(false);
      }
    } else {
      // For new brands, use the callback function
      if (onPromptAdd) {
        onPromptAdd(prompt.trim(), countryCode);
        setPrompt('');
        setCountryCode('');
        setOpen(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Prompt
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Prompt</DialogTitle>
          <DialogDescription>
            Add a custom marketing prompt for your brand with country targeting.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Enter your marketing prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 min-h-[120px]"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="country">IP Address (Country)</Label>
            <CountrySelector
              value={countryCode}
              onValueChange={setCountryCode}
              placeholder="Search country..."
              className="mt-1"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !prompt.trim() || !countryCode}
            >
              {loading ? 'Adding...' : 'Add Prompt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

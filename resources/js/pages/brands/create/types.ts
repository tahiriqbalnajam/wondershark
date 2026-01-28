export type BrandForm = {
    name: string;
    website: string;
    description: string;
    trackedName : string;
    allies : string[];
    country: string;
    prompts: string[] | BrandPrompt[];
    subreddits: string[];
    competitors: Competitor[];
    monthly_posts: number;
    brand_email: string;
    brand_password: string;
    create_account: boolean;
    ai_providers: string[];
};

export type Competitor = {
    id: number;
    name: string;
    domain: string;
    trackedName : string;
    allies : string[];
    mentions: number;
    status: 'suggested' | 'accepted' | 'rejected';
    source: 'ai' | 'manual';
};

export type BrandPrompt = {
    id: number;
    prompt: string;
    source: string;
    ai_provider: string;
    is_selected: boolean;
    status?: 'suggested' | 'active' | 'inactive'; // Add status field
    order: number;
    created_at?: string;
    // Stats fields
    visibility?: number | string;
    sentiment?: number | string;
    position?: number | string;
    mentions?: number;
    volume?: number;
    location?: string;
};

export type AiModel = {
    id: number;
    name: string;
    display_name: string;
    is_enabled: boolean;
    prompts_per_brand: number;
};

export type StepProps = {
    data: BrandForm;
    setData: (key: keyof BrandForm, value: BrandForm[keyof BrandForm]) => void;
    errors: Partial<Record<keyof BrandForm, string>>;
    nextStep: () => void;
    prevStep: () => void;
    currentStep: number;
    totalSteps: number;
};

export type Step2Props = StepProps & {
    isGeneratingPrompts: boolean;
    aiGeneratedPrompts: BrandPrompt[];
    generateAIPrompts: () => Promise<void>;
    acceptPrompt: (prompt: BrandPrompt) => void;
    rejectPrompt: (prompt: BrandPrompt) => void;
    removeAcceptedPrompt: (promptText: string) => void;
    isPromptAccepted: (prompt: BrandPrompt) => boolean;
    isPromptRejected: (prompt: BrandPrompt) => boolean;
    handleManualPromptAdd: (prompt: string) => void;
    removePrompt: (index: number) => void;
    aiModels: AiModel[];
    brandId?: number;
    existingPrompts: BrandPrompt[];
};

export type Step3Props = StepProps & {
    newSubreddit: string;
    setNewSubreddit: (value: string) => void;
    addSubreddit: () => void;
    removeSubreddit: (index: number) => void;
};

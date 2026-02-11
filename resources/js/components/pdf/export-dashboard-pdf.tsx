import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { domToPng } from 'modern-screenshot';

interface Prompt {
    id: number;
    prompt: string;
    ai_response?: string;
    sentiment?: string;
    position?: number;
    visibility?: number;
    is_active: boolean;
    analysis_completed_at?: string;
    ai_model?: {
        id: number;
        name: string;
        display_name: string;
        icon?: string;
        provider?: string;
    };
    prompt_resources?: Array<{
        url: string;
        type: string;
        title: string;
        description: string;
        domain: string;
        is_competitor_url: boolean;
    }>;
}

interface IndustryRankingItem {
    brand: string;
    position: number;
    sentiment: string;
    visibility: string;
}

interface ExportDashboardPDFProps {
    brandName?: string;
    logoUrl?: string;
    dateRange?: string;
    aiModel?: string;
    industryRanking: IndustryRankingItem[];
    prompts: Prompt[];
    fileName?: string;
    autoTrigger?: boolean;
    onBeforeCapture?: () => Promise<(() => void) | null>;
}

export const ExportDashboardPDF: React.FC<ExportDashboardPDFProps> = ({
    brandName = 'All Brands',
    logoUrl,
    dateRange = '30 days',
    aiModel = 'All AI Models',
    industryRanking,
    prompts,
    fileName = 'dashboard-report.pdf',
    autoTrigger = false,
    onBeforeCapture,
}) => {
    const [isClient, setIsClient] = useState(false);
    const [PDFDownloadLink, setPDFDownloadLink] = useState<any>(null);
    const [DashboardPDF, setDashboardPDF] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isManualGeneration, setIsManualGeneration] = useState(false);
    const [hasTriggered, setHasTriggered] = useState(false);
    const [chartImages, setChartImages] = useState<{
        visibilityChart?: string;
        industryRankingTable?: string;
        citationsSection?: string;
    }>({});

    useEffect(() => {
        setIsClient(true);

        // Dynamically import react-pdf components only on client side
        import('@react-pdf/renderer').then((module) => {
            setPDFDownloadLink(() => module.PDFDownloadLink);
        });

        import('./dashboard-pdf').then((module) => {
            setDashboardPDF(() => module.DashboardPDF);
        });
    }, []);

    const handleManualExport = () => {
        if (isGenerating) return;
        
        setIsGenerating(true);
        setIsManualGeneration(true);
        
        // Add delay for manual click
        setTimeout(() => {
            captureScreenshots(true);
        }, 1000); // 1 second delay for manual clicks
    };

    const captureScreenshots = async (manual = true) => {
        console.log('Capturing screenshots...', { autoTrigger, isClient, PDFDownloadLink: !!PDFDownloadLink, DashboardPDF: !!DashboardPDF, manual });
        if (!manual) {
            setIsGenerating(true);
            setIsManualGeneration(manual);
        }

        let restoreFunction: (() => void) | null = null;

        try {
            // Handle citation expansion before capture
            if (onBeforeCapture) {
                console.log('Calling onBeforeCapture to expand citations...');
                restoreFunction = await onBeforeCapture();
                console.log('Citations expanded, proceeding with capture');
            }

            const images: any = {};

            // Hide "Show All" buttons and other elements before screenshot
            const hideElements = document.querySelectorAll('.pdf-export-hidden, .print\\:hidden');
            console.log('Hiding', hideElements.length, 'elements for PDF export');
            
            const originalStyles: string[] = [];
            hideElements.forEach((el, index) => {
                const element = el as HTMLElement;
                originalStyles[index] = element.style.display;
                element.style.setProperty('display', 'none', 'important');
            });

            // Small delay to ensure elements are hidden
            await new Promise(resolve => setTimeout(resolve, 100));

            // Capture Visibility Chart
            const visibilityElement = document.querySelector('[data-chart="visibility"]') as HTMLElement;
            if (visibilityElement) {
                const dataUrl = await domToPng(visibilityElement, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                });
                images.visibilityChart = dataUrl;
            }

            // Capture Industry Ranking Table  
            const rankingElement = document.querySelector('[data-table="industry-ranking"]') as HTMLElement;
            if (rankingElement) {
                const dataUrl = await domToPng(rankingElement, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                });
                images.industryRankingTable = dataUrl;
            }

            // Capture AI Citations Section
            const citationsElement = document.querySelector('[data-section="ai-citations"]') as HTMLElement;
            if (citationsElement) {
                const dataUrl = await domToPng(citationsElement, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    height: Math.min(citationsElement.scrollHeight, 1200),
                });
                images.citationsSection = dataUrl;
            }

            // Restore hidden elements to their original state
            console.log('Restoring', hideElements.length, 'elements after PDF export');
            hideElements.forEach((el, index) => {
                const element = el as HTMLElement;
                if (originalStyles[index]) {
                    element.style.display = originalStyles[index];
                } else {
                    element.style.removeProperty('display');
                }
            });

            // Restore citation pagination if needed
            if (restoreFunction) {
                console.log('Restoring citation pagination...');
                setTimeout(() => restoreFunction!(), 50);
            }

            setChartImages(images);
            setIsGenerating(false);
            setIsManualGeneration(false);

            // Trigger PDF download after screenshots are captured
            setTimeout(() => {
                const link = document.querySelector('a[download]') as HTMLAnchorElement;
                if (link) link.click();
            }, 100);
        } catch (error) {
            console.error('Error capturing screenshots:', error);
            
            // Restore citation pagination even on error
            if (restoreFunction) {
                console.log('Restoring citation pagination due to error...');
                restoreFunction();
            }
            
            setIsGenerating(false);
            setIsManualGeneration(false);
            alert('Error generating PDF: ' + (error as Error).message);
        }
    };

    // Auto-trigger PDF generation when components are loaded and autoTrigger is true
    useEffect(() => {
        console.log('Auto-trigger useEffect running:', { autoTrigger, isClient, PDFDownloadLink: !!PDFDownloadLink, DashboardPDF: !!DashboardPDF, isGenerating, hasTriggered });
        if (autoTrigger && isClient && PDFDownloadLink && DashboardPDF && !isGenerating && !hasTriggered) {
            console.log('Auto-triggering PDF generation...');
            setHasTriggered(true);
            // Small delay to ensure DOM elements are rendered
            setTimeout(() => {
                captureScreenshots(false); // false = not manual
            }, 1500); // Increased delay to ensure charts are loaded
        }
    }, [autoTrigger, isClient, PDFDownloadLink, DashboardPDF, isGenerating, hasTriggered]);

    if (!isClient || !PDFDownloadLink || !DashboardPDF) {
        return (
            <Button
                variant="default"
                size="sm"
                disabled
                className="gap-2 primary-btn"
                style={{ backgroundColor: 'var(--orange-1)', color: 'white' }}
            >
                <Download className="h-4 w-4" />
                Export as PDF
            </Button>
        );
    }

    const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <>
            <Button
                variant="default"
                size="sm"
                onClick={handleManualExport}
                disabled={isGenerating && isManualGeneration}
                className="gap-2 primary-btn"
                style={{ backgroundColor: 'var(--orange-1)', color: 'white' }}
            >
                {(isGenerating && isManualGeneration) ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating PDF...
                    </>
                ) : (
                    <>
                        <Download className="h-4 w-4" />
                        Export as PDF
                    </>
                )}
            </Button>

            {/* Hidden PDFDownloadLink - triggered programmatically after screenshots */}
            {Object.keys(chartImages).length > 0 && (
                <PDFDownloadLink
                    document={
                        <DashboardPDF
                            brandName={brandName}
                            logoUrl={logoUrl}
                            dateRange={dateRange}
                            aiModel={aiModel}
                            industryRanking={industryRanking}
                            prompts={prompts}
                            generatedDate={generatedDate}
                            chartImages={chartImages}
                        />
                    }
                    fileName={fileName}
                    style={{ display: 'none' }}
                >
                    {({ blob, url, loading, error }: any) => 'Download'}
                </PDFDownloadLink>
            )}
        </>
    );
};

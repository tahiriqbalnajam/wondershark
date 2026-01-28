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
    dateRange?: string;
    aiModel?: string;
    industryRanking: IndustryRankingItem[];
    prompts: Prompt[];
    fileName?: string;
}

export const ExportDashboardPDF: React.FC<ExportDashboardPDFProps> = ({
    brandName = 'All Brands',
    dateRange = '30 days',
    aiModel = 'All AI Models',
    industryRanking,
    prompts,
    fileName = 'dashboard-report.pdf',
}) => {
    const [isClient, setIsClient] = useState(false);
    const [PDFDownloadLink, setPDFDownloadLink] = useState<any>(null);
    const [DashboardPDF, setDashboardPDF] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
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

    const captureScreenshots = async () => {
        setIsGenerating(true);
        const images: any = {};

        try {
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

            setChartImages(images);
            setIsGenerating(false);

            // Trigger PDF download after screenshots are captured
            setTimeout(() => {
                const link = document.querySelector('a[download]') as HTMLAnchorElement;
                if (link) link.click();
            }, 100);
        } catch (error) {
            console.error('Error capturing screenshots:', error);
            setIsGenerating(false);
            alert('Error generating PDF: ' + (error as Error).message);
        }
    };

    if (!isClient || !PDFDownloadLink || !DashboardPDF) {
        return (
            <Button
                variant="default"
                size="sm"
                disabled
                className="gap-2"
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
                onClick={captureScreenshots}
                disabled={isGenerating}
                className="gap-2"
                style={{ backgroundColor: 'var(--orange-1)', color: 'white' }}
            >
                {isGenerating ? (
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

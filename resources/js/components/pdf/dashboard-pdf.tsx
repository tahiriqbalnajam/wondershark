import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    Image,
} from '@react-pdf/renderer';

// Register fonts (optional - using default fonts)
Font.register({
    family: 'Roboto',
    fonts: [
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
            fontWeight: 300,
        },
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
            fontWeight: 400,
        },
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
            fontWeight: 500,
        },
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
            fontWeight: 700,
        },
    ],
});

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Roboto',
    },
    header: {
        marginBottom: 20,
        borderBottom: '1 solid #E5E7EB',
        paddingBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 5,
        display:'flex',
        alignItems:'center',
        gap:'10px',
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 3,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 10,
        borderBottom: '1 solid #E5E7EB',
        paddingBottom: 5,
    },
    sectionDescription: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 10,
    },
    chartBox: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius:10,
        padding: 12,
        backgroundColor: "#E9E9E9",
        boxShadow: "0 0 15px 0 rgba(0,0,0,0.15)"
    },
    chartImage: {
        width: "100%",
        height: "auto",
        borderRadius:5,
    },
    chartPlaceholder: {
        backgroundColor: '#F3F4F6',
        padding: 20,
        borderRadius: 8,
        border: '1 solid #E5E7EB',
        marginBottom: 15,
    },
    chartText: {
        fontSize: 10,
        color: '#6B7280',
        textAlign: 'center',
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        minHeight: 30,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        fontWeight: 700,
    },
    tableCol: {
        padding: 8,
        fontSize: 10,
    },
    tableColRank: {
        width: '10%',
    },
    tableColBrand: {
        width: '30%',
    },
    tableColPosition: {
        width: '15%',
    },
    tableColSentiment: {
        width: '20%',
    },
    tableColVisibility: {
        width: '25%',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 500,
        textAlign: 'center',
    },
    badgePositive: {
        backgroundColor: '#D1FAE5',
        color: '#065F46',
    },
    badgeNeutral: {
        backgroundColor: '#FEF3C7',
        color: '#92400E',
    },
    badgeNegative: {
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
    },
    badgeHigh: {
        backgroundColor: '#DBEAFE',
        color: '#1E40AF',
    },
    badgeMedium: {
        backgroundColor: '#FED7AA',
        color: '#9A3412',
    },
    badgeLow: {
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
    },
    citationsGrid: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    citationCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        border: '1 solid #E5E7EB',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    citationHeader: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    citationAiModel: {
        fontSize: 8,
        color: '#6B7280',
        fontWeight: 500,
    },
    citationPrompt: {
        fontSize: 10,
        fontWeight: 600,
        color: '#111827',
        marginBottom: 5,
    },
    citationResponse: {
        fontSize: 8,
        color: '#4B5563',
        lineHeight: 1.4,
    },
    citationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1 solid #F3F4F6',
    },
    citationDate: {
        fontSize: 7,
        color: '#9CA3AF',
    },
    emptyState: {
        padding: 40,
        textAlign: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        border: '1 solid #E5E7EB',
    },
    emptyStateText: {
        fontSize: 11,
        color: '#6B7280',
    },
    footer: {
        marginTop: 20,
        textAlign: 'center',
        fontSize: 8,
        color: '#9CA3AF',
        borderTop: '1 solid #E5E7EB',
        paddingTop: 10,
    },
});

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

interface DashboardPDFProps {
    brandName?: string;
    logoUrl?: string;
    dateRange?: string;
    aiModel?: string;
    industryRanking: IndustryRankingItem[];
    prompts: Prompt[];
    generatedDate?: string;
    chartImages?: {
        visibilityChart?: string;
        industryRankingTable?: string;
        citationsSection?: string;
    };
}

// Helper function to strip HTML
const stripHtml = (html: string | undefined): string => {
    if (!html) return '';

    let cleanText = html;
    cleanText = cleanText.replace(/HTML_RESPONSE_START/gi, '');
    cleanText = cleanText.replace(/HTML_RESPONSE_END/gi, '');
    cleanText = cleanText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleanText = cleanText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanText = cleanText.replace(/<[^>]+>/g, '');
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    return cleanText;
};

// Helper to get sentiment badge style
const getSentimentBadgeStyle = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
        case 'positive':
            return styles.badgePositive;
        case 'neutral':
            return styles.badgeNeutral;
        case 'negative':
            return styles.badgeNegative;
        default:
            return styles.badgeNeutral;
    }
};

// Helper to get visibility badge style
const getVisibilityBadgeStyle = (visibility: string) => {
    switch (visibility.toLowerCase()) {
        case 'high':
            return styles.badgeHigh;
        case 'medium':
            return styles.badgeMedium;
        case 'low':
            return styles.badgeLow;
        default:
            return styles.badgeNeutral;
    }
};

export const DashboardPDF: React.FC<DashboardPDFProps> = ({
    brandName = 'All Brands',
    logoUrl,
    dateRange = '30 days',
    aiModel = 'All AI Models',
    industryRanking,
    prompts,
    generatedDate = new Date().toLocaleDateString(),
    chartImages,
}) => {
    // Format date for citations
    const formatCitationDate = (dateString?: string): string => {
        if (!dateString) return 'Not analyzed';

        const now = new Date();
        const analysisDate = new Date(dateString);
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const analysisMidnight = new Date(analysisDate.getFullYear(), analysisDate.getMonth(), analysisDate.getDate());
        const daysAgo = Math.floor((todayMidnight.getTime() - analysisMidnight.getTime()) / (1000 * 60 * 60 * 24));

        if (daysAgo === 0) return 'Today';
        if (daysAgo === 1) return 'Yesterday';
        return `${daysAgo} days ago`;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={{ flex: 1, flexDirection: 'column' }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                            <Image src={logoUrl || "/images/StackInfluence.png"} style={{ width: 24, height: 24, marginRight: 10 }} />
                            <Text style={styles.title}>{brandName} – AI Brand Visibility Dashboard</Text>
                        </View>
                        <Text style={styles.subtitle}>Generated: {generatedDate}</Text>
                        {/* 
                        <Text style={styles.subtitle}>Date Range: {dateRange}</Text>
                        <Text style={styles.subtitle}>AI Model: {aiModel}</Text>
                        <Text style={styles.subtitle}>Generated: {generatedDate}</Text> */}
                    </View>

                    {/* Visibility Section */}
                    <View style={[styles.section, { flex: 1 }]}>
                        {/* <Text style={styles.sectionTitle}>Visibility</Text>
                        <Text style={styles.sectionDescription}>
                            Percentage of chats mentioning each brand
                        </Text> */}


                        {chartImages?.visibilityChart ? (
                        <View style={styles.chartBox}> <Image src={chartImages.visibilityChart} style={styles.chartImage} /> </View>
                        ) : industryRanking.length === 0 ? (
                            <View style={styles.chartPlaceholder}>
                                <Text style={styles.chartText}>
                                    The system is currently analyzing visibility data. Please check back later.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.table}>
                                {/* Table Header */}
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                    <Text style={[styles.tableCol, styles.tableColRank]}>#</Text>
                                    <Text style={[styles.tableCol, styles.tableColBrand]}>Brand</Text>
                                    <Text style={[styles.tableCol, styles.tableColVisibility]}>Visibility %</Text>
                                </View>

                                {/* Table Rows - Sorted by visibility */}
                                {industryRanking
                                    .sort((a, b) => {
                                        // Try to extract numeric value from visibility string
                                        const aNum = parseFloat(a.visibility) || 0;
                                        const bNum = parseFloat(b.visibility) || 0;
                                        return bNum - aNum;
                                    })
                                    .slice(0, 8)
                                    .map((item, index) => (
                                        <View key={index} style={styles.tableRow}>
                                            <Text style={[styles.tableCol, styles.tableColRank]}>{index + 1}</Text>
                                            <Text style={[styles.tableCol, styles.tableColBrand]}>{item.brand}</Text>
                                            <Text style={[styles.tableCol, styles.tableColVisibility]}>
                                                <Text style={[styles.badge, getVisibilityBadgeStyle(item.visibility)]}>
                                                    {item.visibility}
                                                </Text>
                                            </Text>
                                        </View>
                                    ))}
                            </View>
                        )}
                    </View>

                    {/* Footer */}
                    <Text style={styles.footer}>
                        Wondershark Dashboard Report - Page 1
                    </Text>
                </View>
            </Page>

            {/* Brand Visibility Index - Page 2 */}
            <Page size="A4" style={styles.page}>
                <View style={{ flex: 1, flexDirection: 'column' }}>
                    {/* Industry Ranking Section */}
                    <View style={[styles.section, { flex: 1 }]}>
                    {/* <Text style={styles.sectionTitle}>Industry Ranking</Text>
                    <Text style={styles.sectionDescription}>
                        Brands with highest visibility
                    </Text> */}


                    {chartImages?.industryRankingTable ? (
                        <View style={styles.chartBox}><Image src={chartImages.industryRankingTable} style={styles.chartImage} /></View>
                    ) : industryRanking.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>
                                The system is currently analyzing industry rankings. Results will be displayed shortly.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.table}>
                            {/* Table Header */}
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={[styles.tableCol, styles.tableColRank]}>#</Text>
                                <Text style={[styles.tableCol, styles.tableColBrand]}>Brand</Text>
                                <Text style={[styles.tableCol, styles.tableColPosition]}>Position</Text>
                                <Text style={[styles.tableCol, styles.tableColSentiment]}>Sentiment</Text>
                                <Text style={[styles.tableCol, styles.tableColVisibility]}>Visibility</Text>
                            </View>

                            {/* Table Rows */}
                            {industryRanking.slice(0, 8).map((item, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.tableCol, styles.tableColRank]}>{index + 1}</Text>
                                    <Text style={[styles.tableCol, styles.tableColBrand]}>{item.brand}</Text>
                                    <Text style={[styles.tableCol, styles.tableColPosition]}>#{item.position}</Text>
                                    <Text style={[styles.tableCol, styles.tableColSentiment]}>
                                        <Text style={[styles.badge, getSentimentBadgeStyle(item.sentiment)]}>
                                            {item.sentiment}
                                        </Text>
                                    </Text>
                                    <Text style={[styles.tableCol, styles.tableColVisibility]}>
                                        <Text style={[styles.badge, getVisibilityBadgeStyle(item.visibility)]}>
                                            {item.visibility}
                                        </Text>
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                    </View>

                    {/* Footer */}
                    <Text style={styles.footer}>
                        Wondershark Dashboard Report - Page 2
                    </Text>
                </View>
            </Page>

            {/* AI Citations Section - Page 3 - Only render if there's content */}
            {(chartImages?.citationsSection || prompts.length > 0) && (
                <Page size="A4" style={styles.page}>
                    <View style={{ flex: 1, flexDirection: 'column' }}>
                        <View style={styles.header}>
                        <Text style={styles.title}>AI Citations</Text>
                            <Text style={styles.subtitle}>Analysis results from AI models</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                            {chartImages?.citationsSection ? (
                        <View style={styles.chartBox}><Image src={chartImages.citationsSection} style={styles.chartImage} /></View>
                    ) : prompts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            No AI citations found for this filter.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.citationsGrid}>
                        {prompts.slice(0, 10).map((prompt, index) => (
                            <View key={prompt.id} style={styles.citationCard}>
                                <View style={styles.citationHeader}>
                                    <Text style={styles.citationAiModel}>
                                        {prompt.ai_model?.display_name || 'AI'}
                                    </Text>
                                </View>

                                <Text style={styles.citationPrompt}>
                                    {prompt.prompt.length > 80
                                        ? prompt.prompt.substring(0, 80) + '...'
                                        : prompt.prompt}
                                </Text>

                                <Text style={styles.citationResponse}>
                                    {stripHtml(prompt.ai_response).substring(0, 150)}
                                    {stripHtml(prompt.ai_response).length > 150 ? '...' : ''}
                                </Text>

                                <View style={styles.citationFooter}>
                                    <Text style={styles.citationDate}>
                                        {formatCitationDate(prompt.analysis_completed_at)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {prompts.length > 10 && (
                    <View style={{ marginTop: 15, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8 }}>
                        <Text style={{ fontSize: 9, color: '#6B7280', textAlign: 'center' }}>
                            Showing first 10 of {prompts.length} citations. View full list in the online dashboard.
                            </Text>
                        </View>
                    )}
                        </View>

                        {/* Footer */}
                        <Text style={styles.footer}>
                            Wondershark Dashboard Report - Page 3
                        </Text>
                    </View>
                </Page>
            )}
        </Document>
    );
};

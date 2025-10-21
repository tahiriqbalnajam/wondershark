import { Card, CardContent } from "@/components/ui/card";

export function AiCitations() {
    const citationsData = [
        {
            icon: "https://www.google.com/favicon.ico",
            title: "Most reliable online tools for converting Word...",
            description:
                "Reliable online Word to PDF converters for preserving formatting include Adobe Acrobat Online, PDFgear...",
            date: "5 days ago",
            rank: 3,
            logos: [
                "https://static.vecteezy.com/system/resources/previews/049/932/690/large_2x/adobe-acrobat-reader-mobile-application-icon-free-vector.jpg",
                "https://static.vecteezy.com/system/resources/previews/067/344/545/non_2x/creative-fox-with-thunder-tail-logo-free-vector.jpg",
                "https://static.vecteezy.com/system/resources/previews/042/158/725/non_2x/google-drawings-logo-icon-free-vector.jpg",
                "https://www.google.com/favicon.ico",
            ],
            score: 74,
        },
        {
            icon: "https://www.google.com/favicon.ico",
            title: "Top AI tools for generating content efficiently",
            description:
                "Discover the best AI writing assistants and tools that help generate blog posts, social content, and more.",
            date: "3 days ago",
            rank: 5,
            logos: [
                "https://static.vecteezy.com/system/resources/previews/049/932/690/large_2x/adobe-acrobat-reader-mobile-application-icon-free-vector.jpg",
                "https://static.vecteezy.com/system/resources/previews/067/344/545/non_2x/creative-fox-with-thunder-tail-logo-free-vector.jpg",
                "https://static.vecteezy.com/system/resources/previews/042/158/725/non_2x/google-drawings-logo-icon-free-vector.jpg",
                "https://www.google.com/favicon.ico",
            ],
            score: 89,
        },
        {
            icon: "https://www.google.com/favicon.ico",
            title: "Best image generation platforms for creators",
            description:
                "AI image generators like Midjourney and DALL·E 3 redefine creativity for artists and brands alike.",
            date: "1 day ago",
            rank: 2,
            logos: [
                "https://static.vecteezy.com/system/resources/previews/049/932/690/large_2x/adobe-acrobat-reader-mobile-application-icon-free-vector.jpg",
                "https://static.vecteezy.com/system/resources/previews/067/344/545/non_2x/creative-fox-with-thunder-tail-logo-free-vector.jpg",
                "https://static.vecteezy.com/system/resources/previews/042/158/725/non_2x/google-drawings-logo-icon-free-vector.jpg",
                "https://www.google.com/favicon.ico",
            ],
            score: 92,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {citationsData.map((item, index) => (
                <Card
                    key={index}
                    className="flex flex-col rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 bg-white"
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                        <img src={item.icon} alt="favicon" className="w-6 h-6 rounded-full" />
                        <span className="text-sm text-muted-foreground">{item.date}</span>
                    </div>

                    {/* Body */}
                    <CardContent className="p-0">
                        <h3 className="text-lg font-semibold leading-snug text-foreground">
                            {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                #{item.rank}
                            </span>

                            {item.logos.map((logo, i) => (
                                <img
                                    key={i}
                                    src={logo}
                                    alt={`logo-${i}`}
                                    className="w-6 h-6 rounded-md border object-cover"
                                />
                            ))}

                            <span className="flex items-center gap-1 text-xs font-semibold bg-muted px-2 py-1 rounded-md ml-auto">
                                <span className="text-green-600">▮</span> {item.score}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Info, Infinity, Ban, Hash } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { toast } from "sonner";

type FeatureMap = Record<string, Record<string, string | null>>;

interface Props {
    plans: string[];
    featureKeys: string[];
    features: FeatureMap;
    flash?: {
        success?: string;
        error?: string;
    };
}

const PLAN_LABELS: Record<string, string> = {
    trial: "Trial",
    free: "Free",
    agency_growth: "Agency Growth",
    agency_unlimited: "Agency Unlimited",
};

const FEATURE_LABELS: Record<string, string> = {
    price: "Price (USD)",
    brands_covered: "Brands Covered",
    competitor_analysis: "Competitor Analysis",
    monthly_posts: "Monthly Posts",
    ai_models_access: "AI Models Access",
    search_analytics: "Search Analytics",
    docs_files: "Docs & Files",
    agency_members: "Agency Members",
    brand_users: "Brand Users",
    api_access: "API Access",
    white_label: "White Label",
    priority_support: "Priority Support",
};

function valueHint(value: string | null) {
    if (value === null) return <span className="text-xs text-muted-foreground">not set</span>;
    if (value === "0") return <Badge variant="destructive" className="text-xs"><Ban className="w-3 h-3 mr-1" />Disabled</Badge>;
    if (value === null || value === "") return <Badge variant="outline" className="text-xs"><Infinity className="w-3 h-3 mr-1" />Unlimited</Badge>;
    return <Badge variant="secondary" className="text-xs"><Hash className="w-3 h-3 mr-1" />{value}</Badge>;
}

export default function PlanFeaturesIndex({ plans, featureKeys, features, flash }: Props) {
    // Local editable state: featureKey => planName => value string
    const [values, setValues] = useState<FeatureMap>(() => {
        const copy: FeatureMap = {};
        for (const key of featureKeys) {
            copy[key] = {};
            for (const plan of plans) {
                copy[key][plan] = features[key]?.[plan] ?? "";
            }
        }
        return copy;
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleChange = (featureKey: string, plan: string, val: string) => {
        setValues((prev) => ({
            ...prev,
            [featureKey]: {
                ...prev[featureKey],
                [plan]: val,
            },
        }));
    };

    const handleSave = () => {
        setSaving(true);
        const payload: { plan_name: string; feature_key: string; value: string | null }[] = [];

        for (const featureKey of featureKeys) {
            for (const plan of plans) {
                const raw = values[featureKey]?.[plan] ?? "";
                // Empty string => unlimited (null in DB)
                payload.push({
                    plan_name: plan,
                    feature_key: featureKey,
                    value: raw === "" ? null : raw,
                });
            }
        }

        router.post(
            route("admin.plan-features.update"),
            { features: payload },
            {
                onFinish: () => setSaving(false),
                preserveScroll: true,
            }
        );
    };

    return (
        <AppLayout>
            <Head title="Plan Features Management" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                                Plan Features Management
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage feature limits per subscription plan.
                            </p>
                        </div>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Saving..." : "Save All"}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Feature Matrix</CardTitle>
                            <CardDescription className="flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                    Leave a cell <strong>empty</strong> for unlimited access, enter{" "}
                                    <code className="bg-muted px-1 rounded">0</code> to disable, or a
                                    number to set a limit. Changes apply after saving.
                                </span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-48 min-w-[12rem]">Feature</TableHead>
                                            {plans.map((plan) => (
                                                <TableHead key={plan} className="text-center min-w-[9rem]">
                                                    {PLAN_LABELS[plan] ?? plan}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {featureKeys.map((featureKey) => (
                                            <TableRow key={featureKey}>
                                                <TableCell className="font-medium">
                                                    <div>
                                                        {FEATURE_LABELS[featureKey] ?? featureKey}
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            {featureKey}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                {plans.map((plan) => {
                                                    const val = values[featureKey]?.[plan] ?? "";
                                                    return (
                                                        <TableCell key={plan} className="text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <Input
                                                                    className="w-28 text-center text-sm"
                                                                    placeholder="unlimited"
                                                                    value={val}
                                                                    onChange={(e) =>
                                                                        handleChange(featureKey, plan, e.target.value)
                                                                    }
                                                                />
                                                                {valueHint(val === "" ? null : val)}
                                                            </div>
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Value Reference</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline"><Infinity className="w-3 h-3 mr-1" />Unlimited</Badge>
                                    <span className="text-muted-foreground">— leave empty</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Disabled</Badge>
                                    <span className="text-muted-foreground">— enter <code className="bg-muted px-1 rounded">0</code></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary"><Hash className="w-3 h-3 mr-1" />5</Badge>
                                    <span className="text-muted-foreground">— enter a number (e.g. <code className="bg-muted px-1 rounded">5</code>)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

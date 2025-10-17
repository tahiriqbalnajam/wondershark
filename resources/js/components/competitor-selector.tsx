import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { Link } from '@inertiajs/react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Brand {
    id: number;
    name: string;
    website: string;
}

interface Props {
    brands?: Brand[];
}

export default function CompetitorsIndex({ brands = [] }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Competitors', href: '' }
            ]}
        >
            <Head title="Competitor Analysis" />

                
            <Drawer direction="right">
                <div className="mx-auto py-6 space-y-6">
                    <Card>
                        <CardHeader>
                            {/* <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Select a Brand to Analyze Competitors
                            </CardTitle> */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">Suggested Competitors <span className='text-gray-400 font-normal text-sm'>- 10+</span></h2>
                                
                                <DrawerTrigger asChild>
                                    <Button variant="outline">Open Drawer</Button>
                                </DrawerTrigger>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {brands.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {brands.map((brand) => (
                                        <Card key={brand.id} className="hover:shadow-md transition-shadow pb-0 justify-between">
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2 competitor-title">
                                                    <span><Building2 className="h-4 w-4" /></span>
                                                    {brand.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className='p-0'>
                                                <p className="text-sm text-gray-600 mx-6 my-3">{brand.website}</p>
                                                <div className="buttons-wrapp flex items-center justify-between">
                                                    <p className="text-sm text-gray-600">27 Mentions</p>
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button asChild className="">
                                                            <Link href={route('competitors.index', { brand: brand.id })}>
                                                                Track
                                                            </Link>
                                                        </Button>
                                                        <Button asChild className="cancel-btn">
                                                            <Link href='/'>
                                                                Cancel
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 mb-4">No brands available for competitor analysis.</p>
                                    <Button asChild>
                                        <Link href="/brands/create">
                                            Create Your First Brand
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            {/* <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Select a Brand to Analyze Competitors
                            </CardTitle> */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">Your Competitors</h2>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {brands.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {brands.map((brand) => (
                                        <Card key={brand.id} className="hover:shadow-md transition-shadow pb-0 justify-between">
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2 competitor-title">
                                                    <span><Building2 className="h-4 w-4" /></span>
                                                    {brand.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className='p-0'>
                                                <p className="text-sm text-gray-600 mx-6 my-3">{brand.website}</p>
                                                <div className="buttons-wrapp flex items-center justify-between">
                                                    <p className="text-sm text-gray-600">27 Mentions</p>
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button asChild className="cancel-btn">
                                                            <Link href='/'>
                                                                Delete
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 mb-4">No brands available for competitor analysis.</p>
                                    <Button asChild>
                                        <Link href="/brands/create">
                                            Create Your First Brand
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <DrawerContent className="w-[25%] right-0 left-auto top-0 bottom-0 m-0 rounded-bl-md items-center Create-Competitor">
                        <div className="mx-auto w-full max-w-sm">
                            <DrawerHeader className='p-0 mb-5'>
                                <DrawerTitle className="text-xl font-semibold mb-6 mt-10">Create Competitor</DrawerTitle>
                            </DrawerHeader>
                            <div className="flex items-center w-full">
                                <form className="w-full">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input id="name" className='form-control' type="text" placeholder="Enter your name" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" className='form-control' type="email" placeholder="you@example.com" />
                                    </div>
                                </form>
                            </div>
                            <DrawerFooter className='flex'>
                                <DrawerClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DrawerClose>
                                <Button type='submit'>Add Competitor</Button>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </div>
            </Drawer>
        </AppLayout>
    );
}
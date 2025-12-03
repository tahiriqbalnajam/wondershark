import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, SlidersHorizontal } from 'lucide-react';

import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// import { Slider } from "@/components/ui/slider"; // Component doesn't exist
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

const breadcrumbs = [
    { name: 'Dashboard', href: '/', title: 'Dashboard' },
    { name: 'Paid PR', href: '', title: 'Paid PR' },
];

const tableData = [
    {
        id: 1,
        name: "Block Telegraph",
        image: "/website_assets/qlinkimg4.png",
        rating: 4,
        price: 350,
        da: 65,
        dr: 60,
        region: "Global",
        linkInsert: "No",
        doFollow: "Yes",
    },
    {
        id: 2,
        name: "GrowthScribe.com",
        image: "/website_assets/qlinkimg4.png",
        rating: 4,
        price: 350,
        da: 65,
        dr: 60,
        region: "Global",
        linkInsert: "No",
        doFollow: "Yes",
    },
    {
        id: 3,
        name: "Hood Critic",
        image: "/website_assets/qlinkimg4.png",
        rating: 4,
        price: 350,
        da: 65,
        dr: 60,
        region: "Global",
        linkInsert: "No",
        doFollow: "Yes",
    },
    {
        id: 4,
        name: "Daily Scanner",
        image: "/website_assets/qlinkimg4.png",
        rating: 4,
        price: 350,
        da: 65,
        dr: 60,
        region: "Global",
        linkInsert: "No",
        doFollow: "Yes",
    },
    {
        id: 5,
        name: "LA Collide",
        image: "/website_assets/qlinkimg4.png",
        rating: 4,
        price: 350,
        da: 65,
        dr: 60,
        region: "Global",
        linkInsert: "No",
        doFollow: "Yes",
    },
    {
        id: 6,
        name: "Cali Post",
        image: "/website_assets/qlinkimg4.png",
        rating: 4,
        price: 350,
        da: 65,
        dr: 60,
        region: "Global",
        linkInsert: "No",
        doFollow: "Yes",
    }
];

export default function OrdersIndex() {
    const [selectAll, setSelectAll] = React.useState(false);
    const [selected, setSelected] = React.useState<number[]>([]);
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const [activeItem, setActiveItem] = React.useState<any>(null);
    const [price, setPrice] = React.useState<number>(0);
    const [range, setRange] = React.useState([0, 3000]);

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelected([]);
        } else {
            setSelected(tableData.map(item => item.id));
        }
        setSelectAll(!selectAll);
    };

    const toggleSingle = (id: number) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const RatingBars = ({ value }: { value: number }) => {
        return (
            <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                    <span
                        key={i}
                        className={`w-1 h-3 rounded ${
                            i < value ? "bg-green-500" : "bg-gray-300"
                        }`}
                    ></span>
                ))}
            </div>
        );
    };

    // Drawer open on row click
    const handleRowClick = (item: any) => {
        setActiveItem(item);
        setOpenDrawer(true);
    };
    
    
    
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Orders" />
            <div className="space-y-6">
                <div className="grid lg:grid-flow-col grid-flow-row grid-rows-1 gap-4 items-center">
                    <div className="order-heading lg:w-[80%] w-[100%]">
                        <HeadingSmall
                            title="Pricing"
                            description="Once we have published the article for you, any further edits may include an extra charge. Wondershark.ai will use reasonable good faith efforts to ensure that such article will remain publicly available for at least 12 months."
                        />
                    </div>
                    <div className='flex justify-end'>
                        <div className='order-top-link border rounded p-2'>
                            <a href="/">Video Tutorial</a>
                            <a href="/">How To</a>
                            <a href="/">Download PR Questionnaire</a>
                            <a href="/">Download TV Questionnaire</a>
                        </div>
                    </div>
                </div>
                <Card>
                    <CardContent>
                        <Tabs defaultValue="publications" className="w-full">
                            <button onClick={() => { setActiveItem(null); setOpenDrawer(true); }} className="mb-3 px-4 py-2 bg-primary text-white rounded flex gap-3 max-[130px]" >Search Filter <SlidersHorizontal className='w-4'/></button>

                            <div className="overflow-x-auto mt-4">
                                    <table className="w-full text-sm border border-gray-300 default-table">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectAll}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left">Publications</th>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left">Ai Citations Volume</th>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left">Price</th>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left">DA</th>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left">DR</th>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left">Region</th>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left">Sponsored</th>
                                                <th className="border p-3 h-12 align-middle font-medium text-muted-foreground text-left">Do Follow</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {tableData.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="border p-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.includes(item.id)}
                                                            onChange={() => toggleSingle(item.id)}
                                                        />
                                                    </td>
                                                    <td className="border p-3">
                                                        <div className="flex items-center gap-2">
                                                            <img src={item.image} className="w-5 h-5" alt="" />
                                                            {item.name}
                                                        </div>
                                                    </td>
                                                    <td className="border p-3"> <RatingBars value={item.rating} /> </td>
                                                    <td className="border p-3">${item.price}</td>
                                                    <td className="border p-3">{item.da}</td>
                                                    <td className="border p-3">{item.dr}</td>
                                                    <td className="border p-3">{item.region}</td>
                                                    <td className="border p-3">{item.linkInsert}</td>
                                                    <td className="border p-3">{item.doFollow}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                        </Tabs>
                        <Drawer open={openDrawer} data-no-drag onOpenChange={setOpenDrawer} direction="right">
                            <DrawerContent className="lg:w-[400px] w-[300px] ml-auto h-full overflow-y-auto overflow-x-hidden">
                                <div className="mx-auto w-full max-w-sm p-5">

                                    <DrawerHeader className="p-0 mb-5">
                                        <DrawerTitle className="text-xl font-semibold mb-6 mt-10">
                                            Filters
                                        </DrawerTitle>
                                    </DrawerHeader>

                                    <div className="flex items-center w-full">
                                        <form className="w-full space-y-6">
                                            <div className="space-y-2">
                                                <Label className='mb-3 block'>Publications Name</Label>
                                                <Input placeholder="Search" className='form-control'/>
                                            </div>
                                            <div className="space-y-3 mt-6" onPointerDown={(e) => e.stopPropagation()}>
                                                <Label className='mb-3 block'>Price Range</Label>
                                                <div className="flex gap-3">
                                                    <Input 
                                                        type="number" 
                                                        value={range[0]} 
                                                        onChange={(e) => setRange([parseInt(e.target.value) || 0, range[1]])}
                                                        placeholder="Min"
                                                        className="form-control"
                                                    />
                                                    <Input 
                                                        type="number" 
                                                        value={range[1]} 
                                                        onChange={(e) => setRange([range[0], parseInt(e.target.value) || 3000])}
                                                        placeholder="Max"
                                                        className="form-control"
                                                    />
                                                </div>

                                                <div className="flex justify-between text-sm text-gray-600 mt-2">
                                                    <span>${range[0]}</span>
                                                    <span>${range[1]}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className='mb-3 block'>Select Regions</Label>
                                                <Select>
                                                    <SelectTrigger className='form-control'>
                                                    <SelectValue placeholder="Select Regions" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                    <SelectItem value="us">United States</SelectItem>
                                                    <SelectItem value="eu">Europe</SelectItem>
                                                    <SelectItem value="asia">Asia</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Select Genres</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {["Web 3","Gaming","Tech","News","Music","Lifestyle","Entertainment","Luxury","Real Estate","Sports","Political","Legal","Alcohol"].map((item,i)=>(
                                                    <button key={i} type="button" className="px-3 py-2 rounded-sm text-xs bg-gray-600 text-white hover:bg-[#FF5B49]"> {item} </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Type</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {["Staff","New","Press Release","Contributor","Lowered","6 Month Lifespan","Mention","Includes Social Posts","On Hold","Guaranteed Impressions"].map((item,i)=>(
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        className="px-3 py-2 rounded-sm text-xs bg-gray-600 text-white hover:bg-[#FF5B49]"
                                                    >
                                                        {item}
                                                    </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sponsored</Label>
                                                <div className="flex gap-2">
                                                    {["Yes","No","Discrete"].map((item,i)=>(
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        className="px-3 py-2 rounded-sm text-xs bg-gray-600 text-white hover:bg-[#FF5B49]"
                                                    >
                                                        {item}
                                                    </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Niche</Label>
                                                <div className="flex gap-2 flex-wrap">
                                                    {["Discrete","Health","Crypto","Cbd","Gambling"].map((item,i)=>(
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        className="px-3 py-2 rounded-sm text-xs bg-gray-600 text-white hover:bg-[#FF5B49]"
                                                    >
                                                        {item}
                                                    </button>
                                                    ))}
                                                </div>
                                            </div>

                                        </form>
                                    </div>
                                    <DrawerFooter className="flex my-5 p-0 flex-row order-action">
                                        <Button className="bg-[#FF5B49] hover:bg-[#000000] hover:text-white w-[50%] min-[auto]: primary-btn">
                                            Save
                                        </Button>
                                        <Button variant="outline" className="w-[50%] bg-[#D9D9D9] text-[#676767] min-[auto] primary-btn">
                                            Reset all Filters
                                        </Button>
                                    </DrawerFooter>
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

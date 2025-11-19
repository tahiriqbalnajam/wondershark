import AppLogoIcon from '@/components/app-logo-icon';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    const { name, quote } = usePage<SharedData>().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="w-full lg:p-8">
                <div className="mx-auto flex flex-col justify-center space-y-6 lg:w-[450px] w-[350px]">
                    <Link href={route('home')} className="relative z-20 flex items-center justify-center lg:hidden">
                        <AppLogoIcon className="h-10 fill-current text-black sm:h-12" />
                    </Link>
                    <div className="flex flex-col gap-2 justify-center">
                        <h1 className="text-2xl text-center lg:text-3xl font-bold">{title}</h1>
                        <p className="text-sm text-center text-balance text-muted-foreground">{description}</p>
                    </div>
                    {children}
                </div>
            </div>
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-900" />
                <Link href={route('home')} className="relative z-20 flex items-center text-3xl font-bold justify-center">
                    <AppLogoIcon className="mr-2 size-10 fill-current text-white" />
                    WonderShark
                </Link>
                <div className="center-img relative z-10 flex flex-1 items-center justify-center">
                    <img src="/images/login-bg.png" alt="image" className="max-w-full h-auto object-contain" />
                </div>
                {quote && (
                    <div className="relative z-20 mt-auto  text-center">
                        <blockquote className="space-y-2">
                            <p className="text-lg">&ldquo;{quote.message}&rdquo;</p>
                            <footer className="text-sm text-neutral-300">{quote.author}</footer>
                        </blockquote>
                    </div>
                )}
            </div>
        </div>
    );
}

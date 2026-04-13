import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { StepProps } from './types';

export default function Step6AccountSetup({ }: StepProps) {
    return (
        <div className="space-y-6">
            <div className="text-center py-8">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                        <Check className="w-12 h-12 text-green-600 dark:text-green-500" />
                    </div>
                </div>

                <h3 className="text-2xl font-semibold mb-3">Ready to Complete Setup!</h3>
                <p className="text-muted-foreground text-lg mb-6 max-w-[900px] mx-auto">
                    You’ve successfully configured your brand.</p>

                 { /* <p className="text-muted-foreground text-lg mb-6 max-w-[900px] mx-auto">
                    You’ve successfully configured your brand. Select your plan and click “<b>Get Started</b>” below to activate your brand and start using the platform. An invoice will be sent to your email shortly.
                </p> 

                <div className="plan-wrapp mt-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="plan-box">
                            <div>
                                <h3>Premium Plan</h3>
                                <h2>$10,000<small>/month</small></h2>
                                <ul>
                                    <li>Popdasts</li>
                                    <li>Niche Blog Posts</li>
                                    <li>Top Publications <small>(Forbes, USA Today, ETC...)</small></li>
                                    <li>Local News Sites</li>
                                    <li>Wikipedia Links and Pages</li>
                                    <li>Reddit Posts</li>
                                </ul>
                            </div>
                            <button className="primary-btn btn-sm">Get Started</button>
                        </div>
                        <div className="plan-box feature-plan">
                            <div>
                                <h3>Base Plan</h3>
                                <h2>$5,000<small>/month</small></h2>
                                <ul>
                                    <li>Niche Blog Posts</li>
                                    <li>Local News Sites</li>
                                    <li>Wikipedia Links</li>
                                    <li>Reddit Posts</li>
                                </ul>
                            </div>
                            <button className="primary-btn btn-sm">Get Started</button>
                        </div>
                        <div className="plan-box">
                            <div>
                                <h3>100% Approved Reddit Strategy Plan</h3>
                                <h2>$2,500<small>/month</small></h2>
                                <ul>
                                    <li>10 Reddit Posts</li>
                                    <li>You Approve All Posts</li>
                                    <li>You Approve sub Reddits</li>
                                </ul>
                            </div>
                            <button className="primary-btn btn-sm">Get Started</button>
                        </div>
                        <div className="plan-box">
                            <div>
                                <h3>Full Services Reddit</h3>
                                <h2>$1,500<small>/month</small></h2>
                                <ul>
                                    <li>5 Reddit Posts</li>
                                    <li>No Approval Required</li>
                                    <li>100% on Autopilot</li>
                                </ul>
                            </div>
                            <button className="primary-btn btn-sm">Get Started</button>
                        </div>
                    </div>
                    <div className='flex justify-center mt-15'>
                        <button className="primary-btn">Contact Us</button>
                    </div>
                </div>*/ }
            </div>
        </div>
    );
}

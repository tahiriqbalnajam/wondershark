<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Models\Post;
use Illuminate\Database\Seeder;

class PostsSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        // Get first brand
        $brand = Brand::first();

        if (! $brand) {
            $this->command->info('No brands found. Please create a brand first.');

            return;
        }

        // Create some sample prompts for the brand if they don't exist
        if ($brand->prompts()->count() === 0) {
            BrandPrompt::create([
                'brand_id' => $brand->id,
                'prompt' => 'What are the best marketing strategies for small businesses?',
                'is_active' => true,
                'order' => 1,
                'position' => 1,
            ]);

            BrandPrompt::create([
                'brand_id' => $brand->id,
                'prompt' => 'How to improve customer engagement in digital marketing?',
                'is_active' => true,
                'order' => 2,
                'position' => 2,
            ]);

            BrandPrompt::create([
                'brand_id' => $brand->id,
                'prompt' => 'Best practices for social media marketing',
                'is_active' => true,
                'order' => 3,
                'position' => 3,
            ]);
        }

        // Create sample posts
        $samplePosts = [
            [
                'title' => 'The Ultimate Guide to Small Business Marketing',
                'url' => 'https://example.com/small-business-marketing-guide',
                'description' => 'A comprehensive guide covering the most effective marketing strategies for small businesses in 2025.',
                'status' => 'published',
            ],
            [
                'title' => 'Digital Marketing Trends 2025',
                'url' => 'https://example.com/digital-marketing-trends-2025',
                'description' => 'Explore the latest trends in digital marketing and how they can boost your business growth.',
                'status' => 'published',
            ],
            [
                'title' => 'Social Media Strategies That Work',
                'url' => 'https://example.com/social-media-strategies',
                'description' => 'Proven social media strategies to increase engagement and drive more traffic to your business.',
                'status' => 'draft',
            ],
            [
                'title' => 'Customer Engagement Best Practices',
                'url' => 'https://example.com/customer-engagement-practices',
                'description' => 'Learn how to improve customer engagement and build lasting relationships with your audience.',
                'status' => 'published',
            ],
            [
                'title' => 'Content Marketing ROI Analysis',
                'url' => 'https://example.com/content-marketing-roi',
                'description' => 'Understanding the return on investment for your content marketing efforts.',
                'status' => 'archived',
            ],
        ];

        foreach ($samplePosts as $postData) {
            Post::create([
                'brand_id' => $brand->id,
                'user_id' => $brand->user_id,
                'title' => $postData['title'],
                'url' => $postData['url'],
                'description' => $postData['description'],
                'status' => $postData['status'],
                'posted_at' => now()->subDays(rand(1, 30)),
            ]);
        }

        $this->command->info('Sample posts created successfully!');
    }
}

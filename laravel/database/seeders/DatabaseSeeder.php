<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Uses firstOrCreate to prevent duplicate constraint violations on re-run.
     */
    public function run(): void
    {
        // Use firstOrCreate to safely handle repeated seeding
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name'     => 'Test User',
                'password' => bcrypt('password'),
            ]
        );

        // Seed default roles
        $this->call(RoleSeeder::class);
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Seed default application roles.
     */
    public function run(): void
    {
        $roles = [
            ['name' => 'admin',  'description' => 'Full system access'],
            ['name' => 'editor', 'description' => 'Can create and edit content'],
            ['name' => 'viewer', 'description' => 'Read-only access'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role['name']], $role);
        }
    }
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Project Overview

This is a Laravel 12 application using React 19, Inertia.js, TypeScript, and Radix UI for the frontend. The project uses Laravel Fortify for authentication, Tailwind CSS v4 with Vite for asset building, and Pest for testing. It includes the neuron-ai package (planned) for AI agent functionality.

## Development Commands

### Initial Setup
```bash
composer setup
```
This runs the full setup: installs PHP dependencies, creates .env if needed, generates app key, runs migrations, installs npm packages, and builds assets.

### Development Server
```bash
composer dev
```
Starts a concurrent development environment with:
- PHP artisan serve (server)
- Queue listener
- Pail log viewer
- Vite dev server for hot module replacement

### Testing
```bash
# Run all tests
composer test

# Run specific test file
php artisan test tests/Feature/Auth/AuthenticationTest.php

# Run tests with Pest directly
./vendor/bin/pest

# Run specific test by name
./vendor/bin/pest --filter="user can login"
```

### Code Quality
```bash
# Format PHP code with Laravel Pint
./vendor/bin/pint

# Format specific files/directories
./vendor/bin/pint app/Http/Controllers

# Run PHPStan static analysis
./vendor/bin/phpstan analyse

# Lint TypeScript/React code
npm run lint
```

### Database
```bash
# Run migrations
php artisan migrate

# Fresh migration with seed
php artisan migrate:fresh --seed

# Rollback
php artisan migrate:rollback
```

### Assets
```bash
# Development build with HMR
npm run dev

# Production build
npm run build

# Type check TypeScript
npm run type-check
```

### Queue Management
```bash
# Process queue jobs
php artisan queue:work

# Listen for queue jobs (auto-reloads on code changes)
php artisan queue:listen --tries=1
```

## Architecture

### Authentication and Authorization
- Uses **Laravel Fortify** for authentication (registration, login, password reset, email verification, two-factor authentication)
- Authentication views are implemented using **React/Inertia** components in `resources/js/pages/auth/`
- Two-factor authentication is configured and available in account settings
- Fortify configuration is in `config/fortify.php`
- Custom Fortify actions are in `app/Actions/Fortify/`
- FortifyServiceProvider customizes view responses in `app/Providers/FortifyServiceProvider.php`

### Frontend Architecture
- **React 19** with **TypeScript** for type-safe component development
- **Inertia.js** connects Laravel backend to React frontend without building a separate API
- **Radix UI** primitives provide accessible, unstyled components for custom styling
- **TanStack Query** for server state management and data fetching patterns
- **Tailwind CSS v4** for styling via Vite plugin
- Asset pipeline managed by **Vite** with Laravel plugin and HMR support

### Frontend File Structure
- React pages: `resources/js/pages/` (maps to Inertia routes)
- Reusable components: `resources/js/components/`
- UI primitives: `resources/js/components/ui/` (Radix-based)
- TypeScript types: `resources/js/types/`
- Hooks: `resources/js/hooks/`
- Layouts: `resources/js/layouts/`

### Routing
- Web routes defined in `routes/web.php`
- Inertia routes return React page components via `Inertia::render()`
- Authentication and settings routes are grouped with appropriate middleware

### Database
- **MySQL 8.0+** for both development and production (for parity)
- Migrations in `database/migrations/`
- Seeders in `database/seeders/`
- Factories in `database/factories/`

### Testing with Pest
- Test configuration in `tests/Pest.php`
- Feature tests automatically use `RefreshDatabase` trait
- Feature tests in `tests/Feature/`
- Unit tests in `tests/Unit/`
- Tests use Pest's expect syntax
- Test environment configured in `phpunit.xml`

### Layouts and Components
- Main app layout: `resources/js/layouts/app-layout.tsx`
- Authentication layout: `resources/js/layouts/auth-layout.tsx`
- Sidebar component: `resources/js/components/app-sidebar.tsx`
- Header component: `resources/js/components/app-header.tsx`

### Service Providers
- `AppServiceProvider`: Main application service provider
- `FortifyServiceProvider`: Customizes Fortify authentication views and responses
- Providers registered in `bootstrap/providers.php`

### Configuration
- Application bootstrap in `bootstrap/app.php` (Laravel 12 structure)
- Configuration files in `config/`
- Environment variables in `.env` (use `.env.example` as template)
- Queue connection defaults to `database`
- Cache store defaults to `database`
- Session driver defaults to `database`

## Important Patterns

### Inertia.js Page Components
Pages are React components that receive props from Laravel controllers. They're located in `resources/js/pages/` and map directly to Inertia routes.

```tsx
// Example page component
export default function Today({ tasks, approvals }: TodayProps) {
  return (
    <AppLayout>
      <h1>Today</h1>
      {/* ... */}
    </AppLayout>
  );
}
```

### Fortify Integration
When modifying authentication flows, be aware that Fortify handles the backend logic while React/Inertia provides the frontend. Custom logic should be added via Fortify actions in `app/Actions/Fortify/`.

### Component Patterns
- Use Radix UI primitives for accessible interactive components
- Style with Tailwind CSS utility classes
- Keep components small and focused
- Use TypeScript interfaces for all props

### Queue Jobs
The application uses database queues by default. Queue jobs should be processed via `php artisan queue:work` or `queue:listen`. The `composer dev` command automatically starts a queue listener.

### Tailwind CSS v4
Uses the new Tailwind v4 via Vite plugin. Configuration is in `tailwind.config.js` and custom theme tokens in CSS files.

## Key Models

The application implements a work graph structure:
- **Party**: Clients, vendors, or other external entities
- **Project**: Top-level container for work
- **WorkOrder**: Scoped work items with budgets and deliverables
- **Task**: Individual action items within work orders
- **Deliverable**: Output artifacts tied to tasks or work orders

Supporting models include:
- **Playbook**: SOP templates with checklists and validation
- **InboxItem**: Centralized approval queue
- **AIAgent/AgentConfiguration**: AI agent settings and activity logging
- **CommunicationThread/Message**: Contextual conversations tied to work items

## Agent-OS Integration

This project includes agent-os configuration in `agent-os/` directory with standards for backend, frontend, global, and testing practices. The configuration uses Claude Code commands and subagents.

Key documentation:
- Product mission: `agent-os/product/mission.md`
- Development roadmap: `agent-os/product/roadmap.md`
- Tech stack: `agent-os/product/tech-stack.md`
- Coding standards: `agent-os/standards/`

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.4.20
- inertiajs/inertia-laravel (INERTIA) - v2
- laravel/folio (FOLIO) - v1
- laravel/fortify (FORTIFY) - v1
- laravel/framework (LARAVEL) - v12
- laravel/prompts (PROMPTS) - v0
- laravel/sanctum (SANCTUM) - v4
- laravel/wayfinder (WAYFINDER) - v0
- laravel/mcp (MCP) - v0
- laravel/pint (PINT) - v1
- laravel/sail (SAIL) - v1
- pestphp/pest (PEST) - v4
- phpunit/phpunit (PHPUNIT) - v12
- @inertiajs/react (INERTIA) - v2
- react (REACT) - v19
- tailwindcss (TAILWINDCSS) - v4
- @laravel/vite-plugin-wayfinder (WAYFINDER) - v0
- eslint (ESLINT) - v9
- prettier (PRETTIER) - v3

## Skills Activation

This project has domain-specific skills available. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

- `folio-routing` — Creates file-based routes with Laravel Folio. Activates when creating new pages, setting up routes, working with route parameters or model binding, adding middleware to pages, working with resources/views/pages; or when the user mentions Folio, pages, file-based routing, page routes, or creating a new page for a URL path.
- `wayfinder-development` — Use this skill for Laravel Wayfinder which auto-generates typed functions for Laravel controllers and routes. ALWAYS use this skill when frontend code needs to call backend routes or controller actions. Trigger when: connecting any React/Vue/Svelte/Inertia frontend to Laravel controllers, routes, building end-to-end features with both frontend and backend, wiring up forms or links to backend endpoints, fixing route-related TypeScript errors, importing from @/actions or @/routes, or running wayfinder:generate. Use Wayfinder route functions instead of hardcoded URLs. Covers: wayfinder() vite plugin, .url()/.get()/.post()/.form(), query params, route model binding, tree-shaking. Do not use for backend-only task
- `pest-testing` — Tests applications using the Pest 4 PHP framework. Activates when writing tests, creating unit or feature tests, adding assertions, testing Livewire components, browser testing, debugging test failures, working with datasets or mocking; or when the user mentions test, spec, TDD, expects, assertion, coverage, or needs to verify functionality works.
- `inertia-react-development` — Develops Inertia.js v2 React client-side applications. Activates when creating React pages, forms, or navigation; using &lt;Link&gt;, &lt;Form&gt;, useForm, or router; working with deferred props, prefetching, or polling; or when user mentions React with Inertia, React pages, React forms, or React navigation.
- `tailwindcss-development` — Styles applications using Tailwind CSS v4 utilities. Activates when adding styles, restyling components, working with gradients, spacing, layout, flex, grid, responsive design, dark mode, colors, typography, or borders; or when the user mentions CSS, styling, classes, Tailwind, restyle, hero section, cards, buttons, or any visual/UI changes.
- `fortify-development` — ACTIVATE when the user works on authentication in Laravel. This includes login, registration, password reset, email verification, two-factor authentication (2FA/TOTP/QR codes/recovery codes), passkeys, profile updates, password confirmation, or any auth-related routes and controllers. Activate when the user mentions Fortify, auth, authentication, login, register, signup, forgot password, verify email, 2FA, passkeys, WebAuthn, or references app/Actions/Fortify/, CreateNewUser, UpdateUserProfileInformation, FortifyServiceProvider, config/fortify.php, or auth guards. Fortify is the frontend-agnostic authentication backend for Laravel that registers all auth routes and controllers. Also activate when building SPA or headless authentication, customizing login redirects, overriding response contracts like LoginResponse, or configuring login throttling. Do NOT activate for Laravel Passport (OAuth2 API tokens), Socialite (OAuth social login), or non-auth Laravel features.
- `debugging-output-and-previewing-html-using-ray` — Use when user says &quot;send to Ray,&quot; &quot;show in Ray,&quot; &quot;debug in Ray,&quot; &quot;log to Ray,&quot; &quot;display in Ray,&quot; or wants to visualize data, debug output, or show diagrams in the Ray desktop application.
- `laravel-specialist` — Build and configure Laravel 10+ applications, including creating Eloquent models and relationships, implementing Sanctum authentication, configuring Horizon queues, designing RESTful APIs with API resources, and building reactive interfaces with Livewire. Use when creating Laravel models, setting up queue workers, implementing Sanctum auth flows, building Livewire components, optimising Eloquent queries, or writing Pest/PHPUnit tests for Laravel features.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

- Laravel Boost is an MCP server that comes with powerful tools designed specifically for this application. Use them.

## Artisan

- Use the `list-artisan-commands` tool when you need to call an Artisan command to double-check the available parameters.

## URLs

- Whenever you share a project URL with the user, you should use the `get-absolute-url` tool to ensure you're using the correct scheme, domain/IP, and port.

## Tinker / Debugging

- You should use the `tinker` tool when you need to execute PHP to debug code or query Eloquent models directly.
- Use the `database-query` tool when you only need to read from the database.
- Use the `database-schema` tool to inspect table structure before writing migrations or models.

## Reading Browser Logs With the `browser-logs` Tool

- You can read browser logs, errors, and exceptions using the `browser-logs` tool from Boost.
- Only recent browser logs will be useful - ignore old logs.

## Searching Documentation (Critically Important)

- Boost comes with a powerful `search-docs` tool you should use before trying other approaches when working with Laravel or Laravel ecosystem packages. This tool automatically passes a list of installed packages and their versions to the remote Boost API, so it returns only version-specific documentation for the user's circumstance. You should pass an array of packages to filter on if you know you need docs for particular packages.
- Search the documentation before making code changes to ensure we are taking the correct approach.
- Use multiple, broad, simple, topic-based queries at once. For example: `['rate limiting', 'routing rate limiting', 'routing']`. The most relevant results will be returned first.
- Do not add package names to queries; package information is already shared. For example, use `test resource table`, not `filament 4 test resource table`.

### Available Search Syntax

1. Simple Word Searches with auto-stemming - query=authentication - finds 'authenticate' and 'auth'.
2. Multiple Words (AND Logic) - query=rate limit - finds knowledge containing both "rate" AND "limit".
3. Quoted Phrases (Exact Position) - query="infinite scroll" - words must be adjacent and in that order.
4. Mixed Queries - query=middleware "rate limit" - "middleware" AND exact phrase "rate limit".
5. Multiple Queries - queries=["authentication", "middleware"] - ANY of these terms.

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.

## Constructors

- Use PHP 8 constructor property promotion in `__construct()`.
    - `public function __construct(public GitHub $github) { }`
- Do not allow empty `__construct()` methods with zero parameters unless the constructor is private.

## Type Declarations

- Always use explicit return type declarations for methods and functions.
- Use appropriate PHP type hints for method parameters.

<!-- Explicit Return Types and Method Params -->
```php
protected function isAccessible(User $user, ?string $path = null): bool
{
    ...
}
```

## Enums

- Typically, keys in an Enum should be TitleCase. For example: `FavoritePerson`, `BestLake`, `Monthly`.

## Comments

- Prefer PHPDoc blocks over inline comments. Never use comments within the code itself unless the logic is exceptionally complex.

## PHPDoc Blocks

- Add useful array shape type definitions when appropriate.

=== herd rules ===

# Laravel Herd

- The application is served by Laravel Herd and will be available at: `https?://[kebab-case-project-dir].test`. Use the `get-absolute-url` tool to generate valid URLs for the user.
- You must not run any commands to make the site available via HTTP(S). It is always available through Laravel Herd.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

=== inertia-laravel/v2 rules ===

# Inertia v2

- Use all Inertia features from v1 and v2. Check the documentation before making changes to ensure the correct approach.
- New features: deferred props, infinite scrolling (merging props + `WhenVisible`), lazy loading on scroll, polling, prefetching.
- When using deferred props, add an empty state with a pulsing or animated skeleton.

=== folio/core rules ===

# Laravel Folio

- Laravel Folio is a powerful page-based router that simplifies routing in Laravel applications.
- Routes are generated automatically by creating Blade templates in `resources/views/pages`.
- IMPORTANT: Activate 'folio-routing' when working with Folio, pages, routes, route parameters, model binding, middleware, or `resources/views/pages`.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using the `list-artisan-commands` tool.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

## Database

- Always use proper Eloquent relationship methods with return type hints. Prefer relationship methods over raw queries or manual joins.
- Use Eloquent models and relationships before suggesting raw database queries.
- Avoid `DB::`; prefer `Model::query()`. Generate code that leverages Laravel's ORM capabilities rather than bypassing them.
- Generate code that prevents N+1 query problems by using eager loading.
- Use Laravel's query builder for very complex database operations.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `list-artisan-commands` to check the available options to `php artisan make:model`.

### APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## Controllers & Validation

- Always create Form Request classes for validation rather than inline validation in controllers. Include both validation rules and custom error messages.
- Check sibling Form Requests to see if the application uses array or string based validation rules.

## Authentication & Authorization

- Use Laravel's built-in authentication and authorization features (gates, policies, Sanctum, etc.).

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Queues

- Use queued jobs for time-consuming operations with the `ShouldQueue` interface.

## Configuration

- Use environment variables only in configuration files - never use the `env()` function directly outside of config files. Always use `config('app.name')`, not `env('APP_NAME')`.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== laravel/v12 rules ===

# Laravel 12

- CRITICAL: ALWAYS use `search-docs` tool for version-specific Laravel documentation and updated code examples.
- Since Laravel 11, Laravel has a new streamlined file structure which this project uses.

## Laravel 12 Structure

- In Laravel 12, middleware are no longer registered in `app/Http/Kernel.php`.
- Middleware are configured declaratively in `bootstrap/app.php` using `Application::configure()->withMiddleware()`.
- `bootstrap/app.php` is the file to register middleware, exceptions, and routing files.
- `bootstrap/providers.php` contains application specific service providers.
- The `app\Console\Kernel.php` file no longer exists; use `bootstrap/app.php` or `routes/console.php` for console configuration.
- Console commands in `app/Console/Commands/` are automatically available and do not require manual registration.

## Database

- When modifying a column, the migration must include all of the attributes that were previously defined on the column. Otherwise, they will be dropped and lost.
- Laravel 12 allows limiting eagerly loaded records natively, without external packages: `$query->latest()->limit(10);`.

### Models

- Casts can and likely should be set in a `casts()` method on a model rather than the `$casts` property. Follow existing conventions from other models.

=== wayfinder/core rules ===

# Laravel Wayfinder

Wayfinder generates TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).

- IMPORTANT: Activate `wayfinder-development` skill whenever referencing backend routes in frontend components.
- Invokable Controllers: `import StorePost from '@/actions/.../StorePostController'; StorePost()`.
- Parameter Binding: Detects route keys (`{post:slug}`) — `show({ slug: "my-post" })`.
- Query Merging: `show(1, { mergeQuery: { page: 2, sort: null } })` merges with current URL, `null` removes params.
- Inertia: Use `.form()` with `<Form>` component or `form.submit(store())` with useForm.

=== pint/core rules ===

# Laravel Pint Code Formatter

- You must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

## Pest

- This project uses Pest for testing. Create tests: `php artisan make:test --pest {name}`.
- Run tests: `php artisan test --compact` or filter: `php artisan test --compact --filter=testName`.
- Do NOT delete tests without approval.
- CRITICAL: ALWAYS use `search-docs` tool for version-specific Pest documentation and updated code examples.
- IMPORTANT: Activate `pest-testing` every time you're working with a Pest or testing-related task.

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

=== tailwindcss/core rules ===

# Tailwind CSS

- Always use existing Tailwind conventions; check project patterns before adding new ones.
- IMPORTANT: Always use `search-docs` tool for version-specific Tailwind CSS documentation and updated code examples. Never rely on training data.
- IMPORTANT: Activate `tailwindcss-development` every time you're working with a Tailwind CSS or styling-related task.

=== inertiajs/inertia-laravel rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v2

- Use all Inertia features from v1 and v2. Check the documentation before making changes to ensure the correct approach.
- New features: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.

=== laravel/folio rules ===

# Laravel Folio

- Laravel Folio is a powerful page-based router that simplifies routing in Laravel applications.
- Routes are generated automatically by creating Blade templates in `resources/views/pages`.
- IMPORTANT: Activate 'folio-routing' when working with Folio, pages, routes, route parameters, model binding, middleware, or `resources/views/pages`.

=== laravel/wayfinder rules ===

# Laravel Wayfinder

Use Wayfinder to generate TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).
</laravel-boost-guidelines>

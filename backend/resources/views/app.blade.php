<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Voltraak IMS') }}</title>

        @viteReactRefresh
        @vite(['src/main.jsx'])
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>

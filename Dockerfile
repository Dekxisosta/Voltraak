# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Node: compile Vite/React assets
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS node-build

WORKDIR /app

# Install JS deps first (cached layer unless package files change)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy only what Vite needs to build
COPY vite.config.js tailwind.config.js postcss.config.js ./
COPY resources/js  ./resources/js
COPY resources/views ./resources/views
COPY public        ./public

# Build — outputs to public/build/
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — PHP base: shared between production and development
# ─────────────────────────────────────────────────────────────────────────────
FROM php:8.2-fpm-alpine AS base

# System dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    oniguruma-dev \
    icu-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    mysql-client \
    supervisor \
    nginx

# PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        intl \
        xml \
        soap \
        opcache

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHP deps — copy lockfiles first so this layer is cached
COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --optimize-autoloader

# Copy application source
COPY . .

# Copy Vite-built assets from the node stage
COPY --from=node-build /app/public/build ./public/build

# Generate optimised autoloader now that app code is present
RUN composer dump-autoload --optimize --no-dev

# Permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Production
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS production

# Nginx
COPY docker/nginx/nginx.conf      /etc/nginx/nginx.conf
COPY docker/nginx/default.conf    /etc/nginx/conf.d/default.conf

# PHP
COPY docker/php/php-fpm.conf      /usr/local/etc/php-fpm.d/www.conf
COPY docker/php/php.ini           /usr/local/etc/php/php.ini

# Supervisor
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Log directories
RUN mkdir -p /var/log/nginx /var/log/php-fpm /var/log/supervisor

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — Development
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS development

# Reinstall with dev dependencies
RUN composer install --prefer-dist

# Build deps needed to compile Xdebug from source (Alpine doesn't ship them)
RUN apk add --no-cache autoconf g++ make linux-headers \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && apk del autoconf g++ make linux-headers

COPY docker/php/php-dev.ini       /usr/local/etc/php/php.ini
COPY docker/php/xdebug.ini        /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini

EXPOSE 9000

CMD ["php-fpm"]

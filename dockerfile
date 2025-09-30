FROM php:8.2-alpine

# Gerekli paketleri yükle
RUN apk add --no-cache \
    git \
    unzip \
    curl

# Çalışma dizini oluştur
WORKDIR /var/www/html

# Dosyaları kopyala
COPY . .

# Dosya izinlerini ayarla
RUN chmod 755 /var/www/html && \
    chmod 666 /var/www/html/users.json /var/www/html/error.log || true

# PHP extension'ları yükle
RUN docker-php-ext-install sockets

# Composer yükle
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Gerekli PHP.ini ayarları
RUN echo "memory_limit = 256M" > /usr/local/etc/php/conf.d/memory.ini && \
    echo "max_execution_time = 0" > /usr/local/etc/php/conf.d/execution.ini && \
    echo "display_errors = Off" > /usr/local/etc/php/conf.d/errors.ini && \
    echo "log_errors = On" > /usr/local/etc/php/conf.d/errors.ini

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Port
EXPOSE 3000

# Botu başlat
CMD ["php", "-S", "0.0.0.0:3000"]

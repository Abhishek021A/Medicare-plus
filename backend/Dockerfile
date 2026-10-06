FROM php:8.2-apache

# Enable Apache mod_rewrite for routing
RUN a2enmod rewrite

# Install required PHP extensions for the database
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Copy the backend files to the Apache web root
COPY . /var/www/html/

# Set correct permissions
RUN chown -R www-data:www-data /var/www/html/
RUN chmod -R 755 /var/www/html/

# Expose the default Apache port
EXPOSE 80

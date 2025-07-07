# Use a specific version of nginx for reproducibility and security
FROM nginx:alpine

# Update all packages to the latest versions to reduce vulnerabilities
RUN apk update && apk upgrade --no-cache

# Add metadata labels for better maintenance
LABEL maintainer="simple-todos" \
      version="1.0" \
      description="Simple todos web application" \
      org.opencontainers.image.source="https://github.com/simple-todos"

# Create a non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set the working directory inside the container
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets and create proper directories
RUN rm -rf /usr/share/nginx/html/* && \
    mkdir -p /usr/share/nginx/html/styles /usr/share/nginx/html/scripts

# Copy static files to the container with proper ownership
COPY --chown=appuser:appgroup index.html /usr/share/nginx/html/
COPY --chown=appuser:appgroup styles/ /usr/share/nginx/html/styles/
COPY --chown=appuser:appgroup scripts/ /usr/share/nginx/html/scripts/

# Copy custom nginx configuration with security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Update nginx main config to run on non-privileged port
RUN sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf && \
    sed -i '/user nginx;/d' /etc/nginx/nginx.conf && \
    sed -i 's,/var/run/nginx.pid,/tmp/nginx.pid,' /etc/nginx/nginx.conf && \
    sed -i '/^http {/a \    proxy_temp_path /tmp/proxy_temp;\n    client_body_temp_path /tmp/client_temp;\n    fastcgi_temp_path /tmp/fastcgi_temp;\n    uwsgi_temp_path /tmp/uwsgi_temp;\n    scgi_temp_path /tmp/scgi_temp;' /etc/nginx/nginx.conf

# Change ownership of nginx runtime directories
RUN chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    touch /tmp/nginx.pid && \
    chown appuser:appgroup /tmp/nginx.pid

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Switch to non-root user
USER appuser

# Expose non-privileged port
EXPOSE 8080

# Start nginx with explicit configuration
CMD ["nginx", "-g", "daemon off;"]
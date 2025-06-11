# Use a specific version of the lightweight Nginx image
FROM nginx:1.23-alpine

# Set the working directory inside the container
WORKDIR /usr/share/nginx/html

# Copy static files to the container
COPY index.html /usr/share/nginx/html/
COPY styles/ /usr/share/nginx/html/styles/
COPY scripts/ /usr/share/nginx/html/scripts/

# Set permissions for the files
RUN chmod -R 755 /usr/share/nginx/html

# Expose port 80 for the web server
EXPOSE 80

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]
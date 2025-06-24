# Use the latest stable version of the lightweight Nginx image
FROM nginx:alpine

# Set the working directory inside the container
WORKDIR /usr/share/nginx/html

# Copy static files to the container
COPY index.html /usr/share/nginx/html/
COPY styles/ /usr/share/nginx/html/styles/
COPY scripts/ /usr/share/nginx/html/scripts/

# Expose port 80 for the web server
EXPOSE 80

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]
#!/bin/bash

# Cascade Task Manager Deployment Script
# This script deploys the static website to existing AWS S3 bucket and CloudFront

set -e

# Configuration (can be overridden by environment variables)
BUCKET_NAME="${BUCKET_NAME:-cascade.vinny.dev}"
REGION="${REGION:-us-east-1}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E1351EA4HZ20NY}"

# Files to deploy
FILES=(
    # HTML files
    "index.html:text/html:no-cache,no-store,must-revalidate"
    "privacy.html:text/html:no-cache,no-store,must-revalidate"
    "terms.html:text/html:no-cache,no-store,must-revalidate"
    "user-guide.html:text/html:no-cache,no-store,must-revalidate"
    "prd.html:text/html:no-cache,no-store,must-revalidate"
    
    # JavaScript files
    "scripts/app-modular.js:application/javascript:max-age=31536000,public"
    "scripts/modules/accessibility.js:application/javascript:max-age=31536000,public"
    "scripts/modules/dom.js:application/javascript:max-age=31536000,public"
    "scripts/modules/dropdown.js:application/javascript:max-age=31536000,public"
    "scripts/modules/errorHandler.js:application/javascript:max-age=31536000,public"
    "scripts/modules/eventBus.js:application/javascript:max-age=31536000,public"
    "scripts/modules/indexedDBStorage.js:application/javascript:max-age=31536000,public"
    "scripts/modules/keyboardNav.js:application/javascript:max-age=31536000,public"
    "scripts/modules/main.js:application/javascript:max-age=31536000,public"
    "scripts/modules/models.js:application/javascript:max-age=31536000,public"
    "scripts/modules/performance.js:application/javascript:max-age=31536000,public"
    "scripts/modules/security.js:application/javascript:max-age=31536000,public"
    "scripts/modules/settings.js:application/javascript:max-age=31536000,public"
    "scripts/modules/state.js:application/javascript:max-age=31536000,public"
    "scripts/modules/storage.js:application/javascript:max-age=31536000,public"
    "scripts/modules/utils.js:application/javascript:max-age=31536000,public"
    
    # CSS files
    "styles/main.css:text/css:max-age=31536000,public"
    "styles/components.css:text/css:max-age=31536000,public"
    "styles/layout.css:text/css:max-age=31536000,public"
    "styles/typography.css:text/css:max-age=31536000,public"
    "styles/modules/_base.css:text/css:max-age=31536000,public"
    "styles/modules/_board-selector.css:text/css:max-age=31536000,public"
    "styles/modules/_buttons.css:text/css:max-age=31536000,public"
    "styles/modules/_error-toast.css:text/css:max-age=31536000,public"
    "styles/modules/_forms.css:text/css:max-age=31536000,public"
    "styles/modules/_header.css:text/css:max-age=31536000,public"
    "styles/modules/_keyboard-nav.css:text/css:max-age=31536000,public"
    "styles/modules/_layout.css:text/css:max-age=31536000,public"
    "styles/modules/_loading.css:text/css:max-age=31536000,public"
    "styles/modules/_modal.css:text/css:max-age=31536000,public"
    "styles/modules/_settings.css:text/css:max-age=31536000,public"
    "styles/modules/_menu-panel.css:text/css:max-age=31536000,public"
    "styles/modules/_task-board.css:text/css:max-age=31536000,public"
    "styles/modules/_toast.css:text/css:max-age=31536000,public"
    "styles/modules/_utilities.css:text/css:max-age=31536000,public"
    "styles/modules/_variables.css:text/css:max-age=31536000,public"
    
    # Assets
    "favicon.ico:image/x-icon:max-age=31536000,public"
    "assets/favicon.svg:image/svg+xml:max-age=31536000,public"
    "assets/cascade-icon.svg:image/svg+xml:max-age=31536000,public"
    "robots.txt:text/plain:max-age=86400,public"
    
    # Demo data
    "example-export.json:application/json:max-age=86400,public"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment of Cascade Task Manager page...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is authenticated
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Check if bucket exists
echo -e "${YELLOW}🔍 Checking if S3 bucket exists...${NC}"
if ! aws s3api head-bucket --bucket $BUCKET_NAME 2>/dev/null; then
    echo -e "${RED}❌ Bucket '$BUCKET_NAME' does not exist. Please create it first in the AWS console.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Bucket '$BUCKET_NAME' found!${NC}"

# Function to upload a single file
upload_file() {
    local file_info="$1"
    local file_path=$(echo "$file_info" | cut -d':' -f1)
    local content_type=$(echo "$file_info" | cut -d':' -f2)
    local cache_control=$(echo "$file_info" | cut -d':' -f3)
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ File not found: $file_path${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📤 Uploading $file_path...${NC}"
    aws s3 cp "$file_path" "s3://$BUCKET_NAME/$file_path" \
        --cache-control "$cache_control" \
        --content-type "$content_type" \
        --region "$REGION"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $file_path uploaded successfully${NC}"
    else
        echo -e "${RED}❌ Failed to upload $file_path${NC}"
        return 1
    fi
}

# Validate all files exist before starting upload
echo -e "${YELLOW}🔍 Validating files exist...${NC}"
missing_files=()
for file_info in "${FILES[@]}"; do
    file_path=$(echo "$file_info" | cut -d':' -f1)
    if [ ! -f "$file_path" ]; then
        missing_files+=("$file_path")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing files:${NC}"
    for file in "${missing_files[@]}"; do
        echo -e "${RED}  - $file${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✅ All files found!${NC}"

# Upload files in parallel for faster deployment
echo -e "${YELLOW}📤 Uploading files to S3 (parallel)...${NC}"
pids=()
for file_info in "${FILES[@]}"; do
    upload_file "$file_info" &
    pids+=($!)
done

# Wait for all uploads to complete
failed_uploads=0
for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
        ((failed_uploads++))
    fi
done

if [ $failed_uploads -gt 0 ]; then
    echo -e "${RED}❌ $failed_uploads file(s) failed to upload${NC}"
    exit 1
fi


echo -e "${GREEN}✅ Files uploaded successfully!${NC}"

# CloudFront invalidation (if distribution ID is provided)
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
    
    # Create specific invalidation paths for uploaded files
    invalidation_paths=()
    for file_info in "${FILES[@]}"; do
        file_path=$(echo "$file_info" | cut -d':' -f1)
        invalidation_paths+=("/$file_path")
    done
    
    # Join paths with space for AWS CLI
    paths_string=$(printf " %s" "${invalidation_paths[@]}")
    
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths $paths_string \
        --region "$REGION"
    
    echo -e "${GREEN}✅ CloudFront cache invalidation initiated for ${#invalidation_paths[@]} files!${NC}"
else
    echo -e "${BLUE}ℹ️  To invalidate CloudFront cache, set CLOUDFRONT_DISTRIBUTION_ID environment variable${NC}"
    echo -e "${BLUE}ℹ️  Or run manually: aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths '/*'${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${YELLOW}Your website is now available at: https://$BUCKET_NAME${NC}"

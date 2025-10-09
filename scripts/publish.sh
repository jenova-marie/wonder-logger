#!/bin/bash
set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   RecoverySky Server - NPM Publish Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version:${NC} ${CURRENT_VERSION}"
echo ""

# Check if we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}Current branch:${NC} ${CURRENT_BRANCH}"

if [ "$CURRENT_BRANCH" != "root" ] && [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  echo -e "${YELLOW}⚠️  Warning: You're not on root/main/master branch${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Publish cancelled${NC}"
    exit 1
  fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
  echo ""
  git status --short
  echo ""
  echo "Please commit or stash your changes before publishing."
  exit 1
fi

# Check if logged in to npm
if ! npm whoami &> /dev/null; then
  echo -e "${RED}❌ Error: Not logged in to npm${NC}"
  echo "Please run: npm login"
  exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✓${NC} Logged in to npm as: ${NPM_USER}"
echo ""

# Run tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Running Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Running unit tests..."
if ! pnpm test:unit; then
  echo -e "${RED}❌ Unit tests failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Unit tests passed"
echo ""

echo "Running integration tests..."
if ! pnpm test:integration; then
  echo -e "${RED}❌ Integration tests failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Integration tests passed"
echo ""

# Skip E2E tests by default (require infrastructure)
echo -e "${YELLOW}ℹ  Skipping E2E tests (require production infrastructure)${NC}"
echo "   Run manually if needed: NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm test:e2e"
echo ""

# Build
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Building Package${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Clean dist
echo "Cleaning dist directory..."
rm -rf dist
echo -e "${GREEN}✓${NC} Cleaned dist/"
echo ""

echo "Building TypeScript..."
if ! pnpm build; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Build successful"
echo ""

# Verify dist contents
echo "Verifying dist contents..."
if [ ! -f "dist/index.js" ] || [ ! -f "dist/index.d.ts" ]; then
  echo -e "${RED}❌ Build verification failed: Missing dist files${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Dist files verified"
echo ""

# Show what will be published
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Package Contents${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
npm pack --dry-run
echo ""

# Confirm publish
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Ready to Publish${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}You are about to publish:${NC}"
echo -e "  Package: recoverysky-server"
echo -e "  Version: ${CURRENT_VERSION}"
echo -e "  Registry: https://registry.npmjs.org"
echo -e "  User: ${NPM_USER}"
echo ""
read -p "Proceed with publish? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ Publish cancelled${NC}"
  exit 1
fi

# Publish to npm
echo ""
echo "Publishing to npm..."
if ! npm publish --access public; then
  echo -e "${RED}❌ Publish failed${NC}"
  exit 1
fi
echo ""
echo -e "${GREEN}✓${NC} Published to npm successfully!"
echo ""

# Create git tag
echo "Creating git tag..."
TAG="v${CURRENT_VERSION}"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Tag ${TAG} already exists${NC}"
else
  git tag -a "$TAG" -m "Release ${CURRENT_VERSION}"
  echo -e "${GREEN}✓${NC} Created tag: ${TAG}"

  read -p "Push tag to remote? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin "$TAG"
    echo -e "${GREEN}✓${NC} Pushed tag to remote"
  fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🎉 Publish Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Package published: ${GREEN}recoverysky-server@${CURRENT_VERSION}${NC}"
echo -e "View on npm: ${BLUE}https://www.npmjs.com/package/recoverysky-server${NC}"
echo ""
echo "Next steps:"
echo "  1. Update CHANGELOG.md with release notes"
echo "  2. Announce the release to the team"
echo "  3. Update dependent projects"
echo ""

.PHONY: dev preview build deploy deploy-rules

# Start the local dev server with hot-reload
dev:
	npm run dev

# Build then serve the production bundle locally
preview: build
	npm run preview

# Production build (type-check + Vite bundle)
build:
	npm run build

# Deploy hosting + Firestore rules to Firebase (requires FIREBASE_TOKEN or firebase login)
deploy: build
	firebase deploy --only hosting,firestore:rules --project ats-camp

# Deploy Firestore rules only (no rebuild needed)
deploy-rules:
	firebase deploy --only firestore:rules --project ats-camp

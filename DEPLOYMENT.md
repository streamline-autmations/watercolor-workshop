# 🚀 How to Publish & Deploy Changes to Your Live Site

## 📋 Current Setup Overview
Your Watercolor Workshop website is deployed on Vercel with the live URL: [https://watercolor-workshop.vercel.app](https://watercolor-workshop.vercel.app)
Repository: [https://github.com/streamline-autmations/watercolor-workshop](https://github.com/streamline-autmations/watercolor-workshop)
Deployment Platform: Vercel (automatic deployment from GitHub)

## 🔄 Deployment Process (3 Simple Steps)

### Step 1: Make Your Changes
Edit any files in your project (React components, CSS, images, etc.)
Test locally if needed using: `npm run dev`

### Step 2: Push to GitHub
You have a convenient batch file (`push-changes.bat`) that automates this:

**Option A: Use the Batch File (Easiest)**
1. Double-click `push-changes.bat`
2. Enter a commit message when prompted
3. The script will automatically:
   - Add all changes to Git
   - Commit with your message
   - Push to GitHub
   - Trigger Vercel deployment

**Option B: Manual Git Commands**
```bash
git add .
git commit -m "Your commit message here"
git push origin main
```

### Step 3: Automatic Deployment
- Vercel automatically detects changes on GitHub
- Builds and deploys your site within 1-2 minutes
- Your changes go live at: [https://watercolor-workshop.vercel.app](https://watercolor-workshop.vercel.app)

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Key Files to Edit

- **Pages**: `src/pages/` - Main application pages
- **Components**: `src/components/` - Reusable UI components
- **Styles**: `src/globals.css` - Global CSS styles
- **Data**: `src/data/` - Mock data and types
- **Images**: `public/` - Static assets

## 🔧 Troubleshooting

- **Build fails**: Check console for errors, ensure all dependencies are installed
- **Changes not showing**: Clear browser cache or wait 1-2 minutes for deployment
- **Git issues**: Make sure you're in the project directory and have Git configured

## 📱 Mobile Development

This project also supports mobile app development with Capacitor:
```bash
# Add iOS platform
npx cap add ios

# Add Android platform  
npx cap add android

# Build and sync
npm run build
npx cap sync
```

## 🎨 Customization Tips

- Edit `tailwind.config.ts` for theme customization
- Modify `src/data/mock.ts` for course content
- Update `src/components/ui/` for component styling
- Change `public/` images for branding

---

**Happy coding! 🎨✨**

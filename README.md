# 🚀 Code Checker: Intelligent Code Analysis & Optimization

[![Next.js](https://img.shields.io/badge/Next.js-15.1.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![TRPC](https://img.shields.io/badge/tRPC-11.0-2596be?style=for-the-badge&logo=trpc)](https://trpc.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

**Code Checker** is a modern, AI-powered web application designed to help developers analyze, format, and optimize their code effortlessly. With a multi-stage analysis pipeline and a premium user interface, it transforms raw code into clean, production-ready gems.

---

## ✨ Key Features

- 🛠️ **Multi-Stage Analysis Pipeline**: Seamlessly transitions through code extraction, formatting, and AI-driven analysis.
- 💻 **Monaco Editor Integration**: High-performance code editing experience right in your browser.
- 🎨 **Premium UI/UX**: Built with Framer Motion for smooth animations and a sleek, modern aesthetic (Glassmorphism, Dark Mode).
- 🌐 **Internationalization (i18n)**: Comprehensive support for multiple languages including English, Chinese, and German.
- ⚡ **Real-time Progress Tracking**: Visualize the analysis process with a dynamic pipeline status component.
- 🔍 **Image-to-Code Support**: Upload images of code snippets and let AI handle the transcription and analysis.
- 🌓 **Dynamic Theme Switching**: Smooth transitions between Light and Dark modes.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js 15+](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/)
- **API Layer**: [tRPC](https://trpc.io/) (End-to-end typesafe APIs)
- **Database**: [Prisma](https://www.prisma.io/) with SQLite/PostgreSQL support
- **AI Integration**: [OpenAI SDK](https://github.com/openai/openai-node)
- **Code Rendering**: [Shiki](https://shiki.style/) for beautiful, high-performance syntax highlighting
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- npm / yarn / pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/code-checker.git
   cd code-checker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**
   ```bash
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🐳 Docker Deployment

The simplest way to deploy Code Checker is using Docker Compose.

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/code-checker.git
   cd code-checker
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!NOTE]
> On the first run, the application will guide you through the initial setup (admin account and API configuration). Persistent data is stored in the `./prisma/data` volume by default.

---

---

## 📂 Project Structure

```text
src/
├── app/            # Next.js App Router (Pages & Layouts)
├── components/     # Reusable UI components (Dashboard, Pipeline, etc.)
├── i18n/           # Internationalization configuration
├── lib/            # Shared libraries (Prisma client, TRPC, etc.)
├── server/         # TRPC routers and server-side logic
├── store/          # Zustand state management
└── utils/          # Helper functions and constants
```

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🌟 Acknowledgments

- Built with ❤️ using [Shadcn UI](https://ui.shadcn.com/)
- Icons by [Lucide React](https://lucide.dev/)
- Animations by [Framer Motion](https://www.framer.com/motion/)

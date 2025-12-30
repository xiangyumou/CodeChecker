# 🚀 CodeChecker: AI Code Debugger for Competitive Programming

[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

**CodeChecker** is an intelligent coding assistant designed specifically for **ICPC**, **LeetCode**, and algorithmic problem solvers. Simply paste your code or upload a screenshot of the problem—get instant feedback on correctness, edge cases, complexity analysis, and optimization suggestions.

---

## 💡 Why CodeChecker?

### The Problem
You're solving an algorithmic challenge. Your code passes sample cases, but:
- ❌ Fails hidden test cases with cryptic errors
- ❌ Times out on large inputs (TLE)
- ❌ Misses corner cases you didn't think of
- ❌ Works, but could be more elegant

### The Solution
CodeChecker acts as your **personal code reviewer** powered by AI:
- ✅ **Understands the problem** from screenshots or text descriptions
- ✅ **Validates your logic** against the actual requirements
- ✅ **Spots edge cases** you might have missed
- ✅ **Analyzes time/space complexity** and suggests improvements
- ✅ **Shows you exactly what to fix** with side-by-side code diffs

---

## ✨ Key Features

### 🔍 **Multi-Stage Analysis Pipeline**
1. **Problem Extraction**: Upload a screenshot of the problem statement (from LeetCode, Codeforces, etc.) and the AI extracts constraints, examples, and requirements.
2. **Code Validation**: Checks if your solution actually solves the problem—not just if it compiles.
3. **Deep Review**: Provides detailed feedback on:
   - Logical correctness
   - Time & space complexity
   - Edge case handling
   - Code readability and best practices

### 📸 **Screenshot Support**
Don't want to type the problem? Just screenshot it! CodeChecker can:
- Extract problem descriptions from images
- Parse code from screenshots (OCR)
- Handle messy input formats

### ⚡ **Real-Time Progress Tracking**
Watch the analysis unfold in real-time with a beautiful 3-stage pipeline visualizer:
- 🔵 Stage 1: Extracting problem details...
- 🔵 Stage 2: Formatting your code...
- 🔵 Stage 3: Running deep analysis...

### 📊 **Visual Diff View**
See exactly what changed between your original code and the optimized version with:
- Side-by-side comparison
- Syntax-highlighted diffs
- Line-by-line explanations

### 🌐 **Multilingual Support**
Interface available in:
- 🇺🇸 English
- 🇨🇳 中文 (Chinese)
- 🇩🇪 Deutsch (German)

---

## 🚀 Getting Started

### Option 1: Docker (Recommended)

1. **Clone and run**
   ```bash
   git clone https://github.com/your-username/code-checker.git
   cd code-checker
   docker-compose up -d
   ```

2. **Open in browser**
   Visit [http://localhost:3000](http://localhost:3000)

3. **Initial setup**
   On first launch, you'll configure:
   - Admin credentials
   - OpenAI API key (or compatible endpoint like Gemini)

### Option 2: Local Development

1. **Prerequisites**
   - Node.js 20+
   - npm/yarn/pnpm

2. **Install & Setup**
   ```bash
   git clone https://github.com/your-username/code-checker.git
   cd code-checker
   npm install
   cp .env.example .env  # Edit with your API keys
   npx prisma db push
   npm run dev
   ```

3. **Access**
   Open [http://localhost:3000](http://localhost:3000)

---

## 📖 How to Use

### Basic Workflow

1. **Submit your problem**
   - Option A: Paste the problem description + your code
   - Option B: Upload screenshots of both

2. **Wait for analysis** (~30-60 seconds)
   - Watch the pipeline process your request in real-time

3. **Review results**
   - **Problem Tab**: See the structured problem breakdown
   - **Code Tab**: Your cleaned/formatted code
   - **Diff Tab**: Side-by-side comparison of original vs. optimized
   - **Analysis Tab**: Detailed explanations of each change

4. **Iterate**
   - Copy suggestions
   - Retry with updated code
   - Repeat until perfect!

### Example Use Cases

**Scenario 1: Debug a TLE (Time Limit Exceeded)**
```
Your Code: Brute force O(n²) solution
→ CodeChecker identifies the bottleneck
→ Suggests O(n log n) approach with explanation
→ Shows exact implementation in diff view
```

**Scenario 2: Catch Edge Cases**
```
Your Code: Works for positive integers
→ CodeChecker tests against problem constraints
→ Finds failure on: negative numbers, zero, large values
→ Provides fixed version handling all cases
```

**Scenario 3: Learn Better Patterns**
```
Your Code: Messy nested loops
→ CodeChecker recognizes sliding window pattern
→ Refactors to clean, idiomatic solution
→ Explains why it's better (readability + performance)
```

---

## 🛠️ Configuration

### Supported AI Models
- **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Google Gemini**: Gemini 1.5 Pro, Flash (via OpenAI-compatible endpoint)
- Any OpenAI API-compatible service

### Environment Variables
```bash
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1  # Or your provider's endpoint
OPENAI_MODEL=gpt-4o  # Model name
MODEL_SUPPORTS_VISION=true  # Enable screenshot support
MAX_CONCURRENT_ANALYSIS_TASKS=3  # Parallel processing limit
```

---

## 🤝 Contributing

Love competitive programming? Help make CodeChecker better!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-improvement`)
3. Commit your changes (`git commit -m 'Add edge case detector'`)
4. Push and open a Pull Request

**Ideas for contributions:**
- Support for more programming languages
- Integration with LeetCode/Codeforces APIs
- Test case generation
- Contest mode (analyze multiple problems at once)

---

## 📄 License

MIT License - feel free to use for personal or commercial projects!

---

## 🙏 Acknowledgments

- Powered by OpenAI GPT models
- Built with Next.js, Prisma, and tRPC
- UI components from Shadcn UI
- Syntax highlighting by Shiki

---

**Happy Coding! 🎯** If CodeChecker helped you ace a contest or pass that tricky test case, star the repo! ⭐

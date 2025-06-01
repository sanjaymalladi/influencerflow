# Contributing to InfluencerFlow

Thank you for your interest in contributing to InfluencerFlow! We welcome contributions from the community and are excited to see what you'll bring to the project.

## 🤝 How to Contribute

### Reporting Bugs

1. **Check existing issues** first to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)
   - Screenshots or error logs if applicable

### Suggesting Features

1. **Check existing feature requests** to avoid duplicates
2. **Use the feature request template**
3. **Provide clear use cases** and explain the value
4. **Consider the scope** - start with smaller, focused features

### Code Contributions

#### Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/influencerflow.git
   cd influencerflow
   ```
3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

#### Development Guidelines

##### Code Style
- **Backend**: Follow Node.js best practices
- **Frontend**: Use TypeScript and follow React best practices
- **Formatting**: Use Prettier for consistent formatting
- **Linting**: Ensure ESLint passes without errors

##### Commit Messages
Use conventional commit format:
```
type(scope): description

Examples:
feat(auth): add OAuth2 integration
fix(email): resolve template rendering issue
docs(readme): update installation instructions
```

##### Testing
- Write tests for new features
- Ensure existing tests pass
- Aim for good test coverage

#### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Update the README** if you've added features
5. **Create a pull request** with:
   - Clear title and description
   - Reference any related issues
   - Screenshots for UI changes

## 🏗️ Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Environment Setup
1. Copy environment templates:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
2. Fill in your API keys and configuration
3. Follow the main README for detailed setup

### Running the Development Environment
```bash
# Start both frontend and backend
npm run dev

# Or start separately
cd backend && npm run dev
cd frontend && npm run dev
```

## 📋 Project Structure

```
influencerflow/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   └── package.json
└── README.md
```

## 🎯 Areas for Contribution

### High Priority
- **AI Improvements**: Enhance conversation analysis
- **Database Integration**: Replace file-based storage
- **Testing**: Add comprehensive test coverage
- **Documentation**: Improve API documentation

### Medium Priority
- **Performance**: Optimize API responses
- **UI/UX**: Improve user interface
- **Mobile**: Responsive design improvements
- **Integrations**: Add more email providers

### Good First Issues
- **Bug fixes**: Small, well-defined issues
- **Documentation**: Improve existing docs
- **UI polish**: Minor interface improvements
- **Code cleanup**: Refactoring and optimization

## 🔍 Code Review Process

1. **Automated checks** must pass (linting, tests)
2. **Manual review** by maintainers
3. **Feedback incorporation** if needed
4. **Approval and merge** by maintainers

## 📝 Documentation

- **Code comments**: Document complex logic
- **API documentation**: Update OpenAPI specs
- **README updates**: Keep installation/usage current
- **Changelog**: Document breaking changes

## 🚀 Release Process

1. **Version bumping**: Follow semantic versioning
2. **Changelog updates**: Document all changes
3. **Testing**: Comprehensive testing before release
4. **Deployment**: Automated deployment pipeline

## 🤔 Questions?

- **GitHub Discussions**: For general questions
- **GitHub Issues**: For bug reports and feature requests
- **Email**: For security-related concerns

## 📜 Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Be patient** with newcomers
- **Focus on what's best** for the community

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## 🙏 Recognition

Contributors will be recognized in:
- **README contributors section**
- **Release notes** for significant contributions
- **GitHub contributors page**

Thank you for contributing to InfluencerFlow! 🚀 
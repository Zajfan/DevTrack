# Contributing to DevTrack

Thank you for your interest in contributing to DevTrack! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project follows a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers
- Focus on what is best for the project
- Show empathy towards other contributors

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/YOUR_USERNAME/DevTrack.git
   cd DevTrack
   ```
3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/The-No-Hands-Company/DevTrack.git
   ```

## Development Setup

### Backend Development

```bash
cd backend
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_STANDARD=23
cmake --build .
```

### Frontend Development

```bash
cd frontend
npm install
npm run electron:dev
```

## Making Changes

1. **Create a branch** for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Commit your changes** with descriptive messages
   ```bash
   git commit -m "feat: add new feature"
   ```

   We use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Test additions or changes
   - `chore:` Build process or auxiliary tool changes

## Coding Standards

### C++ (Backend)

- Follow the [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- Use C++23 features when appropriate
- Header guards: `#pragma once`
- Naming conventions:
  - Classes: `PascalCase`
  - Functions: `camelCase`
  - Variables: `snake_case_`
  - Constants: `UPPER_CASE`
  - Namespaces: `lowercase`

Example:
```cpp
#pragma once

namespace devtrack::models {

class ProjectManager {
public:
    void addProject(const Project& project);
    
private:
    std::vector<Project> projects_;
    const int MAX_PROJECTS = 100;
};

} // namespace devtrack::models
```

### TypeScript/React (Frontend)

- Follow the project's ESLint configuration
- Use TypeScript for type safety
- Functional components with hooks
- Naming conventions:
  - Components: `PascalCase`
  - Functions: `camelCase`
  - Constants: `UPPER_CASE`
  - Files: `PascalCase.tsx` for components, `camelCase.ts` for utilities

Example:
```typescript
import React from 'react';

interface ProjectCardProps {
  project: Project;
  onSelect: (id: number) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect }) => {
  const handleClick = () => {
    onSelect(project.id);
  };
  
  return (
    <div onClick={handleClick}>
      <h3>{project.name}</h3>
    </div>
  );
};
```

## Testing

### Backend Tests

```bash
cd backend/build
ctest --output-on-failure
```

Write tests using Google Test:

```cpp
#include <gtest/gtest.h>
#include "devtrack/models/Project.h"

TEST(ProjectTest, CreateProject) {
    devtrack::models::Project project("Test", "Description");
    EXPECT_EQ(project.getName(), "Test");
}
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Submitting Changes

1. **Push your changes** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub
   - Provide a clear title and description
   - Reference any related issues
   - Ensure all tests pass
   - Add screenshots for UI changes

3. **Address review feedback**
   - Make requested changes
   - Push additional commits
   - Respond to comments

## Pull Request Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Comments added to complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated and passing
- [ ] Dependent changes merged and published

## Development Tips

### Running Specific Tests

```bash
# Backend - run specific test
cd backend/build
ctest -R ProjectTest

# Frontend - run specific test file
cd frontend
npm test -- ProjectCard.test.tsx
```

### Debugging

Backend (GDB):
```bash
cd backend/build
gdb ./bin/devtrack_server
```

Frontend (Chrome DevTools):
- DevTools automatically open in development mode
- Use `console.log()` or debugger statements

### Code Formatting

Backend (clang-format):
```bash
cd backend
find src include -name "*.cpp" -o -name "*.h" | xargs clang-format -i
```

Frontend (Prettier):
```bash
cd frontend
npm run format
```

## Questions?

If you have questions or need help:

1. Check existing [issues](https://github.com/The-No-Hands-Company/DevTrack/issues)
2. Create a new issue with the `question` label
3. Join our discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE)).

---

Thank you for contributing to DevTrack! 🎉

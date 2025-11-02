# Contributing to BackupManager

Thank you for your interest in contributing to BackupManager! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/BackupManager.git
   cd BackupManager
   ```

2. **Run the setup script**
   ```bash
   ./scripts/dev-setup.sh
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Project Structure

- `backend/` - FastAPI backend application
- `frontend/` - React frontend application
- `scripts/` - Utility scripts for development
- `backups/` - Default backup storage location

## Coding Standards

### Backend (Python)

- Follow PEP 8 style guide
- Use type hints where possible
- Write docstrings for all functions and classes
- Keep functions focused and single-purpose
- Use SQLAlchemy ORM for database operations

Example:
```python
def create_backup(db: Session, database_id: int) -> BackupLog:
    """
    Create a new backup for the specified database.

    Args:
        db: Database session
        database_id: ID of the database to backup

    Returns:
        BackupLog: The created backup log entry
    """
    # Implementation
```

### Frontend (React/JavaScript)

- Use functional components with hooks
- Follow React best practices
- Use meaningful component and variable names
- Keep components small and focused
- Use proper prop types

Example:
```javascript
function DatabaseCard({ database, onBackupStart }) {
  // Component implementation
}
```

## Testing

### Backend Tests

```bash
./scripts/test-backend.sh
```

Write tests for:
- API endpoints
- Database adapters
- Core business logic
- Utility functions

### Frontend Tests

```bash
cd frontend
npm test
```

## Database Migrations

When making changes to models:

1. **Generate migration**
   ```bash
   ./scripts/generate-migration.sh "description_of_change"
   ```

2. **Review the migration**
   Check the generated file in `backend/alembic/versions/`

3. **Apply migration**
   ```bash
   ./scripts/init-db.sh
   ```

## Adding a New Database Adapter

1. Create a new adapter in `backend/app/core/adapters/`
2. Inherit from `DatabaseAdapter` base class
3. Implement required methods:
   - `backup()`
   - `test_connection()`
   - `get_database_size()` (optional)

Example:
```python
from .base import DatabaseAdapter

class NewDatabaseAdapter(DatabaseAdapter):
    def backup(self, config: dict, output_path: str) -> dict:
        # Implementation
        pass
```

4. Register the adapter in the adapter factory

## Pull Request Process

1. **Update documentation**
   - Update README.md if adding new features
   - Add inline comments for complex logic
   - Update API documentation if needed

2. **Ensure tests pass**
   ```bash
   ./scripts/test-backend.sh
   cd frontend && npm test
   ```

3. **Check code style**
   ```bash
   # Backend
   cd backend
   flake8 app/

   # Frontend
   cd frontend
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Use conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Provide a clear description
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure CI passes

## Code Review

All submissions require review. We use GitHub pull requests for this purpose.

Reviewers will check for:
- Code quality and style
- Test coverage
- Documentation
- Performance implications
- Security concerns

## Reporting Bugs

Use GitHub Issues to report bugs. Include:

1. **Description** - Clear description of the bug
2. **Steps to reproduce** - Detailed steps to reproduce the issue
3. **Expected behavior** - What you expected to happen
4. **Actual behavior** - What actually happened
5. **Environment** - OS, Python version, Node version, etc.
6. **Screenshots** - If applicable

## Feature Requests

We welcome feature requests! Please:

1. Check existing issues first
2. Provide a clear use case
3. Explain why this feature would be useful
4. Consider implementation details

## Questions?

Feel free to open a GitHub Discussion or reach out to the maintainers.

Thank you for contributing!

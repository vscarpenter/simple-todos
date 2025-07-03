# Simple Todos Web App

This project is a simple web application that allows users to manage their to-do items. Users can create, edit, mark as completed, delete tasks, and sort them by text or date. The application leverages browser local storage to keep data persistent between sessions.

---

## Features

- Add new tasks.
- Edit existing tasks.
- Mark tasks as completed.
- Delete tasks.
- Sort tasks by text or date.
- Import and export tasks as JSON files.
- Persistent storage using browser local storage.

---

## Project Structure

```
simple-todos
├── index.html          # Main entry point of the application
├── styles              # Contains CSS stylesheets
│   └── components.css  # Styles for components and layout
├── scripts             # Contains JavaScript files
│   ├── app.js          # Main application logic
│   └── validation.js   # Input validation and error handling
├── Dockerfile          # Docker container configuration with security best practices
├── nginx.conf          # Custom nginx configuration with security headers
├── CLAUDE.md           # Project guidance for Claude Code
├── README.md           # Project documentation
└── .gitignore          # Files to be ignored by version control
```

## Setup Instructions

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd simple-todos
   ```

2. **Run locally:**
   - **Direct browser access:** Open `index.html` directly in your web browser
   - **Local server:** `python -m http.server 8000` then visit `http://localhost:8000`

### Docker Deployment

1. **Build the Docker image:**
   ```bash
   docker build -t simple-todos .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8080:8080 simple-todos
   ```

3. **Access the application:**
   Visit `http://localhost:8080`

## Usage

- **Creating a To-Do:** Enter a task in the input field and click the "Add" button.
- **Editing a To-Do:** Click on the task you want to edit, make your changes, and save.
- **Marking as Completed:** Click the checkbox next to a task to mark it as completed.
- **Deleting a To-Do:** Click the "Delete" button next to the task to remove it.
- **Sorting To-Dos:** Use the sort options to arrange tasks by text or date.
- **Importing/Exporting Tasks:** Use the import/export feature to manage your tasks as JSON files.

## Technologies Used

- **Frontend:** HTML5, CSS3 (Bootstrap 5.3.0), JavaScript (ES6+)
- **Containerization:** Docker with nginx:1.27.0-alpine
- **Security:** Custom nginx configuration with security headers

## Best Practices

### Frontend
- Semantic HTML for better accessibility and SEO
- XSS prevention via `textContent` usage and input sanitization
- JSON validation for imported files
- Input length limits and trimming
- JavaScript code is modular and reusable

### Docker Security
- Non-root user (appuser:1001) for container security
- Pinned base image version for reproducibility
- Security headers (CSP, XSS Protection, Frame Options, etc.)
- Non-privileged port (8080) instead of root port 80
- Health checks for container monitoring
- Optimized layer caching for faster builds

## Testing

### Manual Testing
- Test across modern browsers (Chrome, Firefox, Safari, Edge)
- Validate HTML/CSS using online validators
- Test import/export functionality with JSON files
- Verify localStorage persistence across browser sessions

### Docker Testing
- Verify container builds successfully
- Test application accessibility on exposed port
- Validate security headers are properly set

## Contribution

Feel free to fork the repository and submit pull requests for any improvements or features.

## License

This project is open-source and available under the MIT License.
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
todo-web-app
├── index.html          # Main entry point of the application
├── styles              # Contains CSS stylesheets
│   ├── layout.css      # Styles for overall layout
│   ├── typography.css   # Typography styles
│   └── components.css   # Styles for individual components
├── scripts             # Contains JavaScript files
│   ├── app.js          # Main application logic
│   └── validation.js    # Input validation and error handling
├── assets              # Contains assets like icons
│   └── icons           # Icon assets
├── README.md           # Project documentation
└── .gitignore          # Files to be ignored by version control
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd todo-web-app
   ```

2. **Open `index.html` in your web browser:**
   You can simply double-click the `index.html` file or open it using your preferred web browser.

## Usage

- **Creating a To-Do:** Enter a task in the input field and click the "Add" button.
- **Editing a To-Do:** Click on the task you want to edit, make your changes, and save.
- **Marking as Completed:** Click the checkbox next to a task to mark it as completed.
- **Deleting a To-Do:** Click the "Delete" button next to the task to remove it.
- **Sorting To-Dos:** Use the sort options to arrange tasks by text or date.
- **Importing/Exporting Tasks:** Use the import/export feature to manage your tasks as JSON files.

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)

## Best Practices

- The application follows semantic HTML for better accessibility and SEO.
- CSS is organized into separate files for layout, typography, and components.
- JavaScript code is modular and reusable, adhering to clean coding principles.

## Testing

- Ensure the application works across modern browsers.
- Validate HTML and CSS using online validators.

## Contribution

Feel free to fork the repository and submit pull requests for any improvements or features.

## License

This project is open-source and available under the MIT License.
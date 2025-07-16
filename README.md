# Cascade - Material Design 3 Task Management

Cascade is a privacy-first, client-side task management application implementing a Kanban-style workflow with multi-board support. Built with modern web technologies, it provides comprehensive task organization that runs entirely in the user's browser without requiring server infrastructure or user accounts.

**Watch your productivity flow.**

---

## ✨ Features

### **Core Functionality**
- **Material Design 3 Kanban Board**: Three-column layout (To-Do, In Progress, Completed) for visual task management
- **Drag & Drop**: Smooth drag-and-drop functionality with Material Design 3 animations and iOS Safari compatibility
- **Task Management**: Create, edit, move, and delete tasks with intuitive controls
- **Status Transitions**: Move tasks using drag-and-drop or dedicated action buttons
- **Real-time Counters**: Live task count display in each column header
- **Smart Archive System**: Automatic and manual archiving to keep your workspace clean

### **Material Design 3 Design System**
- **Modern Design System**: Colors, typography, and design patterns following Material Design 3 standards
- **Clean Interface**: Modern, uncluttered design with Material Design 3 aesthetics
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Visual Status Indicators**: Color-coded task cards and column headers using MD3 color tokens
- **Professional Typography**: Inter font family with proper Material Design 3 type scale

### **Enterprise Features**
- **Enhanced Export**: Export with metadata, status counts, archived tasks, and settings
- **Flexible Import**: Support for multiple file formats with automatic migration and archive restoration
- **Data Validation**: Comprehensive validation for imported data
- **Status Preservation**: Maintains all task statuses during import/export
- **Persistent Storage**: Browser local storage with automatic data migration
- **Archive Management**: Automated cleanup with customizable retention policies

---

## 🎨 Material Design 3 Design System

### **Color Palette**
- **Primary**: `#6750A4` - Primary brand color
- **Secondary**: `#625B71` - Secondary color for accents
- **Tertiary**: `#7D5260` - Tertiary color for highlights
- **Surface**: `#FFFBFE` - Surface background color
- **Background**: `#FFFBFE` - Main background color
- **Error**: `#BA1A1A` - Error states and destructive actions
- **Success**: `#00A67E` - Success states and positive actions
- **Warning**: `#FFB81C` - Warning states and caution elements

### **Typography**
- **Primary Font**: Inter (Light, Regular, Medium, SemiBold weights)
- **Type Scale**: Material Design 3 typography scale (Display, Headline, Title, Body, Label)
- **Font Weights**: Light (300), Regular (400), Medium (500), SemiBold (600)
- **Hierarchy**: Material Design 3 typography standards
- **Letter Spacing**: Optimized for readability across all text sizes

### **Visual Elements**
- **Material Buttons**: MD3 button variants with proper elevation and state layers
- **Clean Cards**: Surface backgrounds with Material Design 3 elevation system
- **Consistent Spacing**: Material Design 3 spacing tokens
- **Accessibility**: Proper focus states and color contrast ratios following MD3 guidelines

---

## 🏗️ Project Structure

```
cascade-todos/
├── index.html              # Main application entry point
├── styles/
│   └── components.css      # Material Design 3 system CSS
├── scripts/
│   ├── app.js             # Core application logic with drag-and-drop
│   └── validation.js      # Input validation and error handling
├── assets/
│   └── cascade-icon.svg   # Custom brand icon
├── prd.html              # Product Requirements Document
├── Dockerfile             # Docker configuration with security best practices
├── nginx.conf            # Custom nginx configuration with security headers
├── README.md             # Comprehensive project documentation
└── .gitignore           # Version control exclusions
```

---

## 🚀 Setup Instructions

### **Local Development**

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd cascade-todos
   ```

2. **Run locally:**
   ```bash
   # Option 1: Direct browser access
   open index.html
   
   # Option 2: Local HTTP server (recommended)
   python3 -m http.server 8000
   # Then visit http://localhost:8000
   
   # Option 3: Node.js server
   npx http-server -p 8000
   ```

### **Docker Deployment**

1. **Build and run:**
   ```bash
   docker build -t cascade-app .
   docker run -p 8080:8080 cascade-app
   ```

2. **Access the application:**
   Visit `http://localhost:8080`

---

## 📋 Usage Guide

### **Task Management**
- **Creating Tasks**: Enter task text and click "Add Task" - new tasks appear in To-Do column
- **Moving Tasks**: 
  - **Drag & Drop**: Click and drag task cards between columns with Material Design 3 animations
  - **Action Buttons**: Use "→ To-Do", "→ In Progress", "→ Completed" buttons on task cards
- **Editing Tasks**: Click "Edit" button on any task card to modify text
- **Deleting Tasks**: Click "Delete" button with Material Design 3 confirmation dialog

### **Board Features**
- **Task Counters**: Each column header shows real-time task count with Material Design 3 styling
- **Visual Status**: Task cards have Material Design 3 elevation and state layers
- **Responsive Layout**: Columns stack vertically on mobile devices
- **Material Animations**: Smooth transitions following Material Design 3 motion guidelines

### **Archive Management**

#### **Automatic Archiving**
- **Smart Cleanup**: Completed tasks are automatically archived after a customizable number of days (default: 30)
- **Startup Trigger**: Auto-archive runs every time you open the app to keep your workspace clean
- **Configurable Settings**: Adjust retention period (1-365 days) or disable auto-archiving entirely
- **Completion Tracking**: System automatically records when tasks are moved to "Done" status

#### **Manual Archive Controls**
- **Individual Tasks**: Click the 📦 button on completed tasks for immediate archiving
- **Bulk Archive**: Use the "📦 Archive" header button to archive all completed tasks at once
- **Archive View**: Click the 📦 button in the Done column header to browse archived tasks
- **Restore Tasks**: View archived tasks and restore any back to active status

#### **Archive Settings**
1. Click "⚙️ Settings" button in the header
2. Adjust auto-archive days (1-365 days)
3. Enable/disable automatic archiving
4. Settings are saved automatically and included in exports

### **Data Management**

#### **Exporting Tasks**
1. Click "Export Tasks" button
2. Review task distribution preview with Material Design 3 formatting
3. Confirm to download JSON file with format: `cascade-tasks-YYYY-MM-DD.json`
4. Export includes metadata, status counts, archived tasks, and settings

#### **Importing Tasks**
1. Click "Import Tasks" button
2. Select JSON file from your device
3. Application validates and processes data with comprehensive error handling
4. View detailed import summary with status breakdown and archive restoration

---

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Design System**: Material Design 3 compliant CSS
- **Typography**: Inter font family with Material Design 3 type scale
- **Drag & Drop**: Native HTML5 Drag and Drop API with MD3 animations
- **Storage**: Browser localStorage with JSON serialization
- **Containerization**: Docker with nginx:1.27.0-alpine
- **Security**: CSP headers, XSS prevention, input sanitization

---

## 📊 Data Formats

### **Enhanced Export Format (v3.0)**
```json
{
  "exportDate": "2025-07-10T23:00:00.000Z",
  "version": "3.0",
  "totalTasks": 5,
  "totalArchivedTasks": 12,
  "statusCounts": {
    "todo": 2,
    "doing": 2,
    "done": 1
  },
  "tasks": [
    {
      "id": "unique-identifier",
      "text": "Task description",
      "status": "todo|doing|done",
      "createdDate": "YYYY-MM-DD",
      "completedDate": "YYYY-MM-DD"
    }
  ],
  "archivedTasks": [
    {
      "id": "archived-task-id",
      "text": "Completed task description",
      "status": "done",
      "createdDate": "YYYY-MM-DD",
      "completedDate": "YYYY-MM-DD",
      "archived": true,
      "archivedDate": "YYYY-MM-DD"
    }
  ],
  "settings": {
    "autoArchiveDays": 30,
    "enableAutoArchive": true
  }
}
```

---

## 🏛️ Board Columns

### **📋 To-Do (Primary Color)**
- New tasks start here automatically
- Planning and backlog items
- Tasks awaiting action

### **⚡ In Progress (Secondary Color)**
- Tasks currently in progress
- Active work items
- Items being worked on

### **✅ Completed (Success Color)**
- Completed tasks with automatic cleanup
- Recent accomplishments (auto-archived after 30 days by default)
- Individual archive controls with 📦 button
- Archive view accessible via column header 📦 button

---

## 🔒 Security & Best Practices

### **Frontend Security**
- **XSS Prevention**: Input sanitization and output encoding
- **Input Validation**: Length limits (200 characters) and data type checking
- **JSON Validation**: Comprehensive validation for imported files
- **Error Handling**: Professional error messages following brand voice

### **Brand Compliance**
- **Color Usage**: All colors used at 100% opacity as specified
- **Typography**: Proper font weights and hierarchy
- **Voice & Tone**: Professional, straightforward, and helpful messaging
- **Accessibility**: Proper focus states and keyboard navigation

### **Code Quality**
- **Modular JavaScript**: Clean, reusable functions with proper documentation
- **Semantic HTML**: Accessible markup with proper ARIA labels
- **Professional CSS**: Following modern design patterns
- **Error Boundaries**: Comprehensive error handling throughout the application

---

## 📱 Responsive Design

- **Desktop**: Full three-column layout with professional spacing
- **Tablet**: Optimized column spacing and touch interactions
- **Mobile**: Stacked column layout with touch-friendly controls
- **Accessibility**: Keyboard navigation and screen reader support

---

## 🧪 Testing

### **Manual Testing Checklist**
- [ ] Create, edit, and delete tasks
- [ ] Drag tasks between all columns (including iOS Safari)
- [ ] Use status buttons to move tasks
- [ ] Test archive functionality (individual and bulk)
- [ ] Configure archive settings (days and enable/disable)
- [ ] View and restore archived tasks
- [ ] Test export with task preview (including archived tasks)
- [ ] Import files in different formats with archive restoration
- [ ] Verify auto-archive runs on app startup
- [ ] Verify data persistence across browser sessions
- [ ] Test responsive design on different screen sizes
- [ ] Validate brand compliance and professional appearance

### **Browser Compatibility**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 🎯 Professional Standards

This application follows modern web development best practices:
- **Colors**: Professional color palette with proper contrast ratios
- **Typography**: Inter font family with proper weights and hierarchy
- **Voice**: Professional, straightforward, and helpful tone
- **Design**: Clean, modern, and uncluttered interface
- **CTAs**: Proper button styling and hierarchy
- **Accessibility**: Focus states and proper contrast ratios

---

## 📄 License

This project is open-source and available under the **MIT License**.

---

## 👨‍💻 Author

**Vinny Carpenter** - https://vinny.dev/

---

*Built with professional standards and modern design system compliance.*

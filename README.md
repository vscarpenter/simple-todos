# Cascade - Material Design 3 Task Management

A modern, Material Design 3 compliant task management web application with a clean, accessible design system. Cascade allows users to organize their tasks across three columns: To-Do, In Progress, and Completed. Built with Material Design 3 principles, intuitive interactions, and a polished user interface that follows Google's latest design guidelines.

**Watch your productivity flow.**

---

## ✨ Features

### **Core Functionality**
- **Material Design 3 Kanban Board**: Three-column layout (To-Do, In Progress, Completed) for visual task management
- **Drag & Drop**: Smooth drag-and-drop functionality with Material Design 3 animations
- **Task Management**: Create, edit, move, and delete tasks with intuitive controls
- **Status Transitions**: Move tasks using drag-and-drop or dedicated action buttons
- **Real-time Counters**: Live task count display in each column header

### **Material Design 3 Design System**
- **Modern Design System**: Colors, typography, and design patterns following Material Design 3 standards
- **Clean Interface**: Modern, uncluttered design with Material Design 3 aesthetics
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Visual Status Indicators**: Color-coded task cards and column headers using MD3 color tokens
- **Professional Typography**: Inter font family with proper Material Design 3 type scale

### **Enterprise Features**
- **Enhanced Export**: Export with metadata, status counts, and date information
- **Flexible Import**: Support for multiple file formats with automatic migration
- **Data Validation**: Comprehensive validation for imported data
- **Status Preservation**: Maintains all task statuses during import/export
- **Persistent Storage**: Browser local storage with automatic data migration

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

### **Data Management**

#### **Exporting Tasks**
1. Click "Export Tasks" button
2. Review task distribution preview with Material Design 3 formatting
3. Confirm to download JSON file with format: `cascade-tasks-YYYY-MM-DD.json`
4. Export includes metadata, status counts, and all task data

#### **Importing Tasks**
1. Click "Import Tasks" button
2. Select JSON file from your device
3. Application validates and processes data with comprehensive error handling
4. View detailed import summary with status breakdown

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

### **Enhanced Export Format (v2.0)**
```json
{
  "exportDate": "2025-01-06T23:00:00.000Z",
  "version": "2.0",
  "appName": "Cascade",
  "totalTasks": 5,
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
      "createdDate": "YYYY-MM-DD"
    }
  ]
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
- Completed tasks
- Finished work items
- Accomplished goals

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
- [ ] Drag tasks between all columns
- [ ] Use status buttons to move tasks
- [ ] Test export with task preview
- [ ] Import files in different formats
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
- **Typography**: Guardian Sans font family with proper weights and hierarchy
- **Voice**: Professional, straightforward, and helpful tone
- **Design**: Clean, modern, and uncluttered interface
- **CTAs**: Proper button styling and hierarchy
- **Accessibility**: Focus states and proper contrast ratios

---

## 📄 License

This project is open-source and available under the **MIT License**.

---

## 👨‍💻 Author

**Vinny Carpenter** - Full-stack developer specializing in enterprise-grade web applications with professional design systems.

---

*Built with professional standards and modern design system compliance.*
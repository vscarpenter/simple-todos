# Professional Task Management Board

A professional, enterprise-grade task management web application with a clean, modern design system. The application allows users to organize their tasks across three columns: To-Do, In Progress, and Completed. Built with professional typography, intuitive interactions, and a polished user interface.

---

## ✨ Features

### **Core Functionality**
- **Professional Kanban Board**: Three-column layout (To-Do, In Progress, Completed) for visual task management
- **Drag & Drop**: Smooth drag-and-drop functionality to move tasks between columns
- **Task Management**: Create, edit, move, and delete tasks with intuitive controls
- **Status Transitions**: Move tasks using drag-and-drop or dedicated action buttons
- **Real-time Counters**: Live task count display in each column header

### **Professional Design**
- **Modern Design System**: Colors, typography, and design patterns following professional standards
- **Clean Interface**: Modern, uncluttered design with professional aesthetics
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Visual Status Indicators**: Color-coded task cards and column headers
- **Professional Typography**: Guardian Sans font family with proper weights and hierarchy

### **Enterprise Features**
- **Enhanced Export**: Export with metadata, status counts, and date information
- **Flexible Import**: Support for multiple file formats with automatic migration
- **Data Validation**: Comprehensive validation for imported data
- **Status Preservation**: Maintains all task statuses during import/export
- **Persistent Storage**: Browser local storage with automatic data migration

---

## 🎨 Design System

### **Color Palette**
- **Primary Blue**: `#002B49` - Primary brand blue
- **Digital Blue**: `#0E497B` - Secondary blue for backgrounds and CTAs
- **Brand Gold**: `#FFB81C` - Primary action color and accents
- **Gun Grey**: `#2A2A2A` - Primary text color
- **Storm**: `#EDF0F3` - Background color for modules
- **Cloud**: `#F8FAFC` - Light background color

### **Typography**
- **Primary Font**: Guardian Sans (Light, Regular, Medium weights)
- **Secondary Font**: Arial (fallback)
- **Font Weights**: Light (300), Regular (400), Medium (500)
- **Hierarchy**: Professional digital typography standards

### **Visual Elements**
- **Professional Buttons**: Gold CTAs with proper hover states
- **Clean Cards**: White backgrounds with subtle shadows and brand-colored borders
- **Consistent Spacing**: Professional spacing following the style guide
- **Accessibility**: Proper focus states and color contrast ratios

---

## 🏗️ Project Structure

```
simple-todos/
├── index.html              # Main application entry point
├── styles/
│   └── components.css      # Professional design system CSS
├── scripts/
│   ├── app.js             # Core application logic with drag-and-drop
│   └── validation.js      # Input validation and error handling
├── Digital Style Guide.pdf # Design system style guide
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
   cd simple-todos
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
   docker build -t task-board .
   docker run -p 8080:8080 task-board
   ```

2. **Access the application:**
   Visit `http://localhost:8080`

---

## 📋 Usage Guide

### **Task Management**
- **Creating Tasks**: Enter task text and click "Add Task" - new tasks appear in To-Do column
- **Moving Tasks**: 
  - **Drag & Drop**: Click and drag task cards between columns
  - **Action Buttons**: Use "→ To-Do", "→ In Progress", "→ Completed" buttons on task cards
- **Editing Tasks**: Click "Edit" button on any task card to modify text
- **Deleting Tasks**: Click "Delete" button with confirmation dialog

### **Board Features**
- **Task Counters**: Each column header shows real-time task count
- **Visual Status**: Task cards have colored left borders indicating status
- **Responsive Layout**: Columns stack vertically on mobile devices
- **Professional Animations**: Smooth transitions following brand guidelines

### **Data Management**

#### **Exporting Tasks**
1. Click "Export Tasks" button
2. Review task distribution preview with professional formatting
3. Confirm to download JSON file with format: `task-board-YYYY-MM-DD.json`
4. Export includes metadata, status counts, and all task data

#### **Importing Tasks**
1. Click "Import Tasks" button
2. Select JSON file from your device
3. Application validates and processes data with comprehensive error handling
4. View detailed import summary with status breakdown

---

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Professional design system compliant CSS
- **Typography**: Guardian Sans font family (with Arial fallback)
- **Drag & Drop**: Native HTML5 Drag and Drop API
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

### **📋 To-Do (Digital Blue)**
- New tasks start here automatically
- Planning and backlog items
- Tasks awaiting action

### **⚡ In Progress (Brand Gold)**
- Tasks currently in progress
- Active work items
- Items being worked on

### **✅ Completed (Success Green)**
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
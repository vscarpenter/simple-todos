# Git Reset Guide

This guide explains how to use Git commands to reset your project to its original state.

---

## 1. **Check the Current Status**

Before making any changes, check the current state of your repository to see which files have been modified or added.

```bash
git status
```

### Explanation:
- This command shows the status of your working directory and staging area.
- It lists modified, added, or deleted files.

---

## 2. **Reset to the Last Commit**

If you want to discard all changes made since the last commit, use the following command:

```bash
git reset --hard
```

### Explanation:
- This command resets your working directory and staging area to match the last commit.
- All uncommitted changes will be **discarded**.

---

## 3. **Reset to a Specific Commit**

If you want to reset to a specific commit (e.g., the commit where you started), follow these steps:

### Step 1: Find the Commit Hash
Run the following command to view the commit history:

```bash
git log
```

### Step 2: Reset to the Desired Commit
Once you have the commit hash, reset to that specific commit:

```bash
git reset --hard <commit-hash>
```

### Explanation:
- This command resets your working directory and staging area to the specified commit.
- Replace `<commit-hash>` with the actual hash of the commit you want to reset to.

---

## 4. **Clean Untracked Files**

If there are untracked files (e.g., new files added during the changes), remove them using the following command:

```bash
git clean -fd
```

### Explanation:
- `-f`: Forces the removal of untracked files.
- `-d`: Removes untracked directories as well.

---

## 5. **Verify the Reset**

After resetting, check the status of your repository to ensure everything is back to its original state:

```bash
git status
```

### Explanation:
- This command confirms that your working directory is clean and matches the specified commit.

---

## 6. **Backup Changes (Optional)**

If you want to keep the changes for reference before resetting, create a new branch:

```bash
git checkout -b backup-changes
```

### Explanation:
- This command creates a new branch named `backup-changes` and switches to it.
- Your changes will be saved in this branch, and you can reset the main branch without losing your work.

---

## 7. **Undo a Reset (Optional)**

If you accidentally reset and want to undo it, you can use the following commands:

### Step 1: View the Reflog
```bash
git reflog
```

### Step 2: Reset to the Previous Commit
Find the commit hash of the previous state and reset to it:

```bash
git reset --hard <previous-commit-hash>
```

### Explanation:
- The `git reflog` command shows a history of all actions performed in the repository, including resets.
- Use the commit hash from the reflog to undo the reset.

---

## Summary of Commands

| Command                          | Description                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| `git status`                     | Check the current status of the repository.                                 |
| `git reset --hard`               | Reset to the last commit and discard all changes.                           |
| `git log`                        | View the commit history.                                                    |
| `git reset --hard <commit-hash>` | Reset to a specific commit.                                                 |
| `git clean -fd`                  | Remove untracked files and directories.                                     |
| `git checkout -b backup-changes` | Create a new branch to back up changes.                                     |
| `git reflog`                     | View a history of all actions performed in the repository.                  |
| `git reset --hard <hash>`        | Undo a reset by resetting to a previous commit from the reflog.             |

---

This guide provides all the necessary Git commands to reset your project and manage changes effectively. Let me know if you need further assistance!
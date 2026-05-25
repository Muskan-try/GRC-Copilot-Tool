# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- When making structural changes to JSX/React files with complex nesting (multiple containers, modals, conditional rendering), apply changes in a single comprehensive edit rather than incremental small edits, because small edits compound and break the structural balance. Use Python scripts or write the full file when necessary. Confidence: 0.75
- After making JSX/React structural changes, run the build (`vite build` or equivalent) to validate the file compiles and check div balance equals 0. Confidence: 0.85
- Use Python heredoc scripts (`python3 << 'PYEOF' ... PYEOF`) via shell_command for file edits instead of edit_file, because project files use CRLF line endings (`\\r\\n`) which cause edit_file's exact string matching to fail. Confidence: 0.80
- When implementing features, prioritize high accuracy and avoid modifying any code beyond what is strictly necessary for the change. The user explicitly rejects unnecessary refactoring or changes. Confidence: 0.75

# ux
- Show loading/scanning indicators to the user during long-running background operations so they are aware the system is working. Confidence: 0.70


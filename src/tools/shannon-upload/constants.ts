export const SHANNON_UPLOAD_DESCRIPTION = `Execute file upload vulnerability testing inside the Shannon Docker container.

Tests file upload endpoints for dangerous file type acceptance, XML External Entity (XXE) injection, YAML deserialization attacks, polyglot files, and path traversal via filenames.

Testing methodology:
1. Identify file upload endpoints (multipart/form-data)
2. Test dangerous file types: .php, .jsp, .exe, .sh, .py, .svg (XSS)
3. Test XXE via XML/SVG/DOCX uploads with external entity declarations
4. Test YAML bomb/deserialization via .yml/.yaml uploads
5. Test path traversal via filename manipulation (../../etc/passwd)
6. Test null byte injection in filenames (file.php%00.jpg)
7. Test content-type bypass (upload .php with image/jpeg content-type)

Example commands:
- XXE test: curl -X POST target/file-upload -F "file=@xxe.xml;type=text/xml"
- SVG XSS: curl -X POST target/file-upload -F "file=@xss.svg;type=image/svg+xml"
- YAML bomb: curl -X POST target/file-upload -F "file=@bomb.yaml;type=application/x-yaml"
- Extension bypass: curl -X POST target/file-upload -F "file=@shell.php%00.jpg"

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`

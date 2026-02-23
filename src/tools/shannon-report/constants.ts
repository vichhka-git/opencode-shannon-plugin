export const SHANNON_REPORT_DESCRIPTION = `Format penetration test findings into a structured report.

Takes the accumulated findings from recon, vulnerability discovery, and exploitation phases and formats them into a professional report.

Output formats: markdown (default), JSON, HTML, PDF

When using PDF format with output_file, generates a styled PDF report natively inside the Docker container using Python/reportlab. No external dependencies like pandoc or weasyprint are required.`

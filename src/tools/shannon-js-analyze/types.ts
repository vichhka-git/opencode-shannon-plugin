export interface JsAnalyzeResult {
  url: string
  api_keys: Finding[]
  credentials: Finding[]
  emails: Finding[]
  interesting_comments: Finding[]
  xss_vulnerabilities: Finding[]
  xss_functions: Finding[]
  api_endpoints: EndpointFinding[]
  parameters: ParameterFinding[]
  paths_directories: PathFinding[]
  errors: string[]
  file_size: number
  analysis_timestamp: string
}

export interface Finding {
  type: string
  match: string
  line: number
  line_content: string
  context: string
  context_start_line: number
  context_end_line: number
  severity?: string
}

export interface EndpointFinding {
  method: string
  path: string
  line: number
  full_match: string
  line_content?: string
}

export interface ParameterFinding {
  type: string
  parameter: string
  param_name: string | null
  param_value: string | null
  line: number
  full_match: string
  line_content: string
  context: string
  context_start_line: number
  context_end_line: number
}

export interface PathFinding {
  type: string
  path: string
  line: number
  full_match: string
  line_content: string
}

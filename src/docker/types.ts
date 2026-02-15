export interface DockerToolExecution {
  tool: string
  args: string[]
  timeout?: number
  workdir?: string
}

export interface DockerExecutionResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}

export interface ShannonDockerConfig {
  imageName: string
  containerName: string
}

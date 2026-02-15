import { exec } from "node:child_process"
import { promisify } from "node:util"
import pc from "picocolors"
import type { DockerExecutionResult, ShannonDockerConfig } from "./types"
import { DOCKER_CONTAINER_NAME, DOCKER_IMAGE_NAME, DEFAULT_TIMEOUT } from "./constants"

const execAsync = promisify(exec)

export class DockerManager {
  private static instance: DockerManager | null = null
  private containerRunning = false
  private readonly imageName: string
  private readonly containerName: string

  constructor(config?: Partial<ShannonDockerConfig>) {
    this.imageName = config?.imageName ?? DOCKER_IMAGE_NAME
    this.containerName = config?.containerName ?? DOCKER_CONTAINER_NAME
  }

  static getInstance(config?: Partial<ShannonDockerConfig>): DockerManager {
    if (!DockerManager.instance) {
      DockerManager.instance = new DockerManager(config)
    }
    return DockerManager.instance
  }

  static resetInstance(): void {
    DockerManager.instance = null
  }

  async ensureRunning(): Promise<void> {
    if (this.containerRunning) {
      try {
        const { stdout } = await execAsync(
          `docker inspect -f '{{.State.Running}}' ${this.containerName}`
        )
        if (stdout.trim() === "true") return
      } catch {
      }
      this.containerRunning = false
    }

    try {
      await execAsync("docker --version")
    } catch {
      throw new Error(
        "Docker is not installed. Install Docker Desktop: https://docs.docker.com/get-docker/"
      )
    }

    try {
      const { stdout } = await execAsync(
        `docker inspect -f '{{.State.Running}}' ${this.containerName}`
      )
      if (stdout.trim() === "true") {
        console.log(pc.green(`[DockerManager] Container "${this.containerName}" already running`))
        this.containerRunning = true
        return
      }
      console.log(pc.cyan(`[DockerManager] Removing stopped container "${this.containerName}"...`))
      await execAsync(`docker rm -f ${this.containerName}`)
    } catch {
    }

    try {
      await execAsync(`docker image inspect ${this.imageName}`)
    } catch {
      throw new Error(
        `Docker image "${this.imageName}" not found. Build it first:\n` +
          `  docker build -t ${this.imageName} .`
      )
    }

    console.log(pc.cyan(`[DockerManager] Starting container "${this.containerName}"...`))
    await execAsync(
      `docker run -d --name ${this.containerName} --network host ${this.imageName} tail -f /dev/null`
    )
    this.containerRunning = true
    console.log(pc.green(`[DockerManager] Container "${this.containerName}" is running`))
  }

  async exec(command: string, timeout = DEFAULT_TIMEOUT): Promise<DockerExecutionResult> {
    if (!this.containerRunning) {
      await this.ensureRunning()
    }

    const startTime = Date.now()

    try {
      const escaped = command.replace(/'/g, "'\"'\"'")
      const { stdout, stderr } = await execAsync(
        `docker exec ${this.containerName} bash -c '${escaped}'`,
        { timeout, maxBuffer: 10 * 1024 * 1024 }
      )

      return {
        success: true,
        stdout,
        stderr,
        exitCode: 0,
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        success: false,
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? error.message,
        exitCode: error.code ?? 1,
        duration: Date.now() - startTime,
      }
    }
  }

  async execTool(tool: string, args: string[], timeout?: number): Promise<DockerExecutionResult> {
    const command = [tool, ...args].join(" ")
    return this.exec(command, timeout)
  }

  async cleanup(): Promise<void> {
    console.log(pc.cyan(`[DockerManager] Stopping container "${this.containerName}"...`))
    try {
      await execAsync(`docker rm -f ${this.containerName}`)
      this.containerRunning = false
      console.log(pc.green(`[DockerManager] Container "${this.containerName}" removed`))
    } catch (error) {
      console.error(pc.red("[DockerManager] Cleanup failed:"), error)
    }
  }

  isRunning(): boolean {
    return this.containerRunning
  }

  getContainerName(): string {
    return this.containerName
  }

  getImageName(): string {
    return this.imageName
  }
}

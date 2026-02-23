import { exec } from "node:child_process"
import { promisify } from "node:util"
import pc from "picocolors"
import type { DockerExecutionResult, ShannonDockerConfig } from "./types"
import { DOCKER_CONTAINER_NAME, DOCKER_IMAGE_NAME, DEFAULT_TIMEOUT } from "./constants"

const execAsync = promisify(exec)

const MAX_BUFFER = 50 * 1024 * 1024 // 50MB — large scan outputs (nmap, nuclei)

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
      } catch (error) {
        console.warn(
          pc.yellow(`[DockerManager] Container health check failed, resetting state`),
          error instanceof Error ? error.message : error
        )
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
      // Container doesn't exist yet — expected on first run
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
    const cwd = process.cwd()
    await execAsync(
      `docker run -d --name ${this.containerName} --network host ` +
        `--cap-add=NET_RAW --cap-add=NET_ADMIN ` +
        `-v "${cwd}:/workspace" ${this.imageName} tail -f /dev/null`
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
      // Base64-encode the command to avoid all shell escaping issues.
      // The encoded string contains only [A-Za-z0-9+/=] — safe in any shell context.
      // Decode to a unique temp file so the command's own stdin remains available,
      // and concurrent exec() calls don't collide.
      const encoded = Buffer.from(command).toString("base64")
      const cmdId = `_sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const wrapper =
        `echo "${encoded}" | base64 -d > /tmp/${cmdId}.sh && ` +
        `bash /tmp/${cmdId}.sh; _rc=$?; rm -f /tmp/${cmdId}.sh; exit $_rc`

      const { stdout, stderr } = await execAsync(
        `docker exec ${this.containerName} bash -c '${wrapper}'`,
        { timeout, maxBuffer: MAX_BUFFER }
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

  /**
   * Copy a file or directory from the Docker container to the host filesystem.
   */
  async copyFromContainer(
    containerPath: string,
    hostPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync(
        `docker cp ${this.containerName}:"${containerPath}" "${hostPath}"`,
        { timeout: 30000 }
      )
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async cleanup(): Promise<void> {
    console.log(pc.cyan(`[DockerManager] Stopping container "${this.containerName}"...`))
    try {
      await execAsync(`docker rm -f ${this.containerName}`)
      this.containerRunning = false
      console.log(pc.green(`[DockerManager] Container "${this.containerName}" removed`))
    } catch (error) {
      console.error(pc.red("[DockerManager] Cleanup failed:"), error)
      this.containerRunning = false
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

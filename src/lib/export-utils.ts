export interface ExportMetadata {
  projectId: string
  component: string
  filtersApplied: Record<string, any>
  generatedAt: string
  exportScope: "selected" | "filtered" | "all"
  totalRecords: number
}

export interface ExportJob {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  downloadUrl?: string
  error?: string
  createdAt: string
  estimatedCompletion?: string
}

export class ExportManager {
  static async exportToCSV(data: any[], metadata: ExportMetadata): Promise<string | ExportJob> {
    // For small datasets, return CSV directly
    if (data.length <= 1000) {
      return this.generateCSV(data, metadata)
    }

    // For large datasets, queue background job
    return this.queueExportJob("csv", data, metadata)
  }

  static async exportToPDF(
    data: any[],
    metadata: ExportMetadata,
    options?: { includeCharts?: boolean },
  ): Promise<string | ExportJob> {
    // Always use background job for PDF generation
    return this.queueExportJob("pdf", data, metadata, options)
  }

  static async exportSVGToPNG(svgElement: SVGSVGElement, filename: string): Promise<void> {
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            this.downloadFile(url, filename)
            resolve()
          } else {
            reject(new Error("Failed to generate PNG"))
          }
        }, "image/png")
      }

      img.onerror = reject
      img.src = "data:image/svg+xml;base64," + btoa(svgData)
    })
  }

  static async exportSVG(svgElement: SVGSVGElement, filename: string): Promise<void> {
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    this.downloadFile(url, filename)
  }

  private static generateCSV(data: any[], metadata: ExportMetadata): string {
    if (data.length === 0) return ""

    // Add metadata header
    const metadataRows = [
      `# Export Metadata`,
      `# Project ID: ${metadata.projectId}`,
      `# Component: ${metadata.component}`,
      `# Generated At: ${metadata.generatedAt}`,
      `# Export Scope: ${metadata.exportScope}`,
      `# Total Records: ${metadata.totalRecords}`,
      `# Filters Applied: ${JSON.stringify(metadata.filtersApplied)}`,
      ``,
    ]

    // Generate CSV headers and rows
    const headers = Object.keys(data[0])
    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma or quote
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(","),
    )

    return [...metadataRows, headers.join(","), ...csvRows].join("\n")
  }

  private static async queueExportJob(
    format: string,
    data: any[],
    metadata: ExportMetadata,
    options?: any,
  ): Promise<ExportJob> {
    // Simulate API call to queue background job
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const job: ExportJob = {
      id: jobId,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 30000).toISOString(), // 30 seconds estimate
    }

    // Simulate background processing
    setTimeout(() => {
      job.status = "processing"
      job.progress = 50
    }, 2000)

    setTimeout(() => {
      job.status = "completed"
      job.progress = 100
      job.downloadUrl = `/api/exports/${jobId}/download`
    }, 10000)

    return job
  }

  private static downloadFile(url: string, filename: string): void {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  static getExportFilename(component: string, format: string, scope: string): string {
    const timestamp = new Date().toISOString().split("T")[0]
    return `${component}_${scope}_${timestamp}.${format}`
  }
}

import apiService from './apiService';

class ExportService {
  constructor() {
    this.baseURL = '/api/v1/export';
    this.supportedFormats = ['csv', 'xlsx', 'json', 'pdf'];
    this.exportQueue = new Map();
    this.downloadHistory = [];
  }

  // Generic export method
  async exportData(endpoint, options = {}) {
    const {
      format = 'csv',
      filename = null,
      filters = {},
      columns = [],
      dateRange = null,
      compress = false,
      includeHeaders = true,
      onProgress = null
    } = options;

    // Validate format
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    try {
      const exportId = this.generateExportId();
      const params = new URLSearchParams({
        format,
        includeHeaders: includeHeaders.toString(),
        compress: compress.toString(),
        ...filters
      });

      if (columns.length > 0) {
        params.append('columns', columns.join(','));
      }

      if (dateRange) {
        params.append('dateFrom', dateRange.from);
        params.append('dateTo', dateRange.to);
      }

      // For large exports, use the queue system
      if (compress || format === 'pdf') {
        return this.queueExport(endpoint, params, filename, onProgress);
      }

      // Direct download for small exports
      const response = await apiService.get(`${this.baseURL}${endpoint}?${params}`, {
        responseType: 'blob',
        onDownloadProgress: onProgress
      });

      const blob = new Blob([response.data], {
        type: this.getMimeType(format)
      });

      const downloadFilename = filename || this.generateFilename(endpoint, format);
      this.downloadBlob(blob, downloadFilename);

      // Add to download history
      this.addToHistory({
        id: exportId,
        endpoint,
        format,
        filename: downloadFilename,
        size: blob.size,
        timestamp: new Date(),
        status: 'completed'
      });

      return { success: true, filename: downloadFilename, size: blob.size };

    } catch (error) {
      console.error('[ExportService] Export failed:', error);
      throw new Error(error.message || 'Export failed');
    }
  }

  // Queue export for processing
  async queueExport(endpoint, params, filename, onProgress) {
    try {
      const response = await apiService.post(`${this.baseURL}/queue`, {
        endpoint,
        params: Object.fromEntries(params),
        filename
      });

      const { exportId, estimatedTime } = response.data;
      
      // Add to export queue
      this.exportQueue.set(exportId, {
        endpoint,
        filename,
        status: 'queued',
        progress: 0,
        estimatedTime,
        onProgress
      });

      // Start polling for progress
      this.pollExportProgress(exportId);

      return { exportId, estimatedTime };

    } catch (error) {
      throw new Error(error.message || 'Failed to queue export');
    }
  }

  // Poll export progress
  async pollExportProgress(exportId) {
    const pollInterval = 2000; // 2 seconds
    const maxPolls = 150; // 5 minutes maximum
    let pollCount = 0;

    const poll = async () => {
      try {
        const response = await apiService.get(`${this.baseURL}/status/${exportId}`);
        const { status, progress, downloadUrl, error } = response.data;

        const exportInfo = this.exportQueue.get(exportId);
        if (exportInfo) {
          exportInfo.status = status;
          exportInfo.progress = progress;
          
          if (exportInfo.onProgress) {
            exportInfo.onProgress({ status, progress });
          }
        }

        if (status === 'completed' && downloadUrl) {
          // Download the file
          await this.downloadFromUrl(downloadUrl, exportInfo?.filename);
          
          // Remove from queue
          this.exportQueue.delete(exportId);
          
          // Add to history
          this.addToHistory({
            id: exportId,
            endpoint: exportInfo?.endpoint,
            filename: exportInfo?.filename,
            status: 'completed',
            timestamp: new Date()
          });

        } else if (status === 'failed') {
          console.error('[ExportService] Export failed:', error);
          this.exportQueue.delete(exportId);
          throw new Error(error || 'Export processing failed');
          
        } else if (status === 'processing' || status === 'queued') {
          // Continue polling
          pollCount++;
          if (pollCount < maxPolls) {
            setTimeout(poll, pollInterval);
          } else {
            throw new Error('Export timeout');
          }
        }

      } catch (error) {
        console.error('[ExportService] Polling error:', error);
        this.exportQueue.delete(exportId);
        throw error;
      }
    };

    poll();
  }

  // Download file from URL
  async downloadFromUrl(url, filename) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);
      
      return { success: true, filename, size: blob.size };
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  // Download blob as file
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Railway-specific export methods
  async exportTrains(options = {}) {
    return this.exportData('/trains', {
      filename: 'trains_export',
      ...options
    });
  }

  async exportSections(options = {}) {
    return this.exportData('/sections', {
      filename: 'sections_export',
      ...options
    });
  }

  async exportOptimizationResults(runId, options = {}) {
    return this.exportData(`/optimization/${runId}`, {
      filename: `optimization_results_${runId}`,
      ...options
    });
  }

  async exportAnalytics(type, options = {}) {
    return this.exportData(`/analytics/${type}`, {
      filename: `analytics_${type}`,
      ...options
    });
  }

  async exportDelayReport(options = {}) {
    return this.exportData('/analytics/delays', {
      filename: 'delay_report',
      format: 'pdf',
      ...options
    });
  }

  async exportThroughputReport(options = {}) {
    return this.exportData('/analytics/throughput', {
      filename: 'throughput_report',
      format: 'xlsx',
      ...options
    });
  }

  async exportSystemReport(options = {}) {
    return this.exportData('/analytics/system', {
      filename: 'system_report',
      format: 'pdf',
      compress: true,
      ...options
    });
  }

  // Template exports
  async exportTrainTemplate(format = 'csv') {
    try {
      const response = await apiService.get(`${this.baseURL}/templates/trains?format=${format}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: this.getMimeType(format)
      });

      const filename = `train_import_template.${format}`;
      this.downloadBlob(blob, filename);

      return { success: true, filename };
    } catch (error) {
      throw new Error(`Template export failed: ${error.message}`);
    }
  }

  async exportSectionTemplate(format = 'csv') {
    try {
      const response = await apiService.get(`${this.baseURL}/templates/sections?format=${format}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: this.getMimeType(format)
      });

      const filename = `section_import_template.${format}`;
      this.downloadBlob(blob, filename);

      return { success: true, filename };
    } catch (error) {
      throw new Error(`Template export failed: ${error.message}`);
    }
  }

  // Batch export
  async exportBatch(exports, options = {}) {
    const { format = 'zip', filename = 'batch_export' } = options;

    try {
      const response = await apiService.post(`${this.baseURL}/batch`, {
        exports,
        format,
        filename
      });

      const { exportId } = response.data;
      return this.pollExportProgress(exportId);
    } catch (error) {
      throw new Error(`Batch export failed: ${error.message}`);
    }
  }

  // Cancel export
  async cancelExport(exportId) {
    try {
      await apiService.delete(`${this.baseURL}/cancel/${exportId}`);
      this.exportQueue.delete(exportId);
      return true;
    } catch (error) {
      console.error('[ExportService] Cancel failed:', error);
      return false;
    }
  }

  // Get export status
  getExportStatus(exportId) {
    return this.exportQueue.get(exportId) || null;
  }

  // Get all queued exports
  getQueuedExports() {
    return Array.from(this.exportQueue.entries()).map(([id, info]) => ({
      id,
      ...info
    }));
  }

  // Utility methods
  generateExportId() {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateFilename(endpoint, format) {
    const timestamp = new Date().toISOString().split('T')[0];
    const name = endpoint.replace(/^\//, '').replace(/\//g, '_');
    return `${name}_${timestamp}.${format}`;
  }

  getMimeType(format) {
    const mimeTypes = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
      pdf: 'application/pdf',
      zip: 'application/zip'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  // Download history management
  addToHistory(exportInfo) {
    this.downloadHistory.unshift(exportInfo);
    
    // Keep only last 50 downloads
    if (this.downloadHistory.length > 50) {
      this.downloadHistory = this.downloadHistory.slice(0, 50);
    }
    
    // Save to localStorage
    this.saveHistory();
  }

  getHistory() {
    return [...this.downloadHistory];
  }

  clearHistory() {
    this.downloadHistory = [];
    this.saveHistory();
  }

  saveHistory() {
    try {
      localStorage.setItem('exportHistory', JSON.stringify(this.downloadHistory));
    } catch (error) {
      console.error('[ExportService] Failed to save history:', error);
    }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('exportHistory');
      if (saved) {
        this.downloadHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[ExportService] Failed to load history:', error);
    }
  }

  // Format validation
  validateFormat(format) {
    return this.supportedFormats.includes(format);
  }

  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  // Progress tracking
  getProgressInfo(exportId) {
    const exportInfo = this.exportQueue.get(exportId);
    if (!exportInfo) return null;

    return {
      progress: exportInfo.progress,
      status: exportInfo.status,
      estimatedTime: exportInfo.estimatedTime
    };
  }
}

// Initialize and load history
const exportService = new ExportService();
exportService.loadHistory();

export default exportService;
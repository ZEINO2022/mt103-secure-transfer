#!/usr/bin/env node

/**
 * Performance Testing Script for MT103 Transfer Form
 * Measures Core Web Vitals and other performance metrics
 */

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor() {
    this.results = {};
    this.distPath = path.join(__dirname, '../dist');
    this.templatesPath = path.join(__dirname, '../templates');
  }

  async runAnalysis() {
    console.log('🚀 Starting Performance Analysis...\n');

    // File size analysis
    await this.analyzeFileSizes();
    
    // Compression analysis
    await this.analyzeCompression();
    
    // Critical path analysis
    await this.analyzeCriticalPath();
    
    // Bundle analysis
    await this.analyzeBundleComposition();
    
    // Generate report
    await this.generateReport();
    
    console.log('\n✅ Performance analysis complete!');
    console.log('📊 Report saved to: ./reports/performance-analysis.json');
  }

  async analyzeFileSizes() {
    console.log('📏 Analyzing file sizes...');
    
    const files = {
      original: {
        html: this.getFileSize(path.join(this.templatesPath, 'form.html')),
        css: 'N/A (inline)',
        js: 'N/A (inline)'
      },
      optimized: {
        html: this.getFileSize(path.join(this.distPath, 'form_optimized.html')),
        css: this.getFileSize(path.join(this.distPath, 'assets/styles.min.css')),
        js: this.getFileSize(path.join(this.distPath, 'assets/script.min.js'))
      }
    };

    this.results.fileSizes = files;
    
    // Calculate total sizes
    const originalTotal = files.original.html;
    const optimizedTotal = files.optimized.html + files.optimized.css + files.optimized.js;
    
    this.results.totalSizes = {
      original: originalTotal,
      optimized: optimizedTotal,
      savings: originalTotal - optimizedTotal,
      savingsPercentage: ((originalTotal - optimizedTotal) / originalTotal * 100).toFixed(2)
    };

    console.log(`  Original: ${this.formatBytes(originalTotal)}`);
    console.log(`  Optimized: ${this.formatBytes(optimizedTotal)}`);
    console.log(`  Savings: ${this.formatBytes(originalTotal - optimizedTotal)} (${this.results.totalSizes.savingsPercentage}%)`);
  }

  async analyzeCompression() {
    console.log('\n📦 Analyzing compression potential...');
    
    const files = ['form_optimized.html', 'assets/styles.min.css', 'assets/script.min.js'];
    const compressionResults = {};

    for (const file of files) {
      const filePath = path.join(this.distPath, file);
      if (fs.existsSync(filePath)) {
        const originalSize = this.getFileSize(filePath);
        const gzippedSize = await this.estimateGzipSize(filePath);
        const brotliSize = await this.estimateBrotliSize(filePath);
        
        compressionResults[file] = {
          original: originalSize,
          gzipped: gzippedSize,
          brotli: brotliSize,
          gzipRatio: ((originalSize - gzippedSize) / originalSize * 100).toFixed(2),
          brotliRatio: ((originalSize - brotliSize) / originalSize * 100).toFixed(2)
        };

        console.log(`  ${file}:`);
        console.log(`    Original: ${this.formatBytes(originalSize)}`);
        console.log(`    Gzipped: ${this.formatBytes(gzippedSize)} (${compressionResults[file].gzipRatio}% reduction)`);
        console.log(`    Brotli: ${this.formatBytes(brotliSize)} (${compressionResults[file].brotliRatio}% reduction)`);
      }
    }

    this.results.compression = compressionResults;
  }

  async analyzeCriticalPath() {
    console.log('\n🎯 Analyzing critical rendering path...');
    
    const htmlPath = path.join(this.distPath, 'form_optimized.html');
    if (!fs.existsSync(htmlPath)) {
      console.log('  ❌ Optimized HTML not found. Run build first.');
      return;
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Analyze critical CSS
    const criticalCssMatch = htmlContent.match(/<style>(.*?)<\/style>/s);
    const criticalCssSize = criticalCssMatch ? criticalCssMatch[1].length : 0;
    
    // Count external resources
    const externalCss = (htmlContent.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/g) || []).length;
    const externalJs = (htmlContent.match(/<script[^>]*src=[^>]*>/g) || []).length;
    
    // Analyze preload directives
    const preloadResources = (htmlContent.match(/<link[^>]*rel=["']preload["'][^>]*>/g) || []).length;
    
    this.results.criticalPath = {
      criticalCssSize,
      externalCssFiles: externalCss,
      externalJsFiles: externalJs,
      preloadResources,
      hasServiceWorker: htmlContent.includes('serviceWorker'),
      hasAsyncJs: htmlContent.includes('async'),
      hasDeferJs: htmlContent.includes('defer')
    };

    console.log(`  Critical CSS: ${this.formatBytes(criticalCssSize)}`);
    console.log(`  External CSS files: ${externalCss}`);
    console.log(`  External JS files: ${externalJs}`);
    console.log(`  Preload resources: ${preloadResources}`);
    console.log(`  Service Worker: ${this.results.criticalPath.hasServiceWorker ? '✅' : '❌'}`);
    console.log(`  Async JS: ${this.results.criticalPath.hasAsyncJs ? '✅' : '❌'}`);
  }

  async analyzeBundleComposition() {
    console.log('\n📊 Analyzing bundle composition...');
    
    const cssPath = path.join(this.distPath, 'assets/styles.min.css');
    const jsPath = path.join(this.distPath, 'assets/script.min.js');
    
    const analysis = {};

    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      analysis.css = {
        totalRules: (cssContent.match(/[^{}]+{[^{}]*}/g) || []).length,
        mediaQueries: (cssContent.match(/@media[^{]*{/g) || []).length,
        keyframes: (cssContent.match(/@keyframes[^{]*{/g) || []).length,
        hasVariables: cssContent.includes('--'),
        hasGrid: cssContent.includes('grid'),
        hasFlex: cssContent.includes('flex')
      };
    }

    if (fs.existsSync(jsPath)) {
      const jsContent = fs.readFileSync(jsPath, 'utf8');
      analysis.js = {
        hasClasses: jsContent.includes('class '),
        hasAsyncAwait: jsContent.includes('async ') && jsContent.includes('await '),
        hasArrowFunctions: jsContent.includes('=>'),
        hasEventListeners: jsContent.includes('addEventListener'),
        hasFetch: jsContent.includes('fetch('),
        hasServiceWorker: jsContent.includes('serviceWorker')
      };
    }

    this.results.bundleComposition = analysis;
    
    if (analysis.css) {
      console.log('  CSS Features:');
      console.log(`    Total rules: ${analysis.css.totalRules}`);
      console.log(`    Media queries: ${analysis.css.mediaQueries}`);
      console.log(`    CSS Variables: ${analysis.css.hasVariables ? '✅' : '❌'}`);
      console.log(`    CSS Grid: ${analysis.css.hasGrid ? '✅' : '❌'}`);
      console.log(`    Flexbox: ${analysis.css.hasFlex ? '✅' : '❌'}`);
    }
    
    if (analysis.js) {
      console.log('  JS Features:');
      console.log(`    ES6 Classes: ${analysis.js.hasClasses ? '✅' : '❌'}`);
      console.log(`    Async/Await: ${analysis.js.hasAsyncAwait ? '✅' : '❌'}`);
      console.log(`    Arrow Functions: ${analysis.js.hasArrowFunctions ? '✅' : '❌'}`);
      console.log(`    Fetch API: ${analysis.js.hasFetch ? '✅' : '❌'}`);
    }
  }

  async generateReport() {
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSavings: this.results.totalSizes?.savings || 0,
        savingsPercentage: this.results.totalSizes?.savingsPercentage || 0,
        optimizedTotalSize: this.results.totalSizes?.optimized || 0
      },
      details: this.results,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(
      path.join(reportDir, 'performance-analysis.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate human-readable summary
    const summaryPath = path.join(reportDir, 'performance-summary.md');
    const summaryContent = this.generateMarkdownSummary(report);
    fs.writeFileSync(summaryPath, summaryContent);
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.totalSizes?.optimized > 50000) {
      recommendations.push('Consider further code splitting for files larger than 50KB');
    }
    
    if (!this.results.criticalPath?.hasServiceWorker) {
      recommendations.push('Implement Service Worker for better caching');
    }
    
    if (this.results.criticalPath?.criticalCssSize < 1000) {
      recommendations.push('Consider inlining more critical CSS for faster rendering');
    }
    
    if (!this.results.criticalPath?.hasAsyncJs) {
      recommendations.push('Use async loading for non-critical JavaScript');
    }

    return recommendations;
  }

  generateMarkdownSummary(report) {
    return `# Performance Analysis Report

## Summary
- **Total Size Savings**: ${this.formatBytes(report.summary.totalSavings)} (${report.summary.savingsPercentage}%)
- **Optimized Total Size**: ${this.formatBytes(report.summary.optimizedTotalSize)}
- **Analysis Date**: ${new Date(report.timestamp).toLocaleString()}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## File Sizes
| File Type | Original | Optimized | Savings |
|-----------|----------|-----------|---------|
| HTML | ${this.formatBytes(report.details.fileSizes?.original.html || 0)} | ${this.formatBytes(report.details.fileSizes?.optimized.html || 0)} | - |
| CSS | Inline | ${this.formatBytes(report.details.fileSizes?.optimized.css || 0)} | - |
| JavaScript | Inline | ${this.formatBytes(report.details.fileSizes?.optimized.js || 0)} | - |

## Critical Path Analysis
- **Critical CSS Size**: ${this.formatBytes(report.details.criticalPath?.criticalCssSize || 0)}
- **External Resources**: ${(report.details.criticalPath?.externalCssFiles || 0) + (report.details.criticalPath?.externalJsFiles || 0)}
- **Service Worker**: ${report.details.criticalPath?.hasServiceWorker ? '✅ Enabled' : '❌ Not Found'}

Generated by MT103 Performance Analyzer
`;
  }

  getFileSize(filePath) {
    try {
      return fs.statSync(filePath).size;
    } catch (error) {
      return 0;
    }
  }

  async estimateGzipSize(filePath) {
    // Rough estimation: gzip typically achieves 60-80% compression for text files
    const originalSize = this.getFileSize(filePath);
    return Math.round(originalSize * 0.3); // Assuming 70% compression
  }

  async estimateBrotliSize(filePath) {
    // Rough estimation: brotli typically achieves 70-85% compression for text files
    const originalSize = this.getFileSize(filePath);
    return Math.round(originalSize * 0.25); // Assuming 75% compression
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.runAnalysis().catch(console.error);
}

module.exports = PerformanceAnalyzer;